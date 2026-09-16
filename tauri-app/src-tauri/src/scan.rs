//! Verarbeitung der Scan-Kandidaten: Inhalte lesen, Guardrails anwenden,
//! Sprachen erkennen und den Fortschritt an die Oberfläche melden.
//!
//! Phase 1 (Auswahl und Sortierung der Kandidaten) liegt in `filter.rs`.
//! Weil dort sortiert wird, treffen die Limits hier eine feste Reihenfolge –
//! gleicher Ordner, gleiche Optionen ⇒ gleiche Auswahl.
//!
//! Fail Loud, Never Truncate Silent: Ein Limit ist ein Schutzschalter vor der
//! Verarbeitung, keine Schleuse. Wird ein Limit erreicht, bricht der Scan mit
//! einer Fehlermeldung ab (`Err`) – es entsteht kein unvollständiges Ergebnis.

use crate::filter::{datei_lesen, kandidaten_sammeln, Kandidat};
use crate::filterignore::{ausschluesse_mergen, propsaignore_muster};
use crate::fortschritt::{ScanFortschritt, INTERVALL};
use crate::history::{lauf_verarbeiten, DeltaInfo};
use crate::sprache::sprache_fuer_endung;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::Instant;
use tauri::AppHandle;

/// Eine gescannte Datei samt Inhalt und Metadaten.
///
/// Bewusst ohne absoluten Pfad: der Export wandert in geteilte Kontexte.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DateiInfo {
    pub relativer_pfad: String,
    pub zeilen: usize,
    pub zeichen: usize,
    pub inhalt: String,
    pub sprache: String,
}

/// Optionen eines Scans.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanOptionen {
    pub max_dateien: Option<usize>,
    pub max_zeilen: Option<usize>,
}

/// Ergebnis eines Scans.
#[derive(Debug, Serialize, Deserialize)]
pub struct ScanErgebnis {
    pub titel: String,
    pub zeitstempel: String,
    pub identitaet: String,
    pub dateien: Vec<DateiInfo>,
    pub gesamt_zeilen: usize,
    pub gesamt_zeichen: usize,
    /// Dateien, die nicht gelesen werden konnten (binär, gesperrt, Rechte).
    pub uebersprungen: usize,
    /// Nur gesetzt, wenn der Scan mit Delta-Anfrage lief.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta_info: Option<DeltaInfo>,
}

/// Liest einen Kandidaten und erkennt Sprache und Zeilenzahl.
fn kandidat_verarbeiten(kandidat: &Kandidat) -> Option<DateiInfo> {
    let inhalt = datei_lesen(&kandidat.absoluter_pfad)?;

    let zeilen = inhalt.lines().count();
    let endung = kandidat
        .absoluter_pfad
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    Some(DateiInfo {
        relativer_pfad: kandidat.relativer_pfad.clone(),
        zeilen,
        zeichen: inhalt.len(),
        inhalt,
        sprache: sprache_fuer_endung(&endung).to_string(),
    })
}

/// Scannt ein Projektverzeichnis und liefert die Kontext-Dateien zurück.
///
/// Guardrails sind Hard Blocks: Wird `max_dateien` oder `max_zeilen`
/// erreicht, kehrt das Kommando mit `Err` zurück. Die Oberfläche zeigt dann
/// eine Fehlermeldung – niemals ein beschnittenes Ergebnis.
#[tauri::command]
pub fn scan(
    app: AppHandle,
    pfad: String,
    delta: bool,
    max_dateien: Option<usize>,
    max_zeilen: Option<usize>,
    include_muster: Vec<String>,
    exclude_muster: Vec<String>,
) -> Result<ScanErgebnis, String> {
    let basis = Path::new(&pfad);
    if !basis.exists() {
        return Err(format!("Pfad nicht gefunden: {}", pfad));
    }
    if !basis.is_dir() {
        return Err(format!("Kein Verzeichnis: {}", pfad));
    }

    let optionen = ScanOptionen {
        max_dateien,
        max_zeilen,
    };

    // Projektspezifische Ausschlüsse: eingebaute Muster + `-e` +
    // `.propsaignore` (positiv und `!…`-Negation, Spiegel zu
    // `src/propsaignore.ts`).
    let propsaignore = propsaignore_muster(basis);
    let mut alle_excludes = ausschluesse_mergen(&exclude_muster, &propsaignore);
    alle_excludes.extend(exclude_muster.iter().cloned());

    let kandidaten = kandidaten_sammeln(basis, &include_muster, &alle_excludes);
    let gesamt = kandidaten.len();

    let mut dateien: Vec<DateiInfo> = Vec::new();
    let mut gesamt_zeilen = 0usize;
    let mut gesamt_zeichen = 0usize;
    let mut uebersprungen = 0usize;
    let mut letzter_bericht = Instant::now();

    for (index, kandidat) in kandidaten.iter().enumerate() {
        if index == 0 || letzter_bericht.elapsed() >= INTERVALL {
            ScanFortschritt {
                gelesen: index,
                gesamt,
                aktueller_pfad: kandidat.relativer_pfad.clone(),
                uebersprungen,
                zeilen: gesamt_zeilen,
            }
            .melden(&app);
            letzter_bericht = Instant::now();
        }

        // Guardrail „maximale Dateien“ wird vor dem Lesen geprüft.
        if let Some(max) = optionen.max_dateien {
            if dateien.len() >= max {
                return Err(format!(
                    "Limit von {} Dateien erreicht – Abbruch vor \"{}\". \
                     Es wird kein unvollständiges Ergebnis angezeigt. \
                     Grenze erhöhen oder Limit entfernen (leer = kein Limit).",
                    max, kandidat.relativer_pfad
                ));
            }
        }

        match kandidat_verarbeiten(kandidat) {
            Some(datei) => {
                // Guardrail „maximale Gesamtzeilen“ nach dem Lesen.
                if let Some(max) = optionen.max_zeilen {
                    if gesamt_zeilen + datei.zeilen > max {
                        return Err(format!(
                            "Limit von {} Zeilen erreicht – Abbruch vor \"{}\" ({} Zeilen). \
                             Es wird kein unvollständiges Ergebnis angezeigt. \
                             Grenze erhöhen oder Limit entfernen (leer = kein Limit).",
                            max, kandidat.relativer_pfad, datei.zeilen
                        ));
                    }
                }
                gesamt_zeilen += datei.zeilen;
                gesamt_zeichen += datei.zeichen;
                dateien.push(datei);
            }
            None => uebersprungen += 1,
        }
    }

    // Abschlussmeldung, damit die Anzeige die 100 % erreicht.
    ScanFortschritt {
        gelesen: gesamt,
        gesamt,
        aktueller_pfad: String::new(),
        uebersprungen,
        zeilen: gesamt_zeilen,
    }
    .melden(&app);

    let mut ergebnis = ScanErgebnis {
        titel: basis.display().to_string(),
        zeitstempel: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        identitaet: String::new(),
        dateien,
        gesamt_zeilen,
        gesamt_zeichen,
        uebersprungen,
        delta_info: None,
    };

    // Identität ermitteln (für History-Tracking)
    let (identitaet, _) = crate::history::projekt_identitaet(basis);
    ergebnis.identitaet = identitaet;

    // Delta/History nur auf ausdrückliche Anfrage; Fehler werden in
    // `lauf_verarbeiten` still ignoriert, damit der Scan nicht scheitert.
    if delta {
        ergebnis.delta_info = Some(lauf_verarbeiten(basis, &ergebnis));
    }

    Ok(ergebnis)
}
