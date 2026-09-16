//! Kritik-Linse: Godfiles, Logikmischung, Artefakte, Doku-Lügen.

use crate::kritik_regeln::{artefakt_muster, datei_domain, import_domain, prozent, GOD_GRENZE};
use crate::scan::{DateiInfo, ScanErgebnis};
use std::collections::{BTreeSet, HashSet};

fn kopf(titel: &str, scan: &ScanErgebnis, zusatz: &[String]) -> String {
    let mut t = format!("# PROPSA – {}\n\n", titel);
    t.push_str(&format!("**Projekt:** {}\n", scan.titel));
    t.push_str(&format!("**Erzeugt:** {}\n", scan.zeitstempel));
    for z in zusatz {
        t.push_str(&format!("{}\n", z));
    }
    t
}

pub fn kritik(scan: &ScanErgebnis) -> String {
    let gesamt_zeilen: usize = scan.dateien.iter().map(|d| d.zeilen).sum();
    let vorhanden: HashSet<&str> =
        scan.dateien.iter().map(|d| d.relativer_pfad.as_str()).collect();

    let mut text = kopf(
        "Kritik",
        scan,
        &["**Hinweis:** Diese Linse bewertet Struktur, nicht Funktionalität.".to_string()],
    );

    // 1. Godfiles
    text.push_str("\n## Godfiles (> 300 Zeilen)\n\n");
    let mut godfiles: Vec<&DateiInfo> =
        scan.dateien.iter().filter(|d| d.zeilen > GOD_GRENZE).collect();
    godfiles.sort_by(|a, b| b.zeilen.cmp(&a.zeilen));
    if godfiles.is_empty() {
        text.push_str("Keine Datei über 300 Zeilen – kompakte Module.\n");
    } else {
        text.push_str("| Datei | Sprache | Zeilen | Anteil |\n|---|---|---|---|\n");
        for d in &godfiles {
            text.push_str(&format!(
                "| `{}` | {} | {} | {} |\n",
                d.relativer_pfad,
                d.sprache,
                d.zeilen,
                prozent(d.zeilen, gesamt_zeilen)
            ));
        }
        text.push_str(&format!(
            "\n{} Datei(en) über 300 Zeilen – Kandidaten für Schnitte.\n",
            godfiles.len()
        ));
    }

    // 2. Logikmischung
    text.push_str("\n## Logikmischung (≥ 3 fremde Domänen)\n\n");
    let mut mischungen: Vec<(String, String, Vec<String>)> = Vec::new();
    for d in &scan.dateien {
        if let Some(eigen) = datei_domain(&d.relativer_pfad) {
            let mut fremde = BTreeSet::new();
            for teil in d.inhalt.split("from ") {
                let rest = teil.trim().strip_prefix('\"').or_else(|| teil.trim().strip_prefix('\''));
                if let Some(rest) = rest {
                    let spec = rest.split(['\"', '\'']).next().unwrap_or("");
                    if let Some(dom) = import_domain(spec) {
                        if dom != eigen {
                            fremde.insert(dom.to_string());
                        }
                    }
                }
            }
            if fremde.len() >= 3 {
                mischungen.push((d.relativer_pfad.clone(), eigen.to_string(), fremde.into_iter().collect()));
            }
        }
    }
    if mischungen.is_empty() {
        text.push_str("Keine Datei importiert aus ≥ 3 fremden Domänen.\n");
    } else {
        mischungen.sort_by(|a, b| a.0.cmp(&b.0));
        text.push_str("| Datei | Eigen | Fremde Domänen |\n|---|---|---|---|\n");
        for (pfad, eigen, fremde) in &mischungen {
            let f = fremde.iter().map(|x| format!("`{}`", x)).collect::<Vec<_>>().join(", ");
            text.push_str(&format!("| `{}` | `{}` | {} |\n", pfad, eigen, f));
        }
        text.push_str("\nEmpfehlung: Domänengrenzen schärfen oder Fassade einziehen.\n");
    }

    // 3. Repo-Sauberkeit
    text.push_str("\n## Repo-Sauberkeit (Artefakte im Paket)\n\n");
    let mut artefakte: Vec<(&DateiInfo, &str)> = Vec::new();
    for d in &scan.dateien {
        if let Some(m) = artefakt_muster(&d.relativer_pfad) {
            artefakte.push((d, m));
        }
    }
    if artefakte.is_empty() {
        text.push_str("Keine Artefakte im Paket.\n");
    } else {
        let sum: usize = artefakte.iter().map(|(d, _)| d.zeilen).sum();
        text.push_str(&format!(
            "**{} Datei(en), {} Zeilen ({}) sind Artefakte.**\n\n",
            artefakte.len(),
            sum,
            prozent(sum, gesamt_zeilen)
        ));
        artefakte.sort_by(|a, b| b.0.zeilen.cmp(&a.0.zeilen));
        text.push_str("| Datei | Zeilen | Muster |\n|---|---|---|---|\n");
        for (d, m) in &artefakte {
            text.push_str(&format!("| `{}` | {} | `{}` |\n", d.relativer_pfad, d.zeilen, m));
        }
        text.push_str(
            "\nEmpfehlung: Muster in `IGNORIERTE_VERZEICHNISSE` / `STANDARD_AUSSCHLUESSE` aufnehmen oder via `-e` ausschließen.\n",
        );
        if artefakte.iter().any(|(d, _)| {
            d.relativer_pfad.ends_with("context.md") || d.relativer_pfad.ends_with("context.json")
        }) {
            text.push_str("Hinweis: Das Paket enthält sein eigenes Ergebnis (`context.md`/`context.json`) – Selbstreferenz.\n");
        }
    }

    // 4. Doku-Wahrheit
    text.push_str("\n## Doku-Wahrheit (Pfad-Referenzen in docs/**/*.md)\n\n");
    let docs: Vec<&DateiInfo> = scan
        .dateien
        .iter()
        .filter(|d| d.relativer_pfad.starts_with("docs/") && d.relativer_pfad.ends_with(".md"))
        .collect();
    let mut erwaehnt = BTreeSet::new();
    for d in &docs {
        let mut i = 0;
        let b = d.inhalt.as_bytes();
        while i + 4 < b.len() {
            if &b[i..i + 4] == b"src/" {
                let mut j = i + 4;
                while j < b.len() && !matches!(b[j], b' ' | b'\n' | b'\r' | b'"' | b'\'' | b')' | b']') {
                    j += 1;
                }
                let p = d.inhalt[i..j].trim_end_matches(&[',', '.', ';', ':'][..]).to_string();
                if !p.is_empty() {
                    erwaehnt.insert(p);
                }
                i = j;
            } else {
                i += 1;
            }
        }
    }
    if docs.is_empty() {
        text.push_str("Keine `docs/**/*.md` im Paket – nichts zu prüfen.\n");
    } else if erwaehnt.is_empty() {
        text.push_str(&format!("{} Doku-Datei(en) ohne `src/…`-Pfadreferenz – nichts zu prüfen.\n", docs.len()));
    } else {
        // Eine Referenz zählt nur als „fehlend“, wenn sie wie eine echte
        // Datei aussieht (mit Endung) und kein Eintrag im `dateien`-Array
        // passt – nicht schon, wenn sie nicht wörtlich im Paket steht.
        let referenz_erfuellt = |p: &str| {
            vorhanden.iter().any(|v| {
                *v == p
                    || v.starts_with(&format!("{}/", p))
                    || p.starts_with(&format!("{}/", v))
            })
        };
        let ist_datei_referenz = |p: &str| {
            !p.contains('*')
                && p.rsplit('.').next().map_or(false, |endung| {
                    !endung.is_empty() && endung.len() <= 6 && endung.chars().all(|c| c.is_ascii_alphanumeric())
                })
                && p.contains('/')
        };
        let mut fehlend: Vec<String> = Vec::new();
        for p in &erwaehnt {
            if !ist_datei_referenz(p) {
                continue;
            }
            if !referenz_erfuellt(p) {
                fehlend.push(p.clone());
            }
        }
        if fehlend.is_empty() {
            text.push_str(&format!("Alle {} Datei-Referenzen existieren im Paket.\n", erwaehnt.len()));
        } else {
            fehlend.sort();
            text.push_str(&format!("**{} von {} Referenzen fehlen im Paket:**\n\n", fehlend.len(), erwaehnt.len()));
            for p in fehlend.iter().take(30) {
                text.push_str(&format!("- `{}`\n", p));
            }
            if fehlend.len() > 30 {
                text.push_str(&format!("- … und {} weitere\n", fehlend.len() - 30));
            }
        }
    }

    text
}
