//! Tick-Kern des Live-Modus: Scan → Abgleich, ohne Tauri und ohne Datenbank.
//!
//! Ein Tick sammelt die Kandidaten (derselbe Filterkatalog wie der Scan),
//! bildet die Baum-Signatur (Metadaten, kein Inhaltslesen), vergleicht sie
//! mit dem Vortick und liefert Journal und Bestand. Ein ruhiger Tick
//! (identische Signatur) liest keine Inhalte und erzeugt kein Journal.
//!
//! Die Persistenz spiegelt `live_store.rs`, die Taktgeber-Shell
//! `live_kommandos.rs`. Umsetzungsplan: `docs/wiki/Live-Modus-Plan.md`.

use crate::filter::{datei_lesen, kandidaten_sammeln};
use crate::history::projekt_identitaet;
use crate::live_anomalie::schwellwert;
use crate::live_store::{BaumEintrag, BestandEintrag, JournalEintrag, TickErgebnis};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::path::Path;

/// Zeilen je Inhalt wie `str::lines()` (Spiegel zum Scanner).
fn zeilen_zaehlen(inhalt: &str) -> usize {
    inhalt.lines().count()
}

/// Inhalts-Hash wie in `history.rs` (`inhalts_hash`).
fn inhalts_hash(inhalt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(inhalt.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Guardrail (Anomalie `limitbruch`): Baum größer als die Schutzgrenze
/// aus dem Katalog (`live_max_dateien` / `live_max_zeilen`). Der Aufrufer
/// behandelt `Err` als Fail Loud: nichts schreiben, nichts lesen, melden.
pub fn limit_pruefen(dateien: usize, zeilen: usize) -> Result<(), String> {
    let max_dateien = schwellwert("live_max_dateien");
    let max_zeilen = schwellwert("live_max_zeilen");
    if dateien > max_dateien {
        return Err(format!(
            "Limitbruch: {dateien} Dateien über der Schutzgrenze von {max_dateien}"
        ));
    }
    if zeilen > max_zeilen {
        return Err(format!(
            "Limitbruch: {zeilen} Zeilen über der Schutzgrenze von {max_zeilen}"
        ));
    }
    Ok(())
}

/// Baum-Signatur je Kandidat: relativer Pfad, Größe, Änderungszeit (ms).
///
/// Wirft bei nicht mehr lesbarer Metadaten-Datei – der Aufrufer behandelt
/// das als vorbeifliegenden Tick, nie als „unverändert“.
fn baum_eintraege(
    kandidaten: &[crate::filter::Kandidat],
) -> std::io::Result<Vec<BaumEintrag>> {
    let mut eintraege = Vec::with_capacity(kandidaten.len());
    for kandidat in kandidaten {
        let status = std::fs::metadata(kandidat.absoluter_pfad.as_path())?;
        eintraege.push(BaumEintrag {
            relativer_pfad: kandidat.relativer_pfad.clone(),
            groesse: status.len(),
            mtime_ms: status
                .modified()?
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as i64)
                .unwrap_or(0),
        });
    }
    Ok(eintraege)
}

/// Zwei Signaturen deckungsgleich? (Spiegel zu `gleicheSignatur` im Core.)
fn gleiche_signatur(a: &[BaumEintrag], b: &[BaumEintrag]) -> bool {
    a.len() == b.len()
        && a.iter()
            .zip(b.iter())
            .all(|(links, rechts)| links == rechts)
}

/// Ergebnis eines Tick-Kerns: Bericht, neue Signatur, neuer Bestand.
pub struct TickAntwort {
    pub ergebnis: TickErgebnis,
    pub signatur: Vec<BaumEintrag>,
    pub bestand: HashMap<String, BestandEintrag>,
}

/// Ein Tick ohne Datenbank und ohne Tauri: Kandidaten, Signatur, Vergleich.
///
/// `vorherige_signatur` und `vorheriger_bestand` beschreiben den Vortick;
/// die Antwort trägt den Baumzustand nach diesem Tick. Signaturen sind
/// kanonisch sortiert, denn `kandidaten_sammeln` liefert feste Reihenfolge.
pub fn tick_berechnen(
    basis: &Path,
    include_muster: &[String],
    exclude_muster: &[String],
    vorherige_signatur: Option<&[BaumEintrag]>,
    vorheriger_bestand: &HashMap<String, BestandEintrag>,
) -> Result<TickAntwort, String> {
    let (identitaet, _) = projekt_identitaet(basis);
    let kandidaten = kandidaten_sammeln(basis, include_muster, exclude_muster);
    let aktuelle_signatur = baum_eintraege(&kandidaten)
        .map_err(|fehler| format!("Baum-Signatur nicht lesbar: {fehler}"))?;

    // Guardrail vor allem anderen: Zu großer Baum ⇒ nichts lesen, nichts
    // schreiben (der Aufrufer meldet `limitbruch` und tickt weiter).
    limit_pruefen(aktuelle_signatur.len(), 0)?;

    // Ruhiger Tick: identische Signatur ⇒ keine Inhalte lesen, nichts melden.
    if let Some(vorher) = vorherige_signatur {
        if gleiche_signatur(vorher, &aktuelle_signatur) {
            return Ok(TickAntwort {
                ergebnis: TickErgebnis {
                    identitaet,
                    zeitstempel: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                    dateien: aktuelle_signatur.len(),
                    zeilen: vorheriger_bestand.values().map(|e| e.zeilen).sum(),
                    neu: 0,
                    geaendert: 0,
                    entfernt: 0,
                    unverändert: aktuelle_signatur.len(),
                    journal: Vec::new(),
                    ruhig: true,
                },
                signatur: aktuelle_signatur,
                bestand: vorheriger_bestand.clone(),
            });
        }
    }

    let vorherige_nach_pfad: HashMap<&str, &BaumEintrag> = vorherige_signatur
        .map(|signatur| {
            signatur
                .iter()
                .map(|eintrag| (eintrag.relativer_pfad.as_str(), eintrag))
                .collect()
        })
        .unwrap_or_default();

    let mut journal: Vec<JournalEintrag> = Vec::new();
    let mut bestand = vorheriger_bestand.clone();
    let mut zeilen_gesamt = 0usize;

    for (eintrag, kandidat) in aktuelle_signatur.iter().zip(kandidaten.iter()) {
        let frueher_meta = vorherige_nach_pfad.get(eintrag.relativer_pfad.as_str()).copied();
        let meta_geaendert = match frueher_meta {
            None => true,
            Some(frueher) => {
                frueher.groesse != eintrag.groesse || frueher.mtime_ms != eintrag.mtime_ms
            }
        };
        if !meta_geaendert {
            if let Some(frueher) = bestand.get(&eintrag.relativer_pfad) {
                zeilen_gesamt += frueher.zeilen;
                continue;
            }
        }

        match datei_lesen(&kandidat.absoluter_pfad) {
            Some(inhalt) => {
                let zeilen = zeilen_zaehlen(&inhalt);
                let hash = inhalts_hash(&inhalt);
                match bestand.get(&eintrag.relativer_pfad) {
                    None => journal.push(JournalEintrag {
                        pfad: eintrag.relativer_pfad.clone(),
                        art: "neu".to_string(),
                        zeilen_delta: zeilen as i64,
                    }),
                    Some(frueher) if frueher.hash != hash => journal.push(JournalEintrag {
                        pfad: eintrag.relativer_pfad.clone(),
                        art: "geaendert".to_string(),
                        zeilen_delta: zeilen as i64 - frueher.zeilen as i64,
                    }),
                    _ => {}
                }
                bestand.insert(
                    eintrag.relativer_pfad.clone(),
                    BestandEintrag { zeilen, hash },
                );
                zeilen_gesamt += zeilen;
            }
            None => {
                if bestand.contains_key(&eintrag.relativer_pfad) {
                    journal.push(JournalEintrag {
                        pfad: eintrag.relativer_pfad.clone(),
                        art: "entfernt".to_string(),
                        zeilen_delta: bestand
                            .get(&eintrag.relativer_pfad)
                            .map_or(0, |frueher| -(frueher.zeilen as i64)),
                    });
                }
                bestand.remove(&eintrag.relativer_pfad);
            }
        }
    }

    // Zeilen gesamt: diesmal gelesene plus ungelesene Bestandszeilen.
    let alle_kandidaten: HashSet<&str> = kandidaten
        .iter()
        .map(|kandidat| kandidat.relativer_pfad.as_str())
        .collect();

    // Pfade, die es vorher gab und jetzt nicht mehr in der Kandidatenmenge
    // stehen: entfernt — und zwingend aus dem Bestand raus, sonst bleiben
    // Zombies mit ihren Zeilen hängen.
    for pfad in vorherige_nach_pfad.keys() {
        if !alle_kandidaten.contains(*pfad)
            && bestand.remove(*pfad).is_some()
            && !journal.iter().any(|eintrag| &eintrag.pfad == *pfad)
        {
            journal.push(JournalEintrag {
                pfad: (*pfad).to_string(),
                art: "entfernt".to_string(),
                zeilen_delta: vorheriger_bestand
                    .get(*pfad)
                    .map_or(0, |frueher| -(frueher.zeilen as i64)),
            });
        }
    }
    for (pfad, eintrag) in &bestand {
        if !alle_kandidaten.contains(pfad.as_str()) {
            zeilen_gesamt += eintrag.zeilen;
        }
    }

    let neu = journal.iter().filter(|e| e.art == "neu").count();
    let geaendert = journal.iter().filter(|e| e.art == "geaendert").count();
    let entfernt = journal.iter().filter(|e| e.art == "entfernt").count();

    // Zeilen-Guardrail erst jetzt prüfbar: erst nach dem Lesen steht die
    // Gesamtsumme. Fail Loud wie oben – der Tick bleibt komplett unwirksam.
    limit_pruefen(aktuelle_signatur.len(), zeilen_gesamt)?;

    Ok(TickAntwort {
        ergebnis: TickErgebnis {
            identitaet,
            zeitstempel: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            dateien: aktuelle_signatur.len(),
            zeilen: zeilen_gesamt,
            neu,
            geaendert,
            entfernt,
            unverändert: aktuelle_signatur.len() - neu - geaendert,
            journal,
            ruhig: false,
        },
        signatur: aktuelle_signatur,
        bestand,
    })
}
