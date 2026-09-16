//! Gemeinsames Export-Schema (Version 2) des JSON-Exports.
//!
//! Vertrag: `wiki/Export-Schema.md`. Gegenstück im Core:
//! `packages/core/src/schema.ts`.
//! Beide Seiten müssen zusammen geändert werden; Feldnamen und Reihenfolge
//! sind dort beschrieben. Bewusst ohne `absoluter_pfad`: der Export wandert in
//! geteilte Kontexte und darf keine lokalen Pfade verraten.
//!
//! Gegenüber Version 1 entfallen `kompakt_ausgelassen` und `abbruch_grund`:
//! Limits brechen jetzt **vor** der Verarbeitung ab (Fail Loud), es gibt kein
//! Teilergebnis mehr, das einen Abbruchgrund erklären müsste.

use crate::scan::ScanErgebnis;
use serde::Serialize;

/// Version des Schemas: bei jeder inkompatiblen Änderung erhöhen.
pub const SCHEMA_VERSION: u32 = 2;

/// Eine Datei im Export.
#[derive(Debug, Serialize)]
pub struct SchemaDatei<'a> {
    pub relativer_pfad: &'a str,
    pub sprache: &'a str,
    pub zeilen: usize,
    pub zeichen: usize,
    pub inhalt: &'a str,
}

/// Vollständiger Exportinhalt.
#[derive(Debug, Serialize)]
pub struct SchemaKontext<'a> {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub titel: &'a str,
    pub zeitstempel: &'a str,
    pub gesamt_dateien: usize,
    pub gesamt_zeilen: usize,
    pub gesamt_zeichen: usize,
    pub uebersprungen: usize,
    pub dateien: Vec<SchemaDatei<'a>>,
}

/// Baut das Export-Objekt aus einem Scan-Ergebnis; die Reihenfolge der Dateien
/// bleibt erhalten.
pub fn aus_scan(scan: &ScanErgebnis) -> SchemaKontext<'_> {
    SchemaKontext {
        schema_version: SCHEMA_VERSION,
        titel: &scan.titel,
        zeitstempel: &scan.zeitstempel,
        gesamt_dateien: scan.dateien.len(),
        gesamt_zeilen: scan.gesamt_zeilen,
        gesamt_zeichen: scan.gesamt_zeichen,
        uebersprungen: scan.uebersprungen,
        dateien: scan
            .dateien
            .iter()
            .map(|datei| SchemaDatei {
                relativer_pfad: &datei.relativer_pfad,
                sprache: &datei.sprache,
                zeilen: datei.zeilen,
                zeichen: datei.zeichen,
                inhalt: &datei.inhalt,
            })
            .collect(),
    }
}
