//! Domänen des Kontextpakets.
//!
//! Eine Domäne ist der **oberste** Ordner eines relativen Pfads: Unterordner
//! gehören zur Domäne ihres Root-Ordners (`tauri-app/src/App.tsx` ⇒ `tauri-app`).
//! Dateien ohne Ordner bilden die Domäne `wurzel`.
//!
//! Gegenstück im Core: `packages/core/src/domaene.ts`; der Vertrag steht in
//! `wiki/Kontextpaket.md`.

use crate::scan::DateiInfo;

/// Domäne der Dateien, die direkt in der Scan-Basis liegen.
pub const WURZEL_DOMAENE: &str = "wurzel";

/// Eine Domäne mit ihren Dateien.
pub struct Domaene<'a> {
    pub name: String,
    pub dateiname: String,
    pub dateien: Vec<&'a DateiInfo>,
    pub zeilen: usize,
}

/// Domänenname eines relativen Pfads.
pub fn domaene_von(relativer_pfad: &str) -> &str {
    match relativer_pfad.find('/') {
        Some(trenner) => &relativer_pfad[..trenner],
        None => WURZEL_DOMAENE,
    }
}

/// Dateiname einer Domäne: nur unbedenkliche Zeichen.
pub fn dateiname_fuer(domaene: &str) -> String {
    let bereinigt: String = domaene
        .chars()
        .map(|zeichen| {
            if zeichen.is_ascii_alphanumeric() || matches!(zeichen, '.' | '_' | '-') {
                zeichen
            } else {
                '-'
            }
        })
        .collect();
    if bereinigt.is_empty() {
        WURZEL_DOMAENE.to_string()
    } else {
        bereinigt
    }
}

/// Name der Quellendatei einer Domäne, relativ zum Paketordner.
pub fn quellen_name(domaene: &Domaene<'_>) -> String {
    format!("Quellen/{}.md", domaene.dateiname)
}

/// Ist die Datei eine Dokumentationsdatei (Markdown)?
pub fn ist_dokumentation(datei: &DateiInfo) -> bool {
    datei.sprache == "Markdown"
}

/// Gruppiert Dateien nach Domäne.
///
/// Reihenfolge: Domänen alphabetisch, `wurzel` zuletzt; innerhalb der Domäne
/// bleibt die Scan-Reihenfolge erhalten.
pub fn gruppiere(dateien: &[DateiInfo]) -> Vec<Domaene<'_>> {
    let mut namen: Vec<String> = Vec::new();
    let mut gruppen: Vec<Domaene<'_>> = Vec::new();

    for datei in dateien {
        let name = domaene_von(&datei.relativer_pfad).to_string();
        match namen.iter().position(|vorhanden| *vorhanden == name) {
            Some(index) => {
                gruppen[index].dateien.push(datei);
                gruppen[index].zeilen += datei.zeilen;
            }
            None => {
                namen.push(name.clone());
                gruppen.push(Domaene {
                    dateiname: dateiname_fuer(&name),
                    name,
                    dateien: vec![datei],
                    zeilen: datei.zeilen,
                });
            }
        }
    }

    gruppen.sort_by(|a, b| {
        let a_wurzel = a.name == WURZEL_DOMAENE;
        let b_wurzel = b.name == WURZEL_DOMAENE;
        match (a_wurzel, b_wurzel) {
            (true, false) => std::cmp::Ordering::Greater,
            (false, true) => std::cmp::Ordering::Less,
            _ => a.name.cmp(&b.name),
        }
    });

    gruppen
}
