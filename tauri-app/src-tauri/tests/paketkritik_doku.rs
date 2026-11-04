//! Fixtures für die Doku-Wahrheit-Linse: fehlende/erfüllte Referenzen.
//!
//! Gegenstück: `tests/paketKritik.test.ts` (CLI). Nutzt eine minimale
//! `ScanErgebnis`-Fabrik statt echter Scans, damit die Linse isoliert
//! geprüft wird. Aufruf: `cargo test -p propakt`.
//!
//! Reparatur 2026-09-17: Das File importierte mit `crate::…` aus der Lib –
//! in Integrationstests zeigt `crate` auf den Test selbst, das File konnte
//! seit 35ffc91 nie kompilieren (`cargo check` baut keine Integrationstests).

use propakt_lib::paketkritik::kritik;
use propakt_lib::scan::{DateiInfo, ScanErgebnis};

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
        identitaet: "fixture".to_string(),
        gesamt_zeilen,
        gesamt_zeichen: 0,
        dateien,
        uebersprungen: 0,
        delta_info: None,
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
    assert!(kritik(&scan).contains("ohne konkrete Datei-Referenz"));
}

#[test]
fn ohne_doku_gibt_es_hinweis() {
    let scan = scan(vec![datei("src/a.ts", "export {};\n")]);
    assert!(kritik(&scan).contains("nichts zu prüfen"));
}

#[test]
fn brace_liste_wird_in_einzelne_dateireferenzen_aufgeloest() {
    let scan = scan(vec![
        datei("docs/Anleitung.md", "Siehe `src/core/io/{issues,envelope,repair}.ts`.\\n"),
        datei("src/core/io/issues.ts", "export {};\\n"),
        datei("src/core/io/envelope.ts", "export {};\\n"),
        datei("src/core/io/repair.ts", "export {};\\n"),
    ]);
    let text = kritik(&scan);
    assert!(text.contains("Alle 3 Datei-Referenzen existieren im Paket."));
    assert!(!text.contains("fehlen im Paket"));
}

#[test]
fn fehlende_brace_variante_wird_einzeln_gemeldet() {
    let scan = scan(vec![
        datei("docs/Anleitung.md", "Siehe src/core/io/{issues,envelope,repair}.ts.\n"),
        datei("src/core/io/issues.ts", "export {};\n"),
        datei("src/core/io/envelope.ts", "export {};\n"),
    ]);
    assert!(kritik(&scan).contains("1 von 3 Referenzen fehlen im Paket"));
}

fn quelle(relativer_pfad: &str, inhalt: &str) -> DateiInfo {
    let mut d = datei(relativer_pfad, inhalt);
    d.sprache = "TypeScript".to_string();
    d
}

#[test]
fn unbekannte_src_core_struktur_wird_als_domane_erkannt() {
    let scan = scan(vec![
        quelle(
            "src/core/narrative/engine.ts",
            "import { clock } from '@/systems/clock';\nimport { panel } from '@/render/panel';\nimport { store } from '@/persistence/store';",
        ),
        quelle("src/systems/clock.ts", "export const clock = 1;"),
        quelle("src/render/panel.ts", "export const panel = 1;"),
        quelle("src/persistence/store.ts", "export const store = 1;"),
    ]);
    let text = kritik(&scan);
    assert!(text.contains("src/core"));
    assert!(text.contains("src/core/narrative/engine.ts"));
}
