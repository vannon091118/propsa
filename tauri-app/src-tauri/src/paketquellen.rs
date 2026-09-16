//! Die zwei Volltext-Teile des Pakets: Dokumentation und Domänenquellen.
//!
//! Jede Datei erscheint im Paket genau einmal mit Inhalt: Markdown-Dateien in
//! `Dokumentation.md`, alles andere in der Quellendatei der Domäne.
//! Gegenstück in der CLI: `src/paketQuellen.ts`.

use crate::domaene::{Domaene, ist_dokumentation};
use crate::paketbasis::{hinweisblock, kopf};
use crate::scan::{DateiInfo, ScanErgebnis};
use crate::sprache::code_block_sprache;

/// Eine Datei im Volltext.
fn volltext(datei: &DateiInfo) -> String {
    format!(
        "\n---\n\n### `{}`\n\n**Sprache:** {}  **Zeilen:** {}  **Zeichen:** {}\n\n```{}\n{}\n```\n",
        datei.relativer_pfad,
        datei.sprache,
        datei.zeilen,
        datei.zeichen,
        code_block_sprache(&datei.sprache),
        datei.inhalt
    )
}

/// Alle Markdown-Dateien im Volltext (Doku-Linse).
pub fn dokumentation(scan: &ScanErgebnis) -> String {
    let dokumente: Vec<&DateiInfo> = scan
        .dateien
        .iter()
        .filter(|datei| ist_dokumentation(datei))
        .collect();

    let mut text = kopf(
        "Dokumentation",
        scan,
        &[format!("**Dokumente:** {}", dokumente.len())],
    );
    text.push_str(&hinweisblock(scan));

    if dokumente.is_empty() {
        text.push_str("\nKeine Dokumentationsdateien gefunden.\n");
        return text;
    }

    for datei in &dokumente {
        text.push_str(&format!(
            "\n---\n\n## `{}`\n\n**Sprache:** {}  **Zeilen:** {}  **Zeichen:** {}\n\n```{}\n{}\n```\n",
            datei.relativer_pfad,
            datei.sprache,
            datei.zeilen,
            datei.zeichen,
            code_block_sprache(&datei.sprache),
            datei.inhalt
        ));
    }

    text
}

/// Vollständiger Code einer Domäne (ohne Dokumentationsdateien).
pub fn quellen(scan: &ScanErgebnis, domaene: &Domaene<'_>) -> String {
    let dateien: Vec<&DateiInfo> = domaene
        .dateien
        .iter()
        .copied()
        .filter(|datei| !ist_dokumentation(datei))
        .collect();
    let zeilen: usize = dateien.iter().map(|datei| datei.zeilen).sum();

    let mut text = kopf(
        &format!("Quellen der Domäne `{}`", domaene.name),
        scan,
        &[
            format!("**Datei:** `{}`", crate::domaene::quellen_name(domaene)),
            format!("**Umfang:** {} Dateien · {} Zeilen", dateien.len(), zeilen),
        ],
    );
    text.push_str(&hinweisblock(scan));

    if dateien.is_empty() {
        text.push_str(
            "\nDiese Domäne enthält nur Dokumentationsdateien; sie stehen in `Dokumentation.md`.\n",
        );
        return text;
    }

    text.push_str("\n## Dateiindex\n\n");
    for (index, datei) in dateien.iter().enumerate() {
        text.push_str(&format!(
            "{}. `{}` — {}, {} Zeilen, {} Zeichen\n",
            index + 1,
            datei.relativer_pfad,
            datei.sprache,
            datei.zeilen,
            datei.zeichen
        ));
    }

    for datei in &dateien {
        text.push_str(&volltext(datei));
    }

    text
}
