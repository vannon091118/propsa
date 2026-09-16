//! Fixtures für die Doku-Wahrheit-Linse: fehlende/erfüllte Referenzen.
//!
//! Gegenstück: `tests/paketKritik.test.ts` (CLI). Nutzt eine minimale
//! `ScanErgebnis`-Fabrik statt echter Scans, damit die Linse isoliert
//! geprüft wird. Aufruf: `cargo test -p propsa`.

#[cfg(test)]
mod tests {
    use crate::history::DeltaInfo;
    use crate::paketkritik::kritik;
    use crate::scan::{DateiInfo, ScanErgebnis};

    fn datei(relativer_pfad: &str, inhalt: &str) -> DateiInfo {
        DateiInfo {
            relativer_pfad: relativer_pfad.to_string(),
            zeilen: inhalt.lines().count(),
            zeichen: inhalt.len(),
            inhalt: inhalt.to_string(),
            sprache: "Markdown".to_string(),
        }
    }

    fn scan(dateien: Vec<DateiInfo>) -> ScanErgebnis {
        let gesamt_zeilen = dateien.iter().map(|d| d.zeilen).sum();
        ScanErgebnis {
            titel: "Fixture".to_string(),
            zeitstempel: "2026-01-01T00:00:00Z".to_string(),
            gesamt_zeilen,
            gesamt_zeichen: 0,
            dateien,
            uebersprungen: 0,
            delta_info: None::<DeltaInfo>,
        }
    }

    #[test]
    fn erfuellte_referenz_ist_kein_fehler() {
        let scan = scan(vec![
            datei("docs/Anleitung.md", "Siehe `src/scanner.ts`.\n"),
            datei("src/scanner.ts", "export {};\n"),
        ]);
        let text = kritik(&scan);
        assert!(text.contains("existieren im Paket"));
        assert!(!text.contains("fehlen im Paket"));
    }

    #[test]
    fn fehlende_referenz_wird_gemeldet() {
        let scan = scan(vec![
            datei("docs/Anleitung.md", "Siehe `src/fehlt.ts`.\n"),
            datei("src/scanner.ts", "export {};\n"),
        ]);
        assert!(kritik(&scan).contains("`src/fehlt.ts`"));
    }

    #[test]
    fn pseudo_referenzen_sind_keine_behauptung() {
        let scan = scan(vec![
            datei(
                "docs/Anleitung.md",
                "Module in `src/…`, Wildcard `src/**/*.ts`.\n",
            ),
            datei("src/components/a.ts", "export {};\n"),
        ]);
        assert!(!kritik(&scan).contains("fehlen im Paket"));
    }

    #[test]
    fn verzeichnis_abdeckung_erfuellt_referenz() {
        let scan = scan(vec![
            datei("docs/Anleitung.md", "Alles unter `src/components`.\n"),
            datei("src/components/tief/a.ts", "export {};\n"),
        ]);
        assert!(kritik(&scan).contains("existieren im Paket"));
    }

    #[test]
    fn ohne_doku_gibt_es_hinweis() {
        let scan = scan(vec![datei("src/a.ts", "export {};\n")]);
        assert!(kritik(&scan).contains("nichts zu prüfen"));
    }
}
