//! Gemeinsame Bausteine aller Pakettexte: Kopfzeilen, Hinweise, Verteilung und
//! der Verzeichnisbaum.
//!
//! Gegenstück in der CLI: `src/paketBasis.ts`. Zahlen stehen ohne
//! Tausendertrenner, damit beide Oberflächen dieselbe Datei erzeugen.

use crate::scan::{DateiInfo, ScanErgebnis};
use std::collections::HashMap;

/// Kopfzeilen, die in jeder Datei des Pakets stehen.
pub fn kopf(titel: &str, scan: &ScanErgebnis, zeilen: &[String]) -> String {
    let mut text = format!("# PROPSA – {}\n\n", titel);
    text.push_str(&format!("**Projekt:** {}\n", scan.titel));
    text.push_str(&format!("**Erzeugt:** {}\n", scan.zeitstempel));
    text.push_str(&zeilen.join("\n"));
    text.push('\n');
    text
}

/// Hinweise zur Vollständigkeit.
///
/// Mit Fail Loud ist ein Scan entweder vollständig oder es gibt kein Paket.
/// Gemeldet werden nur noch Dateien, die das Dateisystem nicht hergab.
pub fn hinweise(scan: &ScanErgebnis) -> Vec<String> {
    let mut zeilen: Vec<String> = Vec::new();
    if scan.uebersprungen > 0 {
        zeilen.push(format!(
            "- {} Datei(en) nicht lesbar oder binär und deshalb übersprungen.",
            scan.uebersprungen
        ));
    }
    zeilen
}

/// Hinweisblock als eigener Abschnitt (leer, wenn alles vollständig ist).
pub fn hinweisblock(scan: &ScanErgebnis) -> String {
    let zeilen = hinweise(scan);
    if zeilen.is_empty() {
        String::new()
    } else {
        format!("\n{}\n", zeilen.join("\n"))
    }
}

/// Zeilen je Sprache, absteigend.
pub fn sprachverteilung(dateien: &[&DateiInfo]) -> Vec<(String, usize)> {
    let mut pro_sprache: HashMap<&str, usize> = HashMap::new();
    for datei in dateien {
        *pro_sprache.entry(datei.sprache.as_str()).or_insert(0) += datei.zeilen;
    }
    let mut liste: Vec<(String, usize)> = pro_sprache
        .into_iter()
        .map(|(sprache, zeilen)| (sprache.to_string(), zeilen))
        .collect();
    liste.sort_by(|a, b| b.1.cmp(&a.1));
    liste
}

/// Anteil als ganze Prozentzahl.
pub fn prozent(teil: usize, gesamt: usize) -> String {
    let basis = if gesamt > 0 { gesamt } else { 1 };
    let anteil = ((teil as f64 / basis as f64) * 100.0).round() as usize;
    format!("{} %", anteil)
}

/// Verzeichnisbaum aus den (sortierten) Pfaden.
pub fn baum(dateien: &[&DateiInfo]) -> Vec<String> {
    let mut zeilen: Vec<String> = Vec::new();
    let mut letzte_ordner: Vec<&str> = Vec::new();

    for datei in dateien {
        let teile: Vec<&str> = datei.relativer_pfad.split('/').collect();
        let ordner: Vec<&str> = teile[..teile.len() - 1].to_vec();

        let mut gemeinsam = 0;
        while gemeinsam < ordner.len() && letzte_ordner.get(gemeinsam) == Some(&ordner[gemeinsam]) {
            gemeinsam += 1;
        }
        for tiefe in gemeinsam..ordner.len() {
            zeilen.push(format!("{}- {}/", "  ".repeat(tiefe), ordner[tiefe]));
        }
        let name = teile[teile.len() - 1];
        zeilen.push(format!("{}- {}", "  ".repeat(ordner.len()), name));
        letzte_ordner = ordner;
    }

    zeilen
}
