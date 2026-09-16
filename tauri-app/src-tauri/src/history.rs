//! Delta- und History-Erkennung im Backend.
//!
//! Die History wohnt lokal im gescannten Projekt: `.propsa/history.json`.
//! Sie wird nach jedem Scan mit Delta ergänzt; der Vergleich läuft gegen den
//! letzten Eintrag derselben Projekt-Identität.
//!
//! Identity-Matching über den **Root-Commit-Hash** (`git rev-list
//! --max-parents=0 HEAD`): stabil über Branches, Pfade und Remote-URLs.
//! Ohne Git fällt die Identität auf den normierten Pfad zurück.
//!
//! Spiegel des CLI-Moduls `src/history.ts`; Feldnamen bleiben snake_case.

use crate::scan::{DateiInfo, ScanErgebnis};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

const PROPSA_ORDNER: &str = ".propsa";
const HISTORY_DATEI: &str = "history.json";
const MAX_EINTRAEGE: usize = 50;

/// Ein History-Eintrag: das Minimum, das ein Delta braucht.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEintrag {
    pub zeitstempel: String,
    pub identitaet: String,
    pub herkunft: String,
    pub dateien: HashMap<String, String>,
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
    let ausgabe = Command::new("git")
        .args(["rev-list", "--max-parents=0", "HEAD"])
        .current_dir(basis)
        .output()
        .ok()
        .filter(|ausgabe| ausgabe.status.success())?;
    let text = String::from_utf8_lossy(&ausgabe.stdout).trim().to_string();
    text.lines().next().filter(|zeile| !zeile.is_empty()).map(String::from)
}

/// Projektdentität: Root-Commit-Hash vorrangig, sonst normierter Pfad.
fn projekt_identitaet(basis: &Path) -> (String, String) {
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

/// Ordner und History-Datei der Scan-Basis.
fn history_pfad(basis: &Path) -> std::path::PathBuf {
    basis.join(PROPSA_ORDNER).join(HISTORY_DATEI)
}

/// Liest die History; fehlendes oder fehlerhaftes File ergibt eine leere Liste.
pub fn history_lesen(basis: &Path) -> Vec<HistoryEintrag> {
    match std::fs::read_to_string(history_pfad(basis)) {
        Ok(text) => serde_json::from_str::<Vec<HistoryEintrag>>(&text).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
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

/// Hängt den Lauf an die History an und kürzt auf MAX_EINTRAEGE.
fn history_ergaenzen(basis: &Path, eintrag: HistoryEintrag) {
    let mut eintraege = history_lesen(basis);
    eintraege.push(eintrag);
    if eintraege.len() > MAX_EINTRAEGE {
        let start = eintraege.len() - MAX_EINTRAEGE;
        eintraege.drain(..start);
    }
    let _ = std::fs::create_dir_all(basis.join(PROPSA_ORDNER));
    if let Ok(text) = serde_json::to_string_pretty(&eintraege) {
        let _ = std::fs::write(history_pfad(basis), text);
    }
}

/// Stellt sicher, dass `.propsa/` in der .gitignore steht (idempotent).
fn gitignore_sichern(basis: &Path) {
    let datei = basis.join(".gitignore");
    let zeile = ".propsa/";
    let inhalt = std::fs::read_to_string(&datei).unwrap_or_default();
    let vorhanden = inhalt
        .lines()
        .any(|z| z.trim() == zeile || z.trim() == ".propsa");
    if vorhanden {
        return;
    }
    let basis_text = if inhalt.is_empty() || inhalt.ends_with('\n') {
        inhalt
    } else {
        format!("{inhalt}\n")
    };
    let _ = std::fs::write(
        &datei,
        format!("{basis_text}\n# PROPSA-History (lokal, nie committen)\n{zeile}\n"),
    );
}

/// Delta ermitteln, Eintrag anfügen, .gitignore sichern.
///
/// Fehler beim Schreiben werden still ignoriert: Das Delta ist ein
/// Komfortmerkmal und darf den Scan nicht scheitern lassen.
pub fn lauf_verarbeiten(basis: &Path, scan: &ScanErgebnis) -> DeltaInfo {
    let (identitaet, herkunft) = projekt_identitaet(basis);
    let eintraege = history_lesen(basis);
    let frueher = letzten_eintrag_finden(&eintraege, &identitaet);
    let delta = frueher.as_ref().map(|frueher| delta_berechnen(scan, frueher));

    history_ergaenzen(
        basis,
        HistoryEintrag {
            zeitstempel: scan.zeitstempel.clone(),
            identitaet: identitaet.clone(),
            herkunft: herkunft.clone(),
            dateien: fingerabdruecke(&scan.dateien),
        },
    );
    gitignore_sichern(basis);

    DeltaInfo {
        erstlauf: frueher.is_none(),
        herkunft,
        identitaet,
        delta,
    }
}
