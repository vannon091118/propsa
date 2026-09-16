//! Die zwei Übersichtstexte des Pakets: Zusammenfassung und Architektur.
//!
//! Gegenstück in der CLI: `src/paketTexte.ts`.

use crate::domaene::{Domaene, quellen_name};
use crate::paketbasis::{baum, hinweisblock, kopf, prozent, sprachverteilung};
use crate::scan::{DateiInfo, ScanErgebnis};
use crate::schema::SCHEMA_VERSION;

/// Einstiegstext: Kennzahlen, Domänen, Sprachen, Hotspots.
pub fn zusammenfassung(scan: &ScanErgebnis, domaenen: &[Domaene<'_>]) -> String {
    let dateien: Vec<&DateiInfo> = scan.dateien.iter().collect();
    let zeilen: usize = dateien.iter().map(|datei| datei.zeilen).sum();
    let zeichen: usize = dateien.iter().map(|datei| datei.zeichen).sum();

    let mut text = kopf(
        "Zusammenfassung",
        scan,
        &[
            format!(
                "**Umfang:** {} Dateien · {} Zeilen · {} Zeichen",
                dateien.len(),
                zeilen,
                zeichen
            ),
            format!("**Domänen:** {}", domaenen.len()),
        ],
    );
    text.push_str(&hinweisblock(scan));

    text.push_str("\n## Einstieg für Sprachmodelle\n\n");
    text.push_str("Dieses Paket beschreibt das Projekt vollständig. Empfohlene Reihenfolge:\n\n");
    text.push_str("1. Diese Zusammenfassung – Umfang, Domänen, Sprachen.\n");
    text.push_str("2. `Architektur.md` – Verzeichnisbaum und Dateiübersicht.\n");
    text.push_str("3. `Quellen/` – der vollständige Code, eine Datei je Domäne.\n");
    text.push_str("4. `Dokumentation.md` – alle Markdown-Dateien im Volltext.\n");
    text.push_str(&format!(
        "5. `kontext.json` – dieselben Daten maschinenlesbar (schemaVersion {}).\n",
        SCHEMA_VERSION
    ));

    text.push_str("\n## Domänen\n\n");
    text.push_str("| Domäne | Dateien | Zeilen | Quellendatei |\n|---|---|---|---|\n");
    for domaene in domaenen {
        text.push_str(&format!(
            "| `{}` | {} | {} | `{}` |\n",
            domaene.name,
            domaene.dateien.len(),
            domaene.zeilen,
            quellen_name(domaene)
        ));
    }

    text.push_str("\n## Sprachen\n\n");
    for (sprache, sprach_zeilen) in sprachverteilung(&dateien) {
        text.push_str(&format!(
            "- {}: {} Zeilen ({})\n",
            sprache,
            sprach_zeilen,
            prozent(sprach_zeilen, zeilen)
        ));
    }

    text.push_str("\n## Größte Dateien\n\n");
    let mut nach_groesse = dateien.clone();
    nach_groesse.sort_by(|a, b| b.zeilen.cmp(&a.zeilen));
    for datei in nach_groesse.iter().take(10) {
        text.push_str(&format!(
            "- `{}` — {}, {} Zeilen\n",
            datei.relativer_pfad, datei.sprache, datei.zeilen
        ));
    }

    text
}

/// Landkarte: Baum und Dateiübersicht je Domäne.
pub fn architektur(scan: &ScanErgebnis, domaenen: &[Domaene<'_>]) -> String {
    let dateien: Vec<&DateiInfo> = scan.dateien.iter().collect();

    let mut text = kopf(
        "Architektur",
        scan,
        &[format!(
            "**Umfang:** {} Dateien · {} Domänen",
            dateien.len(),
            domaenen.len()
        )],
    );
    text.push_str(&hinweisblock(scan));

    text.push_str("\n## Verzeichnisbaum\n\n");
    text.push_str(&baum(&dateien).join("\n"));
    text.push('\n');

    text.push_str("\n## Domänen im Detail\n");
    for domaene in domaenen {
        text.push_str(&format!(
            "\n### Domäne `{}` ({} Dateien, {} Zeilen)\n\n",
            domaene.name,
            domaene.dateien.len(),
            domaene.zeilen
        ));
        text.push_str("| Datei | Sprache | Zeilen | Zeichen |\n|---|---|---|---|\n");
        for datei in &domaene.dateien {
            text.push_str(&format!(
                "| `{}` | {} | {} | {} |\n",
                datei.relativer_pfad, datei.sprache, datei.zeilen, datei.zeichen
            ));
        }
    }

    text
}
