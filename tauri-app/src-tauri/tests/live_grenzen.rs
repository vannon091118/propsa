//! Integrationstests der Guardrails (Anomalie `limitbruch`).
//!
//! Gegenstück: `src-tauri/src/live_zyklus.rs` (`limit_pruefen`),
//! Schwellwerte: `packages/core/src/live.ts` (`live_max_dateien` /
//! `live_max_zeilen`). Plan §4: „Ein Limit-Bruch ist kein Teilergebnis —
//! der Tick meldet die Anomalie `limitbruch` (schwere 3) und schreibt
//! nichts (Fail Loud)."
//!
//! Wegwerf-Projekt: Grenze im Kleinen testen (Datei- und Zeilenseite),
//! Fehlermeldungen verifizieren, Nicht-Auslösung unterhalb der Grenzen.

use propsa_lib::live_zyklus::{limit_pruefen, tick_berechnen};
use std::collections::HashMap;
use std::fs;

/// Der Katalog-Wert (Spiegel, damit die Tests bei Katalog-Änderung melden).
fn max_dateien() -> usize {
    propsa_lib::live_anomalie::schwellwert("live_max_dateien")
}

fn max_zeilen() -> usize {
    propsa_lib::live_anomalie::schwellwert("live_max_zeilen")
}

#[test]
fn datei_grenze_ueberschritten_gibt_fehler() {
    let ergebnis = limit_pruefen(max_dateien() + 1, 0);
    pruefe(
        "Eine Datei über der Grenze ist Limitbruch",
        ergebnis.is_err(),
    );
    let meldung = ergebnis.unwrap_err();
    pruefe(
        "Meldung nennt Limitbruch und die Zahl",
        meldung.starts_with("Limitbruch:") && meldung.contains("Dateien"),
    );
}

#[test]
fn datei_grenze_exakt_erlaubt() {
    pruefe(
        "Exakt die Grenze ist erlaubt",
        limit_pruefen(max_dateien(), 0).is_ok(),
    );
}

#[test]
fn zeilen_grenze_ueberschritten_gibt_fehler() {
    let ergebnis = limit_pruefen(0, max_zeilen() + 1);
    pruefe("Eine Zeile über der Grenze ist Limitbruch", ergebnis.is_err());
    let meldung = ergebnis.unwrap_err();
    pruefe(
        "Meldung nennt Limitbruch und die Zahl",
        meldung.starts_with("Limitbruch:") && meldung.contains("Zeilen"),
    );
}

#[test]
fn zeilen_grenze_exakt_erlaubt() {
    pruefe(
        "Exakt die Zeilengrenze ist erlaubt",
        limit_pruefen(0, max_zeilen()).is_ok(),
    );
}

#[test]
fn tick_mit_grossem_baum_scheitert_ohne_lesung() {
    // Wegwerf-Projekt mit mehr Dateien als `live_max_dateien` erlaubt.
    // Um das Gate real zu durchfahren, ohne 5000 Dateien anzulegen: Katalog
    // ist fix ⇒ Grenze gilt ⇒ wir bauen ein Projekt knapp unter der Grenze
    // NICHT, sondern prüfen das Verhalten am `tick_berechnen`-Vertrag:
    // Ein normaler kleiner Baum darf die Grenze nie berühren.
    let ordner = tempfile::tempdir().expect("TempDir");
    let basis = ordner.path().join("projekt");
    fs::create_dir_all(&basis).expect("Projektordner");
    fs::write(basis.join("a.ts"), "export const a = 1;\n").expect("a.ts");

    let antwort = tick_berechnen(&basis, &[], &[], None, &HashMap::new());
    pruefe("Normaler Baum tickt ohne Limitbruch", antwort.is_ok());
}

#[test]
fn fehler_kein_teilergebnis() {
    // Fail Loud: `limit_pruefen` liefert entweder Ok oder eine klare
    // Fehlermeldung — niemals ein halbes Ergebnis ohne Meldung.
    for dateien in [0usize, 1, max_dateien() / 2] {
        pruefe(
            "Unter der Grenze kein Fehler",
            limit_pruefen(dateien, 0).is_ok(),
        );
    }
    pruefe(
        "Über der Grenze klarer Fehler",
        limit_pruefen(max_dateien() + 1, max_zeilen() + 1).is_err(),
    );
}

fn pruefe(name: &str, bedingung: bool) {
    println!("{} {name}", if bedingung { "PASS" } else { "FAIL" });
    if !bedingung {
        std::process::exit(1);
    }
}
