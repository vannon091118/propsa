//! Persistenz des Live-Modus: SQLite im WAL-Modus unter
//! `~/.propakt/live/<identitaet>.db` – eine Datenbank je Projekt-Identität
//! (gleiche Identitätslogik wie die History in `history.rs`).
//!
//! Vertrag (Schwellwerte, Anomalie-Arten): `packages/core/src/live.ts`;
//! dieser Modul ist die Rust-Umsetzung der Ablage. WAL, weil der Zyklus
//! schreibt, während Oberfläche und Graph lesen – ohne sich zu blockieren.
//!
//! Fail Loud: Ein Fehler beim Öffnen oder Schreiben kehrt als `Err` zurück,
//! es gibt kein still kaputtes Ticken.
//!
//! Umsetzungsplan: `docs/wiki/Live-Modus-Plan.md` (Phase 1).

use crate::history::projekt_identitaet;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

/// Ein Baum-Eintrag der Signatur: Pfad, Größe, Änderungszeit (Millisekunden).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BaumEintrag {
    pub relativer_pfad: String,
    pub groesse: u64,
    pub mtime_ms: i64,
}

/// Ein Change-Journal-Eintrag: eine Datei, eine Art, ein Tick.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEintrag {
    pub pfad: String,
    /// `neu`, `geaendert`, `entfernt` (Katalog: `packages/core/src/live.ts`).
    pub art: String,
    pub zeilen_delta: i64,
}

/// Ergebnis eines Ticks: Metriken und Änderungen gegenüber dem Vortick.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickErgebnis {
    pub identitaet: String,
    pub zeitstempel: String,
    /// Dateien im Baum.
    pub dateien: usize,
    /// Gelesene Zeilen über alle Kandidaten.
    pub zeilen: usize,
    pub neu: usize,
    pub geaendert: usize,
    pub entfernt: usize,
    pub unverändert: usize,
    pub journal: Vec<JournalEintrag>,
    /// true, wenn der Baum gegenüber dem Vortick unverändert war.
    pub ruhig: bool,
    /// true beim allerersten Tick einer Identität: Das Journal trägt den
    /// ganzen Erstbestand als „neu“ — Erstaufnahme, kein Änderungsschwall.
    pub erstaufnahme: bool,
}

/// Ordner der Live-Datenbanken: `~/.propakt/live/`.
pub fn live_ordner() -> PathBuf {
    crate::history::propakt_heim().join("live")
}

/// Datenbank-Pfad einer Identität.
pub fn db_pfad(identitaet: &str) -> PathBuf {
    live_ordner().join(format!("{identitaet}.db"))
}

/// Datenbank öffnen und Schema sicherstellen (idempotent, WAL aktiv).
pub fn oeffne_db(pfad: &Path) -> Result<Connection, String> {
    if let Some(ordner) = pfad.parent() {
        std::fs::create_dir_all(ordner)
            .map_err(|fehler| format!("Live-Ordner nicht anlegbar: {fehler}"))?;
    }
    let verbindung = Connection::open(pfad)
        .map_err(|fehler| format!("Live-DB nicht öffnbar ({pfad:?}): {fehler}"))?;
    verbindung
        .execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS snapshots (
               id INTEGER PRIMARY KEY,
               zeitstempel TEXT NOT NULL,
               dateien INTEGER NOT NULL,
               zeilen INTEGER NOT NULL,
               neu INTEGER NOT NULL,
               geaendert INTEGER NOT NULL,
               entfernt INTEGER NOT NULL,
               unverändert INTEGER NOT NULL,
               signatur TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS journal (
               id INTEGER PRIMARY KEY,
               snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
               pfad TEXT NOT NULL,
               art TEXT NOT NULL CHECK (art IN ('neu','geaendert','entfernt')),
               zeilen_delta INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS bestand (
               pfad TEXT PRIMARY KEY,
               zeilen INTEGER NOT NULL,
               hash TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS anomalien (
               id INTEGER PRIMARY KEY,
               snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
               art TEXT NOT NULL,
               pfad TEXT,
               beschreibung TEXT NOT NULL,
               schwere INTEGER NOT NULL CHECK (schwere BETWEEN 1 AND 3)
             );",
        )
        .map_err(|fehler| format!("Live-Schema nicht anlegbar: {fehler}"))?;
    Ok(verbindung)
}

/// Datenbank einer Projekt-Identität öffnen.
pub fn oeffne_db_fuer_identitaet(basis: &Path) -> Result<(Connection, String), String> {
    let (identitaet, _herkunft) = projekt_identitaet(basis);
    let verbindung = oeffne_db(&db_pfad(&identitaet))?;
    Ok((verbindung, identitaet))
}

/// Signatur als JSON-Text ablegen (Spiegel zur Baum-Signatur im Scan-Cache).
pub fn signatur_als_json(signatur: &[BaumEintrag]) -> String {
    serde_json::to_string(signatur).unwrap_or_else(|_| "[]".to_string())
}

/// Signatur aus JSON-Text lesen; kaputter Text ergibt `None`.
pub fn signatur_aus_json(text: &str) -> Option<Vec<BaumEintrag>> {
    serde_json::from_str(text).ok()
}

/// Letzte gespeicherte Signatur oder `None` bei Erstlauf.
pub fn letzte_signatur(verbindung: &Connection) -> Result<Option<Vec<BaumEintrag>>, String> {
    let text: Option<String> = verbindung
        .query_row(
            "SELECT signatur FROM snapshots ORDER BY id DESC LIMIT 1",
            rusqlite::params![],
            |zeile| zeile.get(0),
        )
        .map(Some)
        .or_else(|fehler| match fehler {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            anderer => Err(anderer.to_string()),
        })?;
    Ok(text.as_deref().and_then(signatur_aus_json))
}

/// Kürzt auf die letzten `max` Snapshots. Kinder sterben zuerst (Anomalien,
/// dann Journal), sonst blockiert der Fremdschlüssel die Säge: Der Leim muss
/// weg, bevor das Brett fällt.
pub fn kuerzen(verbindung: &Connection, max: usize) -> Result<(), String> {
    verbindung
        .execute(
            "DELETE FROM anomalien WHERE snapshot_id NOT IN (
               SELECT id FROM snapshots ORDER BY id DESC LIMIT ?1
             )",
            [max as i64],
        )
        .map_err(|fehler| format!("Anomalie-Kürzung fehlgeschlagen: {fehler}"))?;
    verbindung
        .execute(
            "DELETE FROM journal WHERE snapshot_id IN (
               SELECT id FROM snapshots WHERE id NOT IN (
                 SELECT id FROM snapshots ORDER BY id DESC LIMIT ?1
               )
             )",
            [max as i64],
        )
        .map_err(|fehler| format!("Journal-Kürzung fehlgeschlagen: {fehler}"))?;
    verbindung
        .execute(
            "DELETE FROM snapshots WHERE id NOT IN (
               SELECT id FROM snapshots ORDER BY id DESC LIMIT ?1
             )",
            [max as i64],
        )
        .map_err(|fehler| format!("Snapshot-Kürzung fehlgeschlagen: {fehler}"))?;
    Ok(())
}

/// Schreibt das Tick-Ergebnis samt Journal. Die Kürzung passiert bewusst
/// außerhalb (Aufrufer entscheidet den Zeitpunkt, Anomalien sterben mit).
pub fn snapshot_schreiben(
    verbindung: &Connection,
    ergebnis: &TickErgebnis,
    signatur: &[BaumEintrag],
) -> Result<(), String> {
    verbindung
        .execute(
            "INSERT INTO snapshots
               (zeitstempel, dateien, zeilen, neu, geaendert, entfernt, unverändert, signatur)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                ergebnis.zeitstempel,
                ergebnis.dateien as i64,
                ergebnis.zeilen as i64,
                ergebnis.neu as i64,
                ergebnis.geaendert as i64,
                ergebnis.entfernt as i64,
                ergebnis.unverändert as i64,
                signatur_als_json(signatur),
            ],
        )
        .map_err(|fehler| format!("Snapshot nicht schreibbar: {fehler}"))?;
    let snapshot_id = verbindung.last_insert_rowid();
    for eintrag in &ergebnis.journal {
        verbindung
            .execute(
                "INSERT INTO journal (snapshot_id, pfad, art, zeilen_delta)
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![snapshot_id, eintrag.pfad, eintrag.art, eintrag.zeilen_delta],
            )
            .map_err(|fehler| format!("Journal nicht schreibbar: {fehler}"))?;
    }
    Ok(())
}

/// Maximal gespeicherte rohe Snapshots (Plan: 500; Zeitreihe verdichtet später).
pub const MAX_SNAPSHOTS: usize = 500;

/// Eintrag des Bestands: Zeilen und Inhalts-Hash einer Datei.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BestandEintrag {
    pub zeilen: usize,
    pub hash: String,
}

/// Bestand je Pfad laden (Basis für Zeilen-Delta und Regressions-Erkennung).
pub fn bestand_laden(verbindung: &Connection) -> Result<HashMap<String, BestandEintrag>, String> {
    let mut anweisung = verbindung
        .prepare("SELECT pfad, zeilen, hash FROM bestand")
        .map_err(|fehler| format!("Bestand nicht lesbar: {fehler}"))?;
    let zeilen = anweisung
        .query_map([], |zeile| {
            Ok((
                zeile.get::<_, String>(0)?,
                BestandEintrag {
                    zeilen: zeile.get::<_, i64>(1)? as usize,
                    hash: zeile.get(2)?,
                },
            ))
        })
        .map_err(|fehler| format!("Bestand nicht lesbar: {fehler}"))?;
    let mut abbild = std::collections::HashMap::new();
    for eintrag in zeilen {
        let (pfad, daten) = eintrag.map_err(|fehler| format!("Bestand-Zeile kaputt: {fehler}"))?;
        abbild.insert(pfad, daten);
    }
    Ok(abbild)
}

/// Bestand eines Pfads schreiben oder ersetzen.
pub fn bestand_setzen(
    verbindung: &Connection,
    pfad: &str,
    zeilen: usize,
    hash: &str,
) -> Result<(), String> {
    verbindung
        .execute(
            "INSERT INTO bestand (pfad, zeilen, hash) VALUES (?1, ?2, ?3)
             ON CONFLICT(pfad) DO UPDATE SET zeilen = ?2, hash = ?3",
            rusqlite::params![pfad, zeilen as i64, hash],
        )
        .map_err(|fehler| format!("Bestand nicht schreibbar ({pfad}): {fehler}"))?;
    Ok(())
}

/// Bestand eines Pfads entfernen (Datei ist weg).
pub fn bestand_entfernen(verbindung: &Connection, pfad: &str) -> Result<(), String> {
    verbindung
        .execute("DELETE FROM bestand WHERE pfad = ?1", [pfad])
        .map_err(|fehler| format!("Bestand nicht löschbar ({pfad}): {fehler}"))?;
    Ok(())
}
