//! Scan-Zwischenspeicher (Rust-Spiegel): Baum-Signatur aus dem Dateisystem,
//! Cache-Dateien unter `~/.propsa/cache/` und die Treffer-Entscheidung.
//!
//! Der Vertrag (Signatur, Treffer-Entscheidung, Fail Loud) ist Spiegel zu
//! `@propsa/core` (`zwischenspeicher.ts`), die Dateisystem-Arbeit Spiegel zu
//! `src/zwischenspeicher.ts` (CLI). Beide Seiten werden zusammen geändert:
//! `zwischenspeicher.ts` ↔ `zwischenspeicher.rs`.
//!
//! Der Schlüssel ist die Scan-Konfiguration (Pfad, Muster, Limits) – nicht
//! der Projektinhalt; der Inhalt steckt in der Signatur. Ein zweifelhafter
//! Eintrag wird nie als „unverändert“ verkauft (Fail Loud, Never Truncate
//! Silent): Jeder Zweifel kehrt `None` zurück, dann wird neu gelesen.

use crate::filter::Kandidat;
use crate::scan::ScanErgebnis;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

/// Version des Cache-Formats; eine Erhöhung erzwingt das Neu-Schreiben
/// (Spiegel zu `ZWISCHENSPEICHER_VERSION`).
pub const ZWISCHENSPEICHER_VERSION: u64 = 1;

/// Kennzeichnet gültige Cache-Dateien im JSON (Spiegel zu
/// `ZWISCHENSPEICHER_SCHEMA`).
pub const ZWISCHENSPEICHER_SCHEMA: &str = "propsa-zwischenspeicher";

/// Eine Datei des Baums, wie der Scanner sie **vor** dem Lesen kennt
/// (Spiegel zu `BaumEintrag`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BaumEintrag {
    pub relativer_pfad: String,
    /// Größe in Bytes.
    pub groesse: u64,
    /// Änderungszeit in Millisekunden (Epoch).
    pub mtime: i64,
}

/// Gespeicherter Lauf: Signatur plus Ergebnis (Spiegel zu `CacheEintrag`).
#[derive(Debug, Serialize, Deserialize)]
pub struct CacheEintrag {
    pub schema: String,
    pub version: u64,
    /// Zeitstempel des gespeicherten Laufs (ISO).
    pub zeitstempel: String,
    pub signatur: Vec<BaumEintrag>,
    pub ergebnis: ScanErgebnis,
}

/// Zentrale Ablage des Zwischenspeichers: `~/.propsa/cache` (Spiegel zu
/// `CACHE_ORDNER` in `src/zwischenspeicher.ts`).
pub fn cache_ordner() -> PathBuf {
    crate::history::propsa_heim().join("cache")
}

/// Cache-Datei einer Konfiguration: `<ordner>/<sha256(schluessel)>.json`
/// (Spiegel zu `cachePfad`).
pub fn cache_pfad(ordner: &Path, schluessel: &str) -> PathBuf {
    let mut hasher = Sha256::new();
    hasher.update(schluessel.as_bytes());
    ordner.join(format!("{:x}.json", hasher.finalize()))
}

/// Stabiler Schlüssel aus der Scan-Konfiguration (Pfad, Muster, Limits) –
/// Spiegel zu `konfigurationsSchluessel`, mit denselben Feldnamen wie die
/// CLI (`maxFiles`/`maxLines`), damit beide Seiten gleich denken.
pub fn konfigurations_schluessel(
    basis_pfad: &Path,
    excludes: &[String],
    includes: &[String],
    max_dateien: Option<usize>,
    max_zeilen: Option<usize>,
) -> String {
    serde_json::json!({
        "basisPfad": normierter_pfad(basis_pfad),
        "excludes": excludes,
        "includes": includes,
        "maxFiles": max_dateien,
        "maxLines": max_zeilen,
    })
    .to_string()
}

/// Absoluter, normierter Pfad (Spiegel zu `path.resolve`): Symlinks
/// aufgelöst, Windows-Präfix `\\?\` und Trenner vereinheitlicht.
fn normierter_pfad(pfad: &Path) -> String {
    let kanonisch = pfad.canonicalize().unwrap_or_else(|_| pfad.to_path_buf());
    kanonisch
        .to_string_lossy()
        .trim_start_matches(r"\\?\")
        .replace('\\', "/")
}

/// Baum-Signatur je Kandidat: Pfad, Größe, Änderungszeit (Spiegel zu
/// `baumEintraege`). Wirft bei nicht mehr lesbarer Metadaten-Datei – der
/// Aufrufer behandelt das als Cache-Vorbeiflug, nie als „unverändert“.
pub fn baum_eintraege(kandidaten: &[Kandidat]) -> std::io::Result<Vec<BaumEintrag>> {
    let mut eintraege = Vec::with_capacity(kandidaten.len());
    for kandidat in kandidaten {
        let metadaten = fs::metadata(&kandidat.absoluter_pfad)?;
        eintraege.push(BaumEintrag {
            relativer_pfad: kandidat.relativer_pfad.clone(),
            groesse: metadaten.len(),
            mtime: aenderung_millis(&metadaten),
        });
    }
    Ok(eintraege)
}

/// Änderungszeit in Millisekunden; Zeitstempel vor der Epoche zählen als 0.
fn aenderung_millis(metadaten: &fs::Metadata) -> i64 {
    metadaten
        .modified()
        .ok()
        .and_then(|zeit| zeit.duration_since(UNIX_EPOCH).ok())
        .map(|dauer| dauer.as_millis() as i64)
        .unwrap_or(0)
}

/// Baum-Signatur normalisieren: nach Pfad sortiert (Spiegel zu
/// `baumSignatur`).
pub fn baum_signatur(mut eintraege: Vec<BaumEintrag>) -> Vec<BaumEintrag> {
    eintraege.sort_by(|links, rechts| links.relativer_pfad.cmp(&rechts.relativer_pfad));
    eintraege
}

/// Zwei Signaturen deckungsgleich? Reihenfolge spielt keine Rolle (Spiegel
/// zu `gleicheSignatur`).
pub fn gleiche_signatur(links: &[BaumEintrag], rechts: &[BaumEintrag]) -> bool {
    links.len() == rechts.len()
        && baum_signatur(links.to_vec()) == baum_signatur(rechts.to_vec())
}

/// Cache-Datei lesen; fehlendes oder kaputtes File ergibt `None` (Spiegel
/// zu `ladeCache`).
pub fn cache_laden(ordner: &Path, schluessel: &str) -> Option<CacheEintrag> {
    let text = fs::read_to_string(cache_pfad(ordner, schluessel)).ok()?;
    serde_json::from_str(&text).ok()
}

/// Cache-Treffer prüfen: Kennung, Version, Integrität und deckungsgleiche
/// Signatur. Jeder Zweifel kehrt `None` zurück – ein zweifelhafter Eintrag
/// wird nie als „unverändert“ verkauft (Spiegel zu `cacheTreffer`).
pub fn cache_treffer(
    geladen: Option<CacheEintrag>,
    aktuell: &[BaumEintrag],
) -> Option<ScanErgebnis> {
    let eintrag = geladen?;
    if eintrag.schema != ZWISCHENSPEICHER_SCHEMA {
        return None;
    }
    if eintrag.version != ZWISCHENSPEICHER_VERSION {
        return None;
    }
    // Integrität: gelesene + übersprungene Dateien müssen die signierte
    // Menge ergeben – sonst stimmt der gespeicherte Lauf nicht zur Signatur.
    if eintrag.ergebnis.dateien.len() + eintrag.ergebnis.uebersprungen != aktuell.len() {
        return None;
    }
    if !gleiche_signatur(&eintrag.signatur, aktuell) {
        return None;
    }
    Some(eintrag.ergebnis)
}

/// Ergebnis samt Signatur unter dem Konfigurations-Schlüssel ablegen
/// (Spiegel zu `speichereCache`). Ein fehlgeschlagener Schreibversuch wird
/// zurückgegeben, nicht verschwiegen; der Scan selbst ist trotzdem gelungen.
pub fn cache_speichern(
    ordner: &Path,
    schluessel: &str,
    signatur: Vec<BaumEintrag>,
    ergebnis: &ScanErgebnis,
) -> std::io::Result<()> {
    let eintrag = CacheEintrag {
        schema: ZWISCHENSPEICHER_SCHEMA.to_string(),
        version: ZWISCHENSPEICHER_VERSION,
        // Zeitpunkt des Speicherns; der Lauf-Zeitstempel gehört zur Ausgabe,
        // nicht zum Cache – ein Treffer erhält in `scan.rs` einen frischen.
        zeitstempel: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        signatur: baum_signatur(signatur),
        ergebnis: ergebnis.clone(),
    };
    let pfad = cache_pfad(ordner, schluessel);
    if let Some(eltern) = pfad.parent() {
        fs::create_dir_all(eltern)?;
    }
    let text = serde_json::to_string(&eintrag)
        .map_err(|fehler| std::io::Error::new(std::io::ErrorKind::InvalidData, fehler))?;
    fs::write(pfad, format!("{text}\n"))
}
