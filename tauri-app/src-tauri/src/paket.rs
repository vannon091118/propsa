//! Das Kontextpaket: mehrere Dateien in einem Ordner, aufgeteilt nach Domänen.
//!
//! Aufbau (Vertrag: `wiki/Kontextpaket.md`):
//!
//! ```text
//! Zusammenfassung.md      Einstieg für Sprachmodelle
//! Architektur.md          Verzeichnisbaum und Dateiübersicht
//! Dokumentation.md        alle Markdown-Dateien im Volltext
//! Quellen/<Domäne>.md     vollständiger Code je Domäne
//! kontext.json            dieselben Daten maschinenlesbar
//! ```
//!
//! Gegenstück in der CLI: `src/paket.ts`.

use crate::domaene::{gruppiere, quellen_name};
use crate::paketkritik::kritik;
use crate::paketquellen::{dokumentation, quellen};
use crate::pakettexte::{architektur, zusammenfassung};
use crate::scan::ScanErgebnis;
use crate::schema;
use std::fs;
use std::path::PathBuf;

/// Eine Datei des Pakets; `name` darf einen Unterordner enthalten.
pub struct Paketdatei {
    pub name: String,
    pub inhalt: String,
}

/// Baut alle Dateien des Pakets.
pub fn paket_bauen(scan: &ScanErgebnis) -> Result<Vec<Paketdatei>, String> {
    let domaenen = gruppiere(&scan.dateien);
    let json = serde_json::to_string_pretty(&schema::aus_scan(scan)).map_err(|e| e.to_string())?;

    let mut paket = vec![
        Paketdatei {
            name: "Zusammenfassung.md".to_string(),
            inhalt: zusammenfassung(scan, &domaenen),
        },
        Paketdatei {
            name: "Architektur.md".to_string(),
            inhalt: architektur(scan, &domaenen),
        },
        Paketdatei {
            name: "Kritik.md".to_string(),
            inhalt: kritik(scan),
        },
        Paketdatei {
            name: "Dokumentation.md".to_string(),
            inhalt: dokumentation(scan),
        },
        Paketdatei {
            name: "kontext.json".to_string(),
            inhalt: format!("{}\n", json),
        },
    ];

    for domaene in &domaenen {
        paket.push(Paketdatei {
            name: quellen_name(domaene),
            inhalt: quellen(scan, domaene),
        });
    }

    Ok(paket)
}

/// Schreibt das Kontextpaket in einen Ordner und liefert die geschriebenen
/// Dateinamen (relativ zum Ordner).
#[tauri::command]
pub fn paket_schreiben(scan: ScanErgebnis, ordner: String) -> Result<Vec<String>, String> {
    if ordner.trim().is_empty() {
        return Err("Kein Zielordner gewählt".to_string());
    }

    let ziel = PathBuf::from(&ordner);
    let mut geschrieben: Vec<String> = Vec::new();

    for datei in paket_bauen(&scan)? {
        let pfad = ziel.join(&datei.name);
        if let Some(eltern) = pfad.parent() {
            fs::create_dir_all(eltern).map_err(|e| {
                format!("Ordner {} nicht anlegbar: {}", eltern.display(), e)
            })?;
        }
        fs::write(&pfad, datei.inhalt)
            .map_err(|e| format!("Schreiben fehlgeschlagen ({}): {}", pfad.display(), e))?;
        geschrieben.push(datei.name);
    }

    Ok(geschrieben)
}
