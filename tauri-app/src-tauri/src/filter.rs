//! Auswahl der zu scannenden Dateien: Ignorier-Katalog, Musterabgleich und
//! das Sammeln der Kandidaten (Phase 1 des Scans).
//!
//! Standard ist bewusst „alles außer Abhängigkeiten, Caches und
//! Build-Artefakten“. Die TypeScript-Wahrheit steht im Core
//! (`packages/core/src/filters.ts`); das Frontend bezieht die Vorbelegung
//! von dort, dieser Spiegel wird per `npm run pruefen` verglichen.
//! `.propsaignore`-Logik liegt in `filterignore.rs`.

use glob::Pattern;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Verzeichnisse, die nie betreten werden – als zweite Sicherung neben den
/// Mustern des Nutzers, damit ein geleertes Feld keine Abhängigkeiten scannt.
const IGNORIERTE_VERZEICHNISSE: &[&str] = &[
    // Abhängigkeiten
    "node_modules", "bower_components", "vendor", ".venv", "venv",
    // Versionsverwaltung
    ".git", ".svn", ".hg",
    // Build-Artefakte
    "dist", "build", "out", "target", "coverage", ".next", ".nuxt", ".output",
    ".svelte-kit", ".angular", ".turbo", ".parcel-cache",
    // Caches (u. a. Python)
    ".cache", "__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache", ".tox",
    ".npm", ".pnpm-store", ".yarn", ".gradle", ".m2",
    // Editor-Metadaten
    ".idea", ".vscode",
    // PROPSA-History (gehört nie in ein Paket)
    ".propsa",
    // Wegwerf-Verzeichnisse (Artefakte, kein Quelltext)
    ".tmp",
];

/// Einzelne Dateien, die zusätzlich ausgeschlossen werden – Spiegel von
/// `AUSGESCHLOSSENE_DATEIEN` in `packages/core/src/filters.ts`.
const AUSGESCHLOSSENE_DATEIEN: &[&str] = &[
    ".DS_Store", "Thumbs.db", "*.log", "*.min.js", "*.min.css", "*.pyc", "*.bak",
    "context.md", "context.json", "kontext.md", "kontext.json",
    "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "Cargo.lock",
];

/// Ein Scan-Kandidat: Pfad und Name, noch ohne Inhalt.
#[derive(Clone)]
pub struct Kandidat {
    pub absoluter_pfad: PathBuf,
    pub relativer_pfad: String,
}

fn ist_ignoriertes_verzeichnis(name: &str) -> bool {
    let klein = name.to_lowercase();
    IGNORIERTE_VERZEICHNISSE.iter().any(|katalog| *katalog == klein.as_str())
}

/// Muster-Optionen wie `minimatch` in der CLI: `*` überspannt keine
/// Verzeichnistrenner (`**` weiterhin schon), Punktdateien werden
/// eingeschlossen.
const MUSTER_OPTIONEN: glob::MatchOptions = glob::MatchOptions {
    case_sensitive: true,
    require_literal_separator: true,
    require_literal_leading_dot: false,
};

/// Prüft ein Glob-Muster gegen relativen Pfad und Dateinamen.
pub fn passt_muster(muster: &str, pfad: &str, datei_name: &str) -> bool {
    match Pattern::new(&muster.replace('\\', "/")) {
        Ok(pattern) => {
            pattern.matches_with(&pfad.replace('\\', "/"), MUSTER_OPTIONEN)
                || pattern.matches_with(datei_name, MUSTER_OPTIONEN)
        }
        // Ungültige Muster werden ignoriert statt die Anwendung zu beenden.
        Err(_) => false,
    }
}

/// Excludes greifen vor Includes; leere Include-Liste bedeutet „alles“.
///
/// Negationen (`!muster`) aus `.propsaignore` werden hier ausgewertet: Ein
/// getroffener `!…`-Eintrag rettet eine Datei, selbst wenn ein anderes
/// Exclude-Muster sie traf. Reihenfolge in `exclude`: eingebaute Muster,
/// dann positive `.propsaignore`-Muster, dann `!…`-Negationen.
fn ist_ausgeschlossen(datei: &str, pfad: &str, include: &[String], exclude: &[String]) -> bool {
    let mut getroffen = false;
    for m in exclude {
        if m.is_empty() {
            continue;
        }
        if let Some(negation) = m.strip_prefix('!') {
            if passt_muster(negation.trim(), pfad, datei) {
                getroffen = false;
            }
        } else if passt_muster(m, pfad, datei) {
            getroffen = true;
        }
    }
    if !getroffen && AUSGESCHLOSSENE_DATEIEN.iter().any(|m| passt_muster(m, pfad, datei)) {
        getroffen = true;
    }
    getroffen || (!include.is_empty() && !include.iter().any(|m| !m.is_empty() && passt_muster(m, pfad, datei)))
}

/// Prüft, ob einer der Elternordner bis zur Scan-Basis ignoriert wird.
/// `freigegebene` enthält per `!verzeichnis/` freigegebene Katalog-Namen.
fn ist_in_ignoriertem_verzeichnis(
    pfad: &Path,
    basis: &Path,
    freigegebene: &std::collections::HashSet<String>,
) -> bool {
    let mut ordner = pfad.parent();
    while let Some(aktuell) = ordner {
        if aktuell == basis {
            break;
        }
        if let Some(name) = aktuell.file_name() {
            let klein = name.to_string_lossy().to_lowercase();
            if !freigegebene.contains(&klein)
                && ist_ignoriertes_verzeichnis(&klein)
            {
                return true;
            }
        }
        ordner = aktuell.parent();
    }
    false
}

/// Phase 1: alle Kandidaten sammeln und deterministisch sortieren
/// (Limits treffen danach eine feste Reihenfolge, nie die des Dateisystems).
pub fn kandidaten_sammeln(
    basis: &Path,
    include_muster: &[String],
    exclude_muster: &[String],
) -> Vec<Kandidat> {
    // `!verzeichnis/`-Negationen heben den Katalog für diese Namen auf
    // (Spiegel zu `negierteVerzeichnisse` in `src/propsaignore.ts`).
    let freigegebene =
        crate::filterignore::freigegebene_verzeichnisse(exclude_muster);

    let lauf = WalkDir::new(basis)
        .follow_links(false)
        .into_iter()
        .filter_entry(|eintrag| {
            !(eintrag.file_type().is_dir()
                && ist_ignoriertes_verzeichnis(&eintrag.file_name().to_string_lossy()))
        });

    let mut kandidaten: Vec<Kandidat> = Vec::new();

    for eintrag in lauf.filter_map(|e| e.ok()) {
        let pfad = eintrag.path();
        if !pfad.is_file()
            || ist_in_ignoriertem_verzeichnis(pfad, basis, &freigegebene)
        {
            continue;
        }

        let name = pfad.file_name().unwrap_or_default().to_string_lossy().to_string();
        let relativer_pfad = pfad
            .strip_prefix(basis)
            .unwrap_or(pfad)
            .to_string_lossy()
            .replace('\\', "/");

        if ist_ausgeschlossen(&name, &relativer_pfad, include_muster, exclude_muster) {
            continue;
        }

        kandidaten.push(Kandidat {
            absoluter_pfad: pfad.to_path_buf(),
            relativer_pfad,
        });
    }

    kandidaten.sort_by(|a, b| {
        let a_versteckt = a.relativer_pfad.starts_with('.');
        let b_versteckt = b.relativer_pfad.starts_with('.');
        match a_versteckt.cmp(&b_versteckt) {
            std::cmp::Ordering::Equal => a.relativer_pfad.cmp(&b.relativer_pfad),
            andere => andere,
        }
    });

    kandidaten
}

/// Liest eine Datei. Nicht lesbare oder binäre Dateien werden übersprungen.
pub fn datei_lesen(absoluter_pfad: &Path) -> Option<String> {
    let mut inhalt = String::new();
    let gelesen = fs::File::open(absoluter_pfad)
        .and_then(|mut datei| datei.read_to_string(&mut inhalt))
        .is_ok();
    if gelesen && !inhalt.is_empty() {
        Some(inhalt)
    } else {
        None
    }
}
