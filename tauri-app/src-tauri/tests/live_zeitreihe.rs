//! Integrationstests der Live-Zeitreihe (Phase 4).
//!
//! Gegenstück: `src-tauri/src/live_zeitreihe.rs`. Geprüft wird die
//! Leseansicht auf der echten SQLite-WAL-Datenbank: Reihenfolge,
//! Zeitraum-Filter und der Umgang mit kaputten Zeitstempeln.

use propakt_lib::live_store::{
    kuerzen, oeffne_db, snapshot_schreiben, BaumEintrag, TickErgebnis,
};
use propakt_lib::live_zeitreihe::zeitreihe_lesen;

/// Zeitstempel von vor `stunden` Stunden im App-Format `%Y-%m-%d %H:%M:%S`.
///
/// Bewusst relativ zum jetzigen Zeitpunkt: `zeitreihe_lesen` filtert gegen
/// `chrono::Local::now()`. Ein fest verdrahtetes Datum liefe mit der Zeit aus
/// jedem Zeitraum heraus, der Test wäre also nur um sein Erstellungsdatum herum
/// grün.
fn vor(stunden: f64) -> String {
    let millisekunden = (stunden * 3_600_000.0) as i64;
    (chrono::Local::now() - chrono::Duration::milliseconds(millisekunden))
        .format("%Y-%m-%d %H:%M:%S")
        .to_string()
}

fn pruefe(name: &str, bedingung: bool) {
    println!("{} {name}", if bedingung { "PASS" } else { "FAIL" });
    if !bedingung {
        std::process::exit(1);
    }
}

/// Neues Tick-Ergebnis mit fixen Werten und Zeitstempel.
fn tick(zeitstempel: &str, dateien: usize, zeilen: usize, neu: usize) -> TickErgebnis {
    TickErgebnis {
        identitaet: "test".to_string(),
        zeitstempel: zeitstempel.to_string(),
        dateien,
        zeilen,
        neu,
        geaendert: 1,
        entfernt: 0,
        unverändert: 3,
        ruhig: false,
        journal: vec![],
        erstaufnahme: false,
    }
}

fn signatur(dateien: usize) -> Vec<BaumEintrag> {
    (0..dateien)
        .map(|i| BaumEintrag {
            relativer_pfad: format!("p{i}.ts"),
            groesse: 10,
            mtime_ms: 0,
        })
        .collect()
}

#[test]
fn reihenfolge_und_filter() {
    let ordner = tempfile::tempdir().expect("TempDir");
    let db = ordner.path().join("test.db");
    let verbindung = oeffne_db(&db).expect("DB öffnen");

    // Drei Ticks über zwei Zeiträume; Zeitstempel im App-Format.
    let alt = vor(40.0);
    let mittel = vor(38.5);
    let jung = vor(1.0);
    snapshot_schreiben(&verbindung, &tick(&alt, 10, 100, 2), &signatur(10))
        .expect("Snapshot 1");
    snapshot_schreiben(
        &verbindung,
        &tick(&mittel, 11, 120, 1),
        &signatur(11),
    )
    .expect("Snapshot 2");
    snapshot_schreiben(&verbindung, &tick(&jung, 12, 150, 1), &signatur(12))
        .expect("Snapshot 3");

    // Gesamtverlauf: alle drei, ältester zuerst.
    let alles = zeitreihe_lesen(&verbindung, None).expect("Zeitreihe");
    pruefe("Gesamtverlauf: alle drei Punkte", alles.len() == 3);
    pruefe("Ältester zuerst", alles.first().map(|p| p.zeitstempel.as_str()) == Some(alt.as_str()));
    pruefe(
        "Metriken kommen an",
        alles[2].dateien == 12 && alles[2].zeilen == 150 && alles[2].neu == 1,
    );

    // Zeitraum „letzte 20 Stunden“: nur der junge Punkt liegt darin.
    let gefiltert = zeitreihe_lesen(&verbindung, Some(20.0)).expect("Zeitraum");
    pruefe("Zeitraum 20 h: nur der heutige Punkt", gefiltert.len() == 1);
    pruefe("Gefiltert: der heutige Punkt", gefiltert[0].zeitstempel == jung);
    pruefe(
        "Gefiltert: Metriken kommen an",
        gefiltert[0].dateien == 12 && gefiltert[0].zeilen == 150,
    );

    // Kürzung löscht alte Snapshots — die Zeitreihe folgt der Kürzung.
    kuerzen(&verbindung, 1).expect("Kürzung");
    let nach_kuerzung = zeitreihe_lesen(&verbindung, None).expect("Nach Kürzung");
    pruefe("Nach Kürzung: nur der Rest", nach_kuerzung.len() == 1);
    pruefe("Nach Kürzung: der letzte bleibt", nach_kuerzung[0].zeitstempel == jung);
}

#[test]
fn kaputte_zeitstempel_kaufen_nicht_die_lesung() {
    let ordner = tempfile::tempdir().expect("TempDir");
    let db = ordner.path().join("test.db");
    let verbindung = oeffne_db(&db).expect("DB öffnen");

    snapshot_schreiben(&verbindung, &tick(&vor(0.5), 5, 50, 0), &signatur(5))
        .expect("Snapshot gut");
    // Kaputter Zeitstempel (falsches Format) — darf die Lesung nicht töten.
    snapshot_schreiben(&verbindung, &tick("kaputt", 6, 60, 0), &signatur(6))
        .expect("Snapshot kaputt");

    let alles = zeitreihe_lesen(&verbindung, None).expect("Zeitreihe");
    pruefe("Gesamtverlauf enthält auch den kaputten", alles.len() == 2);

    let gefiltert = zeitreihe_lesen(&verbindung, Some(1.0)).expect("Zeitraum 1 h");
    pruefe(
        "Kaputter fliegt im gefilterten Modus heraus",
        gefiltert.iter().all(|p| p.zeitstempel != "kaputt"),
    );
    pruefe("Nur der gute bleibt gefiltert", gefiltert.len() == 1);
}
