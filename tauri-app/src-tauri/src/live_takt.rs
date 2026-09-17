//! Taktgeber-Loop des Live-Modus: ticken, Ereignisse senden, Tray-Alarm.
//!
//! Die Schleife läuft **niemals überlappend**: ticken, dann gestückelt
//! warten (200-ms-Schritte für zügiges `live_stop`). Schwere Befunde
//! holen das Overlay einmalig nach vorn und setzen den Tray-Alarm; der
//! erste ruhige Tick danach beruhigt wieder.
//!
//! Tick-Kern: `live_zyklus.rs`, Persistenz: `live_store.rs`, Kommandos:
//! `live_kommandos.rs`. Umsetzungsplan: `docs/wiki/Live-Modus-Plan.md`.

use super::live_kommandos::{EREIGNIS_ANOMALIE, EREIGNIS_TICK};
use crate::filterignore::{ausschluesse_mergen, propsaignore_muster};
use crate::live_anomalie::{anomalien_schreiben, BeobachtungsStand};
use crate::live_store::{
    bestand_entfernen, bestand_laden, bestand_setzen, kuerzen, oeffne_db_fuer_identitaet,
    snapshot_schreiben, letzte_signatur, MAX_SNAPSHOTS,
};
use crate::live_zyklus::tick_berechnen;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Die Schleife des Taktgebers: ticken, gestückelt warten, bis `stopp`.
/// `letzte_dateien` veröffentlicht die Baum-Größe des letzten Ticks an
/// `live_status` (effektives Intervall inklusive Bremse, Phase 5).
pub fn zyklus_schleife(
    app: AppHandle,
    pfad: PathBuf,
    intervall_sekunden: u64,
    stopp: Arc<AtomicBool>,
    ticks: Arc<AtomicU64>,
    aenderungs_ticks: Arc<AtomicU64>,
    letzte_dateien: Arc<AtomicU64>,
) {
    let verbindung = match oeffne_db_fuer_identitaet(&pfad) {
        Ok((verbindung, _)) => verbindung,
        Err(fehler) => {
            eprintln!("Live-Modus beendet: {fehler}");
            return;
        }
    };
    let mut beobachtung = BeobachtungsStand::neu();
    // Alarm-Zustand für den Tray-Tooltipp: bleibt bis zum nächsten
    // ruhigen Tick, dann beruhigen.
    let mut alarm_aktiv = false;
    // Intervall-Bremse (Phase 5): Größe des letzten Tick-Baums steuert
    // die effektive Pause — große Bäume ticken seltener.
    let mut letzte_baum_groesse = 0usize;

    while !stopp.load(Ordering::SeqCst) {
        let beginn = Instant::now();
        match tick_ausfuehren(&pfad, &verbindung, &mut beobachtung) {
            Ok(ausgang) => {
                ticks.fetch_add(1, Ordering::SeqCst);
                // Bremse speist sich aus dem letzten Tick-Baum (Dateien)
                // und ist über `live_status` als effektives Intervall sichtbar.
                letzte_dateien.store(ausgang.ergebnis.dateien as u64, Ordering::SeqCst);
                letzte_baum_groesse = ausgang.ergebnis.dateien;
                if !ausgang.ergebnis.ruhig {
                    aenderungs_ticks.fetch_add(1, Ordering::SeqCst);
                    // Schwere Befunde: eigenes Ereignis, einmaliger
                    // Vordergrund-Hub des Widgets und Tray-Alarm (Phase 3).
                    let schwer = ausgang.befunde.iter().any(|befund| befund.schwere >= 3);
                    if schwer {
                        let _ = app.emit(EREIGNIS_ANOMALIE, &ausgang.befunde);
                        let text = ausgang
                            .befunde
                            .iter()
                            .find(|befund| befund.schwere >= 3)
                            .map(|befund| befund.beschreibung.clone())
                            .unwrap_or_default();
                        crate::tray::alarm_melden(&app, &text);
                        crate::tray::forward_to_overlay(&app);
                        alarm_aktiv = true;
                    }
                    // Fehlende Empfänger sind kein Fehler (Tray-Betrieb).
                    let _ = app.emit(EREIGNIS_TICK, &ausgang.ergebnis);
                } else {
                    // Herzschlag auch bei ruhigem Tick (Plan §4): sonst
                    // sieht das Widget die Beruhigung der Ampel nie.
                    let _ = app.emit(EREIGNIS_TICK, &ausgang.ergebnis);
                    if alarm_aktiv {
                        // Erster ruhiger Tick nach einem Alarm: beruhigen.
                        crate::tray::beruhigen(&app);
                        alarm_aktiv = false;
                    }
                }
            }
            Err(fehler) => {
                eprintln!("Live-Tick fehlgeschlagen: {fehler}");
                // Fail Loud, aber sichtbar: Ein Guardrail-Bruch (`limitbruch`)
                // wird als Schwere-3-Befund gemeldet — Ereignis + Tray-Alarm,
                // **ohne Persistenz** (der Tick schreibt nichts, Plan §4).
                if fehler.starts_with("Limitbruch") {
                    let befund = crate::live_anomalie::AnomalieBefund {
                        art: "limitbruch".into(),
                        pfad: None,
                        beschreibung: fehler.clone(),
                        schwere: 3,
        
                    };
                    let _ = app.emit(EREIGNIS_ANOMALIE, vec![befund]);
                    crate::tray::alarm_melden(&app, &fehler);
                }
            }
        }
        let effektiv =
            crate::live_bremse::effektives_intervall(intervall_sekunden, letzte_baum_groesse);
        let pause = Duration::from_secs(effektiv).saturating_sub(beginn.elapsed());
        let schritt = Duration::from_millis(200);
        let mut gewartet = Duration::ZERO;
        while gewartet < pause && !stopp.load(Ordering::SeqCst) {
            std::thread::sleep(schritt);
            gewartet += schritt;
        }
    }
}

/// Ausgang eines Ticks: Bericht plus Anomalie-Befunde.
struct TickAusgang {
    ergebnis: crate::live_store::TickErgebnis,
    befunde: Vec<crate::live_anomalie::AnomalieBefund>,
}

/// Führt einen Tick gegen die offene Datenbank aus: Signatur und Bestand
/// holen, vergleichen, bei Änderung Snapshot + Bestand + Anomalien schreiben.
fn tick_ausfuehren(
    pfad: &std::path::Path,
    verbindung: &rusqlite::Connection,
    beobachtung: &mut BeobachtungsStand,
) -> Result<TickAusgang, String> {
    let vorherige = letzte_signatur(verbindung)?;
    let vorheriger_bestand = bestand_laden(verbindung)?;
    let propsaignore = propsaignore_muster(pfad);
    let excludes = ausschluesse_mergen(&[], &propsaignore);
    let antwort = tick_berechnen(
        pfad,
        &[],
        &excludes,
        vorherige.as_deref(),
        &vorheriger_bestand,
    )?;

    if antwort.ergebnis.ruhig {
        return Ok(TickAusgang {
            ergebnis: antwort.ergebnis,
            befunde: Vec::new(),
        });
    }

    // Alles-oder-nichts: Bestands-Spiegelung, Snapshot und Kürzung in einer
    // Transaktion – ein Absturz zwischen den Schritten darf keine halben
    // Ticks hinterlassen (Fail Loud, Never Truncate Silent).
    let transaktion = verbindung
        .unchecked_transaction()
        .map_err(|fehler| format!("Live-Transaktion nicht startbar: {fehler}"))?;

    // Befunde erst nach dem Spiegel-Schritt werten: Der Detektor sieht den
    // Bestand nach diesem Tick (Regression vergleicht Hashes).
    let befunde = beobachtung.tick_werten(&antwort.ergebnis, &antwort.bestand);

    // Bestand in die DB spiegeln: hier rollt die Änderung, Entferntes fliegt.
    for eintrag in &antwort.ergebnis.journal {
        match eintrag.art.as_str() {
            "entfernt" => bestand_entfernen(&transaktion, &eintrag.pfad)?,
            "neu" | "geaendert" => {
                if let Some(daten) = antwort.bestand.get(&eintrag.pfad) {
                    bestand_setzen(&transaktion, &eintrag.pfad, daten.zeilen, &daten.hash)?;
                }
            }
            _ => {}
        }
    }
    snapshot_schreiben(&transaktion, &antwort.ergebnis, &antwort.signatur)?;
    anomalien_schreiben(&transaktion, &befunde)?;
    kuerzen(&transaktion, MAX_SNAPSHOTS)?;
    transaktion
        .commit()
        .map_err(|fehler| format!("Live-Transaktion nicht commitbar: {fehler}"))?;
    Ok(TickAusgang {
        ergebnis: antwort.ergebnis,
        befunde,
    })
}
