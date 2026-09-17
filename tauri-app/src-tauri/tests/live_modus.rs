//! Integrationstests des Live-Modus (Phase 1: Persistenz + Tick-Kern).
//!
//! Gegenstück: `src-tauri/src/live_store.rs` und `src-tauri/src/live_zyklus.rs`.
//! Aufruf: `cargo test` (in `tauri-app/src-tauri`).
//!
//! Kernszenario ist eine Tick-Folge in einem Wegwerf-Projekt: erst anlegen,
//! dann ruhig bleiben, dann ändern, dann löschen, dann neu — dasJournal muss
//! jede Stufe exakt melden, der Bestand konsistent bleiben.

use propsa_lib::live_store::{
    bestand_entfernen, bestand_laden, bestand_setzen, kuerzen, letzte_signatur, oeffne_db,
    signatur_aus_json, snapshot_schreiben, BestandEintrag, BaumEintrag, MAX_SNAPSHOTS,
};
use propsa_lib::live_anomalie::{anomalien_schreiben, AnomalieBefund};
use propsa_lib::live_zyklus::tick_berechnen;
use rusqlite::Connection;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

fn pruefe(name: &str, bedingung: bool) {
    println!("{} {name}", if bedingung { "PASS" } else { "FAIL" });
    if !bedingung {
        std::process::exit(1);
    }
}
use std::time::Duration;

/// Wegwerf-Projekt mit zwei Dateien anlegen.
fn projekt_anlegen() -> (tempfile::TempDir, PathBuf) {
    let ordner = tempfile::tempdir().expect("TempDir");
    let basis = ordner.path().join("projekt");
    fs::create_dir_all(&basis).expect("Projektordner");
    fs::write(basis.join("a.ts"), "export const a = 1;\n").expect("a.ts");
    fs::write(basis.join("b.ts"), "export const b = 2;\nexport const b2 = 22;\n").expect("b.ts");
    (ordner, basis)
}

/// Bestand laut Journal spiegeln (dieselbe Regel wie `tick_ausfuehren`).
fn bestand_spiegeln(
    verbindung: &Connection,
    journal: &[propsa_lib::live_store::JournalEintrag],
    bestand: &HashMap<String, BestandEintrag>,
) {
    for eintrag in journal {
        match eintrag.art.as_str() {
            "entfernt" => bestand_entfernen(verbindung, &eintrag.pfad).expect("entfernen"),
            "neu" | "geaendert" => {
                let daten = bestand.get(&eintrag.pfad).expect("Bestand im Speicher");
                bestand_setzen(verbindung, &eintrag.pfad, daten.zeilen, &daten.hash)
                    .expect("setzen");
            }
            _ => {}
        }
    }
}

#[test]
fn wal_ist_aktiv() {
    let ordner = tempfile::tempdir().expect("TempDir");
    let verbindung = oeffne_db(&ordner.path().join("test.db")).expect("DB");
    let modus: String = verbindung
        .query_row("PRAGMA journal_mode", rusqlite::params![], |zeile| zeile.get(0))
        .expect("PRAGMA");
    assert_eq!(modus.to_lowercase(), "wal");
}

#[test]
fn erstlauf_ohne_signatur() {
    let ordner = tempfile::tempdir().expect("TempDir");
    let verbindung = oeffne_db(&ordner.path().join("test.db")).expect("DB");
    assert!(letzte_signatur(&verbindung).expect("lesen").is_none());
}

#[test]
fn kaputte_signatur_ergibt_none() {
    assert!(signatur_aus_json("kein json").is_none());
    assert!(signatur_aus_json("[{\"relativer_pfad\":1}]").is_none());
}

#[test]
fn bestand_rundreise() {
    let ordner = tempfile::tempdir().expect("TempDir");
    let verbindung = oeffne_db(&ordner.path().join("test.db")).expect("DB");
    assert!(bestand_laden(&verbindung).expect("lesen").is_empty());
    bestand_setzen(&verbindung, "a.ts", 12, "abc").expect("setzen");
    bestand_setzen(&verbindung, "a.ts", 15, "def").expect("ersetzen");
    let bestand = bestand_laden(&verbindung).expect("lesen");
    assert_eq!(bestand.len(), 1);
    assert_eq!(
        bestand.get("a.ts").expect("Eintrag"),
        &BestandEintrag { zeilen: 15, hash: "def".to_string() }
    );
    bestand_entfernen(&verbindung, "a.ts").expect("entfernen");
    assert!(bestand_laden(&verbindung).expect("lesen").is_empty());
}

#[test]
fn kuerzen_behaelt_neueste_snapshots() {
    let ordner = tempfile::tempdir().expect("TempDir");
    let verbindung = oeffne_db(&ordner.path().join("test.db")).expect("DB");
    let signatur = vec![BaumEintrag {
        relativer_pfad: "a.ts".to_string(),
        groesse: 1,
        mtime_ms: 1,
    }];
    for index in 0..(MAX_SNAPSHOTS + 25) {
        let ergebnis = propsa_lib::live_store::TickErgebnis {
            identitaet: "test".into(),
            zeitstempel: format!("t{index}"),
            dateien: 1,
            zeilen: 1,
            neu: 0,
            geaendert: 0,
            entfernt: 0,
            unverändert: 1,
            journal: vec![],
            ruhig: false,
        };
        snapshot_schreiben(&verbindung, &ergebnis, &signatur).expect("schreiben");
        // Phase-2-Verantwortung: Der Aufrufer kürzt (Kinder zuerst).
        kuerzen(&verbindung, MAX_SNAPSHOTS).expect("kürzen");
    }
    let anzahl: i64 = verbindung
        .query_row("SELECT COUNT(*) FROM snapshots", rusqlite::params![], |zeile| zeile.get(0))
        .expect("zählen");
    assert_eq!(anzahl, MAX_SNAPSHOTS as i64);
    let journal: i64 = verbindung
        .query_row("SELECT COUNT(*) FROM journal", rusqlite::params![], |zeile| zeile.get(0))
        .expect("zählen");
    assert_eq!(journal, 0);
}

#[test]
fn tick_folge_ende_zu_ende() {
    let (_ordner, basis) = projekt_anlegen();
    let verbindung = oeffne_db(&PathBuf::from(std::env::temp_dir()).join("propsa-live-test.db"))
        .expect("DB");
    // Frische DB je Lauf: alter Stand darf nicht verrutschen.
    verbindung.execute("DELETE FROM snapshots", []).ok();
    verbindung.execute("DELETE FROM journal", []).ok();
    verbindung.execute("DELETE FROM bestand", []).ok();

    // Tick 1: Erstlauf — beide Dateien sind neu.
    let tick1 = tick_berechnen(&basis, &[], &[], None, &HashMap::new()).expect("Tick 1");
    assert!(!tick1.ergebnis.ruhig);
    assert_eq!(tick1.ergebnis.neu, 2);
    assert_eq!(tick1.ergebnis.geaendert, 0);
    assert_eq!(tick1.ergebnis.dateien, 2);
    assert_eq!(tick1.ergebnis.zeilen, 3); // 1 + 2 Zeilen
    assert_eq!(tick1.bestand.len(), 2);
    bestand_spiegeln(&verbindung, &tick1.ergebnis.journal, &tick1.bestand);
    snapshot_schreiben(&verbindung, &tick1.ergebnis, &tick1.signatur).expect("speichern");

    // Tick 2: unverändert — ruhig, kein Journal, Bestand unverändert.
    let tick2 = tick_berechnen(
        &basis,
        &[],
        &[],
        Some(&tick1.signatur),
        &tick1.bestand,
    )
    .expect("Tick 2");
    assert!(tick2.ergebnis.ruhig);
    assert!(tick2.ergebnis.journal.is_empty());
    assert_eq!(tick2.ergebnis.zeilen, 3);
    assert_eq!(tick2.bestand, tick1.bestand);

    // Tick 3: a.ts wächst — genau eine Änderung, Zeilen-Delta +2.
    // size ändert sich mit, mtime muss nicht extra erzwungen werden.
    std::thread::sleep(Duration::from_millis(20));
    fs::write(basis.join("a.ts"), "export const a = 1;\nexport const neu = true;\n")
        .expect("a.ts erweitern");
    let tick3 = tick_berechnen(&basis, &[], &[], Some(&tick2.signatur), &tick2.bestand)
        .expect("Tick 3");
    assert!(!tick3.ergebnis.ruhig);
    assert_eq!(tick3.ergebnis.geaendert, 1);
    assert_eq!(tick3.ergebnis.neu, 0);
    assert_eq!(tick3.ergebnis.entfernt, 0);
    let delta_a = tick3
        .ergebnis
        .journal
        .iter()
        .find(|eintrag| eintrag.pfad == "a.ts")
        .expect("Journal a.ts");
    assert_eq!(delta_a.art, "geaendert");
    assert_eq!(delta_a.zeilen_delta, 1); // 1 Zeile hinzugekommen (1 → 2)
    assert_eq!(tick3.ergebnis.zeilen, 4); // a.ts 2 + b.ts 2
    bestand_spiegeln(&verbindung, &tick3.ergebnis.journal, &tick3.bestand);
    snapshot_schreiben(&verbindung, &tick3.ergebnis, &tick3.signatur).expect("speichern");

    // Tick 4: b.ts gelöscht — entfernt mit negativem Delta.
    std::thread::sleep(Duration::from_millis(20));
    fs::remove_file(basis.join("b.ts")).expect("b.ts löschen");
    let tick4 = tick_berechnen(&basis, &[], &[], Some(&tick3.signatur), &tick3.bestand)
        .expect("Tick 4");
    assert_eq!(tick4.ergebnis.entfernt, 1);
    assert_eq!(tick4.ergebnis.neu, 0);
    let delta_b = tick4
        .ergebnis
        .journal
        .iter()
        .find(|eintrag| eintrag.pfad == "b.ts")
        .expect("Journal b.ts");
    assert_eq!(delta_b.art, "entfernt");
    assert_eq!(delta_b.zeilen_delta, -2);
    assert_eq!(tick4.bestand.len(), 1);
    assert!(tick4.bestand.contains_key("a.ts"));
    bestand_spiegeln(&verbindung, &tick4.ergebnis.journal, &tick4.bestand);
    snapshot_schreiben(&verbindung, &tick4.ergebnis, &tick4.signatur).expect("speichern");
    let bestand_db = bestand_laden(&verbindung).expect("Bestand lesen");
    assert_eq!(bestand_db.len(), 1);
    assert!(bestand_db.contains_key("a.ts"));

    // Tick 5: c.ts kommt neu hinzu.
    std::thread::sleep(Duration::from_millis(20));
    fs::write(basis.join("c.ts"), "export const c = 3;\n").expect("c.ts");
    let tick5 = tick_berechnen(&basis, &[], &[], Some(&tick4.signatur), &tick4.bestand)
        .expect("Tick 5");
    assert_eq!(tick5.ergebnis.neu, 1);
    assert_eq!(tick5.ergebnis.dateien, 2);
    assert_eq!(tick5.ergebnis.zeilen, 3); // a.ts 2 + c.ts 1
    bestand_spiegeln(&verbindung, &tick5.ergebnis.journal, &tick5.bestand);
    snapshot_schreiben(&verbindung, &tick5.ergebnis, &tick5.signatur).expect("speichern");

    // Signatur-Rundreise über die DB: der letzte Stand kehrt zurück.
    let letzte = letzte_signatur(&verbindung)
        .expect("lesen")
        .expect("Signatur vorhanden");
    assert_eq!(letzte, tick5.signatur);

    // Journal in der DB: 4 Einträge (2 neu, 1 geaendert, 1 entfernt, 1 neu).
    let anzahl: i64 = verbindung
        .query_row("SELECT COUNT(*) FROM journal", rusqlite::params![], |zeile| zeile.get(0))
        .expect("zählen");
    assert_eq!(anzahl, 5);

    let _ = fs::remove_file(PathBuf::from(std::env::temp_dir()).join("propsa-live-test.db"));
}

/// Anomalien sind mit Snapshot verknüpft; Kürzen auf 0 Snapshots entfernt
/// die Waisen (Kinder zuerst). Gegenstück: `kuerzen` in `live_store.rs`.
#[test]
fn anomalien_waren_und_kuerzen() {
    let ordner = tempfile::tempdir().expect("TempDir");
    let verbindung = oeffne_db(&ordner.path().join("live.db")).expect("DB");
    // Snapshot anlegen, damit die Anomalie ein Ziel hat.
    let ergebnis = propsa_lib::live_store::TickErgebnis {
        identitaet: "test".into(),
        zeitstempel: "2026-09-17 12:00:00".into(),
        dateien: 1,
        zeilen: 2,
        neu: 0,
        geaendert: 1,
        entfernt: 0,
        unverändert: 0,
        journal: vec![propsa_lib::live_store::JournalEintrag {
            pfad: "a.ts".into(),
            art: "geaendert".into(),
            zeilen_delta: 1,
        }],
        ruhig: false,
    };
    snapshot_schreiben(
        &verbindung,
        &ergebnis,
        &[BaumEintrag {
            relativer_pfad: "a.ts".into(),
            groesse: 1,
            mtime_ms: 1,
        }],
    )
    .expect("snapshot");
    let befunde = vec![AnomalieBefund {
        art: "flattern".into(),
        pfad: Some("a.ts".into()),
        beschreibung: "Test-Befund".into(),
        schwere: 2,
    }];
    anomalien_schreiben(&verbindung, &befunde).expect("schreiben");
    let anzahl: i64 = verbindung
        .query_row("SELECT COUNT(*) FROM anomalien", [], |zeile| zeile.get(0))
        .expect("zählen");
    pruefe("Anomalie liegt in der DB", anzahl == 1);
    // Kürzen auf 0 Snapshots entfernt Kinder zuerst, dann die Anomalien.
    kuerzen(&verbindung, 0).expect("kuerzen");
    let anzahl: i64 = verbindung
        .query_row("SELECT COUNT(*) FROM anomalien", [], |zeile| zeile.get(0))
        .expect("zählen");
    pruefe("Waisen-Anomalien nach Kürzung weg", anzahl == 0);
}
