//! Delta- und History-Erkennung im Backend.
//!
//! Die History wohnt zentral im Benutzerverzeichnis:
//! `~/.propsa/history/<identitaet>.jsonl` – je Projekt-Identität eine Datei
//! (pro Zeile ein History-Eintrag, JSONL). Sie wird nach jedem Scan mit
//! Delta ergänzt; der Vergleich läuft gegen den letzten Eintrag derselben
//! Identität. Im gescannten Projekt bleibt nichts zurück.
//!
//! Identity-Matching über den **Root-Commit-Hash** (`git rev-list
//! --max-parents=0 HEAD`): stabil über Branches, Pfade und Remote-URLs.
//! Ohne Git fällt die Identität auf den normierten Pfad zurück.
//!
//! Spiegel des CLI-Moduls `src/history.ts`; Feldnamen bleiben snake_case.

use crate::prozesse;
use crate::scan::{DateiInfo, ScanErgebnis};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;

const MAX_EINTRAEGE: usize = 50;

/// Ein History-Eintrag: das Minimum, das ein Delta braucht.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEintrag {
    pub zeitstempel: String,
    pub identitaet: String,
    pub herkunft: String,
    pub dateien: HashMap<String, String>,
    pub metriken: Option<ProjektMetriken>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjektMetriken {
    pub anzahl_dateien: usize,
    pub gesamt_zeilen: usize,
}

/// Unterschied zweier Läufe, je Datei genau eine Kategorie.
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Delta {
    pub neu: Vec<String>,
    pub geaendert: Vec<String>,
    pub entfernt: Vec<String>,
    pub unveraendert: Vec<String>,
}

/// Delta-Block des Scan-Ergebnisses; `None` heißt „nicht angefordert“.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeltaInfo {
    pub erstlauf: bool,
    pub herkunft: String,
    pub identitaet: String,
    pub delta: Option<Delta>,
}

/// SHA-256 eines Inhalts als Hex-String (Spiegel zu `inhaltsHash` in der CLI).
fn inhalts_hash(inhalt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(inhalt.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Pfad → Inhalts-Hash für alle gescannten Dateien.
fn fingerabdruecke(dateien: &[DateiInfo]) -> HashMap<String, String> {
    dateien
        .iter()
        .map(|datei| (datei.relativer_pfad.clone(), inhalts_hash(&datei.inhalt)))
        .collect()
}

/// Root-Commit-Hash oder `None` ohne Git-Repository/Commit.
fn root_commit_hash(basis: &Path) -> Option<String> {
    // Fensternlos: Dieser Aufruf läuft bei jedem Live-Tick – ohne das
    // Flag `CREATE_NO_WINDOW` blitzte hier unter Windows bei jedem Tick
    // ein Terminal in den Vordergrund (siehe `prozesse.rs`).
    let ausgabe = prozesse::output(Command::new("git")
        .args(["rev-list", "--max-parents=0", "HEAD"])
        .current_dir(basis))
        .ok()
        .filter(|ausgabe| ausgabe.status.success())?;
    let text = String::from_utf8_lossy(&ausgabe.stdout).trim().to_string();
    text.lines().next().filter(|zeile| !zeile.is_empty()).map(String::from)
}

/// Projektidentität: Root-Commit-Hash vorrangig, sonst normierter Pfad.
pub fn projekt_identitaet(basis: &Path) -> (String, String) {
    if let Some(hash) = root_commit_hash(basis) {
        return (hash, "root-commit".to_string());
    }
    let normiert = basis
        .to_string_lossy()
        .to_lowercase()
        .replace('\\', "/");
    let mut hasher = Sha256::new();
    hasher.update(normiert.as_bytes());
    (format!("{:x}", hasher.finalize()), "pfad".to_string())
}

/// Zentrale Ablage im Benutzerverzeichnis: `~/.propsa` (Spiegel zu
/// `PROPSA_HEIM` in `src/history.ts`).
pub fn propsa_heim() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".propsa")
}

/// History-Datei der Identität unter `~/.propsa/history/`.
fn history_pfad(identitaet: &str) -> PathBuf {
    propsa_heim().join("history").join(format!("{identitaet}.jsonl"))
}

/// Liest die History; fehlendes oder fehlerhaftes File ergibt eine leere Liste.
pub fn history_lesen(identitaet: &str) -> Vec<HistoryEintrag> {
    match std::fs::read_to_string(history_pfad(identitaet)) {
        Ok(text) => text
            .lines()
            .filter(|zeile| !zeile.trim().is_empty())
            .filter_map(|zeile| serde_json::from_str(zeile).ok())
            .collect(),
        Err(_) => Vec::new(),
    }
}

/// Liefert die Metrik-Historie eines Projekts als Zeitreihe.
pub fn get_metrik_historie(identitaet: &str) -> Vec<(String, ProjektMetriken)> {
    history_lesen(identitaet)
        .into_iter()
        .filter_map(|e| {
            e.metriken.map(|m| (e.zeitstempel, m))
        })
        .collect()
}

/// Letzter Eintrag derselben Identität oder `None` bei Erstlauf.
fn letzten_eintrag_finden(eintraege: &[HistoryEintrag], identitaet: &str) -> Option<HistoryEintrag> {
    eintraege
        .iter()
        .rev()
        .find(|eintrag| eintrag.identitaet == identitaet)
        .cloned()
}

/// Vergleicht den aktuellen Lauf mit einem früheren Fingerabdruck.
fn delta_berechnen(aktuell: &ScanErgebnis, frueher: &HistoryEintrag) -> Delta {
    let vorher = &frueher.dateien;
    let jetzige = fingerabdruecke(&aktuell.dateien);
    let mut delta = Delta::default();

    for (pfad, hash) in &jetzige {
        match vorher.get(pfad) {
            None => delta.neu.push(pfad.clone()),
            Some(alter) if alter != hash => delta.geaendert.push(pfad.clone()),
            Some(_) => delta.unveraendert.push(pfad.clone()),
        }
    }
    for pfad in vorher.keys() {
        if !jetzige.contains_key(pfad) {
            delta.entfernt.push(pfad.clone());
        }
    }
    delta
}

/// Hängt den Lauf an die History der Identität an und kürzt auf MAX_EINTRAEGE.
fn history_ergaenzen(identitaet: &str, eintrag: HistoryEintrag) {
    let _ = std::fs::create_dir_all(propsa_heim().join("history"));
    let mut eintraege = history_lesen(identitaet);
    eintraege.push(eintrag);
    if eintraege.len() > MAX_EINTRAEGE {
        let start = eintraege.len() - MAX_EINTRAEGE;
        eintraege.drain(..start);
    }
    let text: String = eintraege
        .iter()
        .filter_map(|eintrag| serde_json::to_string(eintrag).ok())
        .collect::<Vec<_>>()
        .join("\n");
    let _ = std::fs::write(history_pfad(identitaet), format!("{text}\n"));
}

/// Delta ermitteln, Eintrag anfügen. Fehler beim Schreiben werden still
/// ignoriert: Das Delta ist ein Komfortmerkmal und darf den Scan nicht
/// scheitern lassen.
pub fn lauf_verarbeiten(basis: &Path, scan: &ScanErgebnis) -> DeltaInfo {
    let (identitaet, herkunft) = projekt_identitaet(basis);
    let eintraege = history_lesen(&identitaet);
    let frueher = letzten_eintrag_finden(&eintraege, &identitaet);
    let delta = frueher.as_ref().map(|frueher| delta_berechnen(scan, frueher));

    history_ergaenzen(
        &identitaet,
        HistoryEintrag {
            zeitstempel: scan.zeitstempel.clone(),
            identitaet: identitaet.clone(),
            herkunft: herkunft.clone(),
            dateien: fingerabdruecke(&scan.dateien),
            metriken: Some(ProjektMetriken {
                anzahl_dateien: scan.dateien.len(),
                gesamt_zeilen: scan.gesamt_zeilen,
            }),
        },
    );

    DeltaInfo {
        erstlauf: frueher.is_none(),
        herkunft,
        identitaet,
        delta,
    }
}
