//! `.propaktignore`: projektspezifische Ausschlüsse im Projekt-Root.
//!
//! Die Datei ist versionierbar und ergänzt die eingebauten Ausschlüsse.
//! Semantik (Spiegel zu `src/propaktignore.ts`):
//!
//! - eine Zeile = ein Glob-Muster, `#`-Kommentare und Leerzeilen erlaubt,
//! - `!muster` negiert: ein eingebautes Muster mit demselben Pfad-Präfix
//!   wird entfernt (`!vendor/` hebt `vendor/**` auf), ein Katalog-Verzeichnis
//!   desselben Namens wird wieder betreten,
//! - die Negationen wandern ans Ende der Exclude-Liste, damit
//!   `ist_ausgeschlossen` sie zuletzt auswertet.

use std::path::Path;

/// Liest `.propaktignore` (Spiegel zu `propaktignoreLesen` in der CLI);
/// Kommentar- und Leerzeilen fallen weg.
///
/// Fehlt die neue Datei, wird auf den Altnamen `.propsaignore` zurückgefallen,
/// damit bestehende Projektausschlüsse durch die Umbenennung nicht
/// wirkungslos werden. Liegen beide vor, gewinnt der neue Name.
pub fn propaktignore_muster(basis: &Path) -> Vec<String> {
    for datei in [".propaktignore", ".propsaignore"] {
        if let Ok(inhalt) = std::fs::read_to_string(basis.join(datei)) {
            return inhalt
                .lines()
                .map(|zeile| zeile.trim().to_string())
                .filter(|zeile| !zeile.is_empty() && !zeile.starts_with('#'))
                .collect();
        }
    }
    Vec::new()
}

/// Normalisiert ein Muster auf seinen Pfad-Präfix (`vendor/**` → `vendor`).
fn praefix(muster: &str) -> String {
    muster
        .trim_end_matches("/**")
        .trim_end_matches('/')
        .to_string()
}

/// Merged eingebaute Muster mit `.propaktignore` (Spiegel zu
/// `ausschluesseMergen` in der CLI).
pub fn ausschluesse_mergen(eingebaute: &[String], propaktignore: &[String]) -> Vec<String> {
    let negationen: Vec<&String> = propaktignore.iter().filter(|m| m.starts_with('!')).collect();
    let positive: Vec<&String> = propaktignore.iter().filter(|m| !m.starts_with('!')).collect();

    if negationen.is_empty() {
        let mut alle = eingebaute.to_vec();
        alle.extend(positive.iter().map(|m| (*m).clone()));
        return alle;
    }

    let negierte: std::collections::HashSet<String> = negationen
        .iter()
        .map(|m| praefix(m[1..].trim()))
        .collect();

    let mut alle: Vec<String> = eingebaute
        .iter()
        .filter(|m| !negierte.contains(&praefix(m)))
        .cloned()
        .collect();
    alle.extend(positive.iter().map(|m| (*m).clone()));
    alle.extend(negationen.iter().map(|m| (*m).clone()));
    alle
}

/// Verzeichnis-Freigaben: Aus `!muster`-Negationen die Namen derjenigen
/// Katalog-Verzeichnisse extrahieren, die wieder betreten werden dürfen
/// (`!vendor/`, `!vendor`, `!vendor/**` ⇒ `vendor`).
pub fn freigegebene_verzeichnisse(excludes: &[String]) -> std::collections::HashSet<String> {
    excludes
        .iter()
        .filter(|m| m.starts_with('!'))
        .filter_map(|m| {
            let pfad = praefix(m[1..].trim()).to_lowercase();
            if !pfad.is_empty() && !pfad.contains('/') && !pfad.contains('*') {
                Some(pfad)
            } else {
                None
            }
        })
        .collect()
}
