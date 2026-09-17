//! Live-Zeitreihe als Leseansicht (Phase 4): Snapshots der Live-Datenbank
//! werden zu Punkten des History-Graphen.
//!
//! Gegenstück: `src/HistoryGraph.tsx` (Zeichnung + Zeitraum-Wahl). Der
//! JSONL-Delta-Verlauf (`history.rs`, `get_metrik_historie`) bleibt
//! unangetastet — beide Serien erscheinen getrennt im selben Graphen.
//!
//! Zeitstempel haben das feste Format `%Y-%m-%d %H:%M:%S`; in diesem Format
//! ist lexikografische Ordnung zugleich chronologische, darum filtert der
//! Zeitraum per Textvergleich. Ein kaputter Zeitstempel fliegt heraus,
//! statt den Graphen zu töten.

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

/// Ein Punkt der Live-Zeitreihe: ein Snapshot in Graphform.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ZeitreihePunkt {
    pub zeitstempel: String,
    pub dateien: usize,
    pub zeilen: usize,
    pub neu: usize,
    pub geaendert: usize,
    pub entfernt: usize,
}

/// Zeilenbreite des Lesens: eine Snapshot-Zeile → ein Punkt.
fn punkt(zeile: &rusqlite::Row) -> rusqlite::Result<ZeitreihePunkt> {
    Ok(ZeitreihePunkt {
        zeitstempel: zeile.get(0)?,
        dateien: zeile.get::<_, i64>(1)? as usize,
        zeilen: zeile.get::<_, i64>(2)? as usize,
        neu: zeile.get::<_, i64>(3)? as usize,
        geaendert: zeile.get::<_, i64>(4)? as usize,
        entfernt: zeile.get::<_, i64>(5)? as usize,
    })
}

/// Live-Zeitreihe einer Datenbank: Snapshots aufsteigend, ältester zuerst.
///
/// `stunden` begrenzt den Zeitraum bis zurück (`None` = gesamter Verlauf);
/// Punkte mit nicht parsebarem Zeitstempel zählen nur im Gesamtverlauf und
/// fliegen im gefilterten Modus heraus (Vergleich gegen die Zeitraum-Grenze).
pub fn zeitreihe_lesen(
    verbindung: &Connection,
    stunden: Option<f64>,
) -> Result<Vec<ZeitreihePunkt>, String> {
    let mut anweisung = verbindung
        .prepare(
            "SELECT zeitstempel, dateien, zeilen, neu, geaendert, entfernt
             FROM snapshots ORDER BY id ASC",
        )
        .map_err(|fehler| format!("Zeitreihe nicht lesbar: {fehler}"))?;
    let gelesen = anweisung
        .query_map([], punkt)
        .map_err(|fehler| format!("Zeitreihe nicht lesbar: {fehler}"))?
        .filter_map(|zeile| zeile.ok())
        .collect::<Vec<ZeitreihePunkt>>();

    let Some(stunden) = stunden else {
        return Ok(gelesen);
    };
    let grenze = chrono::Local::now() - chrono::Duration::milliseconds((stunden * 3_600_000.0) as i64);
    let grenze_text = grenze.format("%Y-%m-%d %H:%M:%S").to_string();
    Ok(gelesen
        .into_iter()
        .filter(|punkt| punkt.zeitstempel >= grenze_text)
        .collect())
}
