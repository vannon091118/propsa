//! Anomalie-Erkennung des Live-Modus (Phase 2).
//!
//! Spiegel der Kataloge aus `packages/core/src/live.ts`: Schwere,
//! Beschreibungen und Schwellwerte stehen hier je Zeile als `match`-Arm,
//! damit `npm run pruefen` beide Seiten vergleicht (gleiches Muster wie
//! die Sprachkataloge). Eine Zeile = ein Schlüssel, keine Gruppierung.
//!
//! Der Detektor (`BeobachtungsStand`) wird je Tick mit dem Ergebnis
//! gefüttert und wertet die Tick-Folge aus: Flattern (häufige Änderungen
//! am selben Pfad), Regression (Inhalt a→b→a), Pendeln (Umfang schwankt
//! ohne Fortschritt), Löschsturm (Massenlöschung), Explosion (Zeilenschub)
//! und Differenzen (abwechselnde Änderungen zweier Dateien einer Kohorte).
//! Persistenz und Plan: `docs/wiki/Live-Modus-Plan.md`.

use crate::live_kohorte::differenzen_befund;
use crate::live_store::{JournalEintrag, TickErgebnis};
use rusqlite::Connection;
use std::collections::{HashMap, VecDeque};

// ── Katalog-Spiegel (eine Zeile je Schlüssel, wird von `pruefen` geparst) ──

/// Schwere je Art: 1 beobachten, 2 auffällig, 3 eingreifen.
pub fn schwere_fuer(art: &str) -> u8 {
    match art {
        "flattern" => 2,
        "regression" => 2,
        "pendeln" => 2,
        "loeschsturm" => 3,
        "explosion" => 2,
        "limitbruch" => 3,
        "differenzen" => 3,
        _ => 1,
    }
}

/// Deutsche Beschreibung je Art (Kurzform; Befunde ergänzen Pfad/Zahl).
pub fn beschreibung_fuer(art: &str) -> &'static str {
    match art {
        "flattern" => "Flattern: Datei wird immer wieder geändert – vermutlich zwei Agenten gegeneinander",
        "regression" => "Regression: Inhalt wurde auf einen früheren Stand zurückgerollt",
        "pendeln" => "Pendeln: Umfang schwankt ohne Fortschritt – Schleife ohne Konvergenz",
        "loeschsturm" => "Löschsturm: viele Dateien gleichzeitig entfernt",
        "explosion" => "Explosion: starker Zeilenzuwachs in einem Tick",
        "limitbruch" => "Limitbruch: Guardrail des Scans getroffen",
        "differenzen" => "Differenzen: zusammengehörige Dateien treten auseinander",
        _ => "Unbekannte Anomalie",
    }
}

/// Schwellwert je Schlüssel (Spiegel zu `ANOMALIE_SCHWELLEN`).
pub fn schwellwert(schluessel: &str) -> usize {
    match schluessel {
        "flattern_aenderungen" => 4,
        "flattern_fenster" => 10,
        "loeschsturm_dateien" => 10,
        "loeschsturm_anteil" => 20,
        "explosion_anteil" => 25,
        "pendeln_fenster" => 12,
        "pendeln_amplitude" => 10,
        "pendeln_fortschritt" => 2,
        "differenzen_alternationen" => 6,
        "differenzen_fenster" => 12,
        "live_max_dateien" => 5000,
        "live_max_zeilen" => 400000,
        "beobachtung_fenster" => 24,
        "hash_verlauf" => 24,
        "bremse_ab_dateien" => 2000,
        "bremse_stufen" => 3,
        _ => 0,
    }
}

// ── Befund und Persistenz ──────────────────────────────────────────────────

/// Eine gefundene Anomalie zum Speichern und Melden.
#[derive(Debug, Clone, serde::Serialize)]
pub struct AnomalieBefund {
    /// Art aus dem Katalog (`packages/core/src/live.ts`).
    pub art: String,
    /// Betroffener Pfad oder `None` für baumweit.
    pub pfad: Option<String>,
    /// Deutsche Beschreibung für Badge und DB.
    pub beschreibung: String,
    /// 1 beobachten, 2 auffällig, 3 eingreifen.
    pub schwere: u8,
}

fn befund(art: &str, pfad: Option<&str>, detail: &str) -> AnomalieBefund {
    AnomalieBefund {
        art: art.to_string(),
        pfad: pfad.map(|p| p.to_string()),
        beschreibung: format!("{} ({detail})", beschreibung_fuer(art)),
        schwere: schwere_fuer(art),
    }
}

/// Anomalien zum letzten Snapshot schreiben (in derselben Transaktion wie
/// `snapshot_schreiben` aufrufen).
pub fn anomalien_schreiben(
    verbindung: &Connection,
    befehle: &[AnomalieBefund],
) -> Result<(), String> {
    if befehle.is_empty() {
        return Ok(());
    }
    let snapshot_id: i64 = verbindung
        .query_row(
            "SELECT MAX(id) FROM snapshots",
            rusqlite::params![],
            |zeile| zeile.get(0),
        )
        .map_err(|fehler| format!("Snapshot-ID nicht lesbar: {fehler}"))?;
    for befund_item in befehle {
        verbindung
            .execute(
                "INSERT INTO anomalien (snapshot_id, art, pfad, beschreibung, schwere)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    snapshot_id,
                    befund_item.art,
                    befund_item.pfad,
                    befund_item.beschreibung,
                    befund_item.schwere as i64,
                ],
            )
            .map_err(|fehler| format!("Anomalie nicht schreibbar: {fehler}"))?;
    }
    Ok(())
}

// ── Detektor mit Beobachtungs-Gedächtnis ─────────────────────────────

/// Platzhalter im Hash-Verlauf für „in diesem Tick entfernt" – nie ein
/// echter SHA-256-Wert, deshalb kollisionsfrei.
const ENTFERNT_MARKE: &str = "ENTFERNT";

/// Gedächtnis des Detektors über die Tick-Folge; je Projekt-Identität eine
/// Instanz (der Zyklus hält sie im Thread).
#[derive(Default)]
pub struct BeobachtungsStand {
    tick_nummer: u64,
    /// Hash-Verlauf je Pfad (für Regression a→b→a).
    hash_verlauf: HashMap<String, Vec<String>>,
    /// Tick-Nummern der Änderungen je Pfad (für Flattern).
    aenderungen: HashMap<String, Vec<u64>>,
    /// Metriken der letzten Ticks (für Pendeln).
    metriken: VecDeque<(usize, usize)>,
    /// Journal-Folge über Tick-Grenzen hinweg (für Differenzen-Kohorten).
    journal_verlauf: VecDeque<JournalEintrag>,
}

impl BeobachtungsStand {
    pub fn neu() -> Self {
        Self::default()
    }

    /// Wertet einen Tick aus und liefert die Befunde dieses Ticks.
    ///
    /// `aktueller_bestand` trägt die Hashes nach diesem Tick (aus dem
    /// Tick-Kern); Einträge ohne Hash sind entfernte Dateien.
    pub fn tick_werten(
        &mut self,
        ergebnis: &TickErgebnis,
        aktueller_bestand: &HashMap<String, crate::live_store::BestandEintrag>,
    ) -> Vec<AnomalieBefund> {
        self.tick_nummer += 1;
        let max_verlauf = schwellwert("hash_verlauf");
        let fenster = schwellwert("flattern_fenster") as u64;
        let mut befunde: Vec<AnomalieBefund> = Vec::new();

        for eintrag in &ergebnis.journal {
            let verlauf = self.hash_verlauf.entry(eintrag.pfad.clone()).or_default();
            // Regression: aktueller Hash gleicht dem Vor-vorletzten (a→b→a).
            if verlauf.len() >= 2 && verlauf[verlauf.len() - 1] != ENTFERNT_MARKE {
                if let Some(aktuell) = aktueller_bestand.get(&eintrag.pfad) {
                    // Regression = a→b→a in fortlaufenden Änderungen. Zwei
                    // Fälle sind KEINE Regression:
                    // 1. Der Pfad ist in diesem Tick verschwunden (kein
                    //    Bestand-Eintrag) – Löschen ist keine Rückrolle.
                    // 2. Der vorherige Zustand war die Entfernt-Marke – die
                    //    Datei wurde gerade WIEDER ERSTELLT, jeder Inhalt
                    //    ist ein legitimer Neuanfang (auch der alte a!).
                    if aktuell.hash == verlauf[verlauf.len() - 2] {
                        befunde.push(befund("regression", Some(&eintrag.pfad), &eintrag.pfad));
                    }
                }
            }
            let hash = aktueller_bestand
                .get(&eintrag.pfad)
                .map(|daten| daten.hash.clone())
                .unwrap_or_else(|| ENTFERNT_MARKE.to_string());
            verlauf.push(hash);
            if verlauf.len() > max_verlauf {
                verlauf.remove(0);
            }

            // Flattern: Änderungen (neu/geändert) im Zeitfenster je Pfad.
            if eintrag.art != "entfernt" {
                let ticks = self.aenderungen.entry(eintrag.pfad.clone()).or_default();
                ticks.push(self.tick_nummer);
                ticks.retain(|tick| self.tick_nummer.saturating_sub(*tick) <= fenster);
                if ticks.len() >= schwellwert("flattern_aenderungen") {
                    let detail = format!(
                        "{} Änderungen an {} in {} Ticks",
                        ticks.len(),
                        eintrag.pfad,
                        schwellwert("flattern_fenster")
                    );
                    befunde.push(befund("flattern", Some(&eintrag.pfad), &detail));
                }
            }
        }

        // Löschsturm: absolute Zahl oder Anteil am vorherigen Baum.
        if ergebnis.entfernt > 0 {
            // Vorheriger Baum = diesmal verbliebene plus entfernte Dateien
            // (der Feldwert `dateien` zählt nur den Restbaum nach dem Tick).
            let vorher = ergebnis.dateien + ergebnis.entfernt;
            let anteil = vorher * schwellwert("loeschsturm_anteil") / 100;
            if ergebnis.entfernt >= schwellwert("loeschsturm_dateien")
                || (anteil > 0 && ergebnis.entfernt >= anteil)
            {
                let detail = format!("{} Dateien entfernt", ergebnis.entfernt);
                befunde.push(befund("loeschsturm", None, &detail));
            }
        }

        // Explosion: Zeilenzuwachs dieses Ticks gegen den Bestand davor.
        let delta: i64 = ergebnis
            .journal
            .iter()
            .map(|eintrag| eintrag.zeilen_delta as i64)
            .sum();
        if delta > 0 {
            let delta_usize = delta as usize;
            // Zeilenbestand vor diesem Tick = Gesamtsumme minus eigenes Delta.
            let vorher = ergebnis.zeilen.saturating_sub(delta_usize);
            // Kreuzmultiplikation statt Integer-Division: `vorher * 25 / 100
            // <= delta` löste durch Abdüng schon bei +1 Zeile auf 5 davor
            // (20 %) aus – `delta * 100 >= vorher * anteil` bleibt exakt.
            if vorher > 0 && delta_usize * 100 >= vorher * schwellwert("explosion_anteil") {
                let detail = format!("+{delta} Zeilen in einem Tick");
                befunde.push(befund("explosion", None, &detail));
            }
        }

        // Pendeln: Fenster voll, Amplitude hoch, Netto-Fortschritt flach.
        self.metriken.push_back((ergebnis.dateien, ergebnis.zeilen));
        let pendel_fenster = schwellwert("pendeln_fenster");
        if self.metriken.len() > pendel_fenster {
            self.metriken.pop_front();
        }
        if self.metriken.len() == pendel_fenster {
            let zeilen: Vec<usize> = self.metriken.iter().map(|m| m.1).collect();
            let hoch = *zeilen.iter().max().unwrap_or(&0);
            let tief = *zeilen.iter().min().unwrap_or(&0);
            let netto = (zeilen[zeilen.len() - 1] as i64 - zeilen[0] as i64).unsigned_abs();
            let amplitude = (hoch - tief) * 100;
            if hoch > 0
                && amplitude >= schwellwert("pendeln_amplitude") * hoch
                && netto * 100 <= (schwellwert("pendeln_fortschritt") * hoch) as u64
            {
                let detail = format!("{hoch} ↔ {tief} Zeilen ohne Fortschritt");
                befunde.push(befund("pendeln", None, &detail));
                self.metriken.clear(); // erst wieder sammeln, nicht jede Tickdoppelung
            }
        }

        // Differenzen: abwechselnde Änderungen zweier Dateien einer Kohorte
        // (gleicher Ordner) — zwei Agenten, die sich gegenseitig die Arbeit
        // zertreten. Das Journal läuft im Gedächtnis über mehrere Ticks,
        // damit Wechsel über Tick-Grenzen hinweg zählen; nach dem Befund
        // wird das Fenster geleert (Muster wie bei Pendeln).
        let differenzen_fenster = schwellwert("differenzen_fenster");
        for eintrag in &ergebnis.journal {
            self.journal_verlauf.push_back(eintrag.clone());
        }
        while self.journal_verlauf.len() > differenzen_fenster {
            self.journal_verlauf.pop_front();
        }
        let alternationen = schwellwert("differenzen_alternationen");
        if differenzen_befund(
            self.journal_verlauf.make_contiguous(),
            alternationen,
            differenzen_fenster,
        ) {
            let detail = format!("{alternationen} Wechsel in einer Kohorte");
            befunde.push(befund("differenzen", None, &detail));
            self.journal_verlauf.clear();
        }

        befunde
    }
}
