//! Integrationstests der Anomalie-Erkennung (Phase 2).
//!
//! Gegenstück: `src-tauri/src/live_anomalie.rs` (`BeobachtungsStand`),
//! Katalog: `packages/core/src/live.ts`. Jede Regel wird mit einer
//! konstruierten Tick-Folge getrieben: Flattern, Regression (a→b→a),
//! Löschsturm, Explosion und Pendeln.

use propakt_lib::live_anomalie::{schwere_fuer, schwellwert, BeobachtungsStand};
use propakt_lib::live_store::{BestandEintrag, JournalEintrag, TickErgebnis};
use std::collections::HashMap;

fn pruefe(name: &str, bedingung: bool) {
    println!("{} {name}", if bedingung { "PASS" } else { "FAIL" });
    if !bedingung {
        std::process::exit(1);
    }
}

/// Tick-Ergebnis mit genau einem Journal-Eintrag bauen.
fn tick(journal: Vec<JournalEintrag>, dateien: usize, zeilen: usize) -> TickErgebnis {
    TickErgebnis {
        identitaet: "test".into(),
        zeitstempel: "2026-09-17 12:00:00".into(),
        dateien,
        zeilen,
        neu: journal.iter().filter(|j| j.art == "neu").count(),
        geaendert: journal.iter().filter(|j| j.art == "geaendert").count(),
        entfernt: journal.iter().filter(|j| j.art == "entfernt").count(),
        unverändert: 0,
        journal,
        ruhig: false,
        erstaufnahme: false,
    }
}

fn geaendert(pfad: &str, delta: i64) -> JournalEintrag {
    JournalEintrag {
        pfad: pfad.to_string(),
        art: "geaendert".into(),
        zeilen_delta: delta,
    }
}

fn bestand_mit(pfad: &str, zeilen: usize, hash: &str) -> HashMap<String, BestandEintrag> {
    HashMap::from([(
        pfad.to_string(),
        BestandEintrag {
            zeilen,
            hash: hash.to_string(),
        },
    )])
}

#[test]
fn katalog_schweren_sind_erwartet() {
    pruefe("loeschsturm ist schwer", schwere_fuer("loeschsturm") == 3);
    pruefe("limitbruch ist schwer", schwere_fuer("limitbruch") == 3);
    pruefe("flattern ist auffällig", schwere_fuer("flattern") == 2);
    pruefe("unbekannt beobachten", schwere_fuer("unsinn") == 1);
    pruefe(
        "Fenster-Schwellwerte aus dem Katalog",
        schwellwert("flattern_aenderungen") == 4
            && schwellwert("flattern_fenster") == 10
            && schwellwert("pendeln_fenster") == 12,
    );
}

#[test]
fn flattern_zeigt_sich_beim_vierten_aenderung() {
    let mut stand = BeobachtungsStand::neu();
    let bestand = bestand_mit("a.ts", 2, "h1");
    for _ in 0..3 {
        let befunde =
            stand.tick_werten(&tick(vec![geaendert("a.ts", 1)], 1, 2), &bestand);
        assert!(befunde.iter().all(|b| b.art != "flattern"));
    }
    let befunde = stand.tick_werten(&tick(vec![geaendert("a.ts", 1)], 1, 2), &bestand);
    pruefe(
        "vierte Änderung im Fenster löst Flattern aus",
        befunde.iter().filter(|b| b.art == "flattern").count() >= 1,
    );
}

#[test]
fn regression_erkennen_a_b_a() {
    let mut stand = BeobachtungsStand::neu();

    // Tick 1: Datei neu mit Hash A.
    let _ = stand.tick_werten(
        &tick(
            vec![JournalEintrag {
                pfad: "a.ts".into(),
                art: "neu".into(),
                zeilen_delta: 1,
            }],
            1,
            1,
        ),
        &bestand_mit("a.ts", 1, "AAA"),
    );
    // Tick 2: geändert zu Hash B.
    let _ = stand.tick_werten(
        &tick(vec![geaendert("a.ts", 5)], 1, 6),
        &bestand_mit("a.ts", 6, "BBB"),
    );
    // Tick 3: zurück auf Hash A ⇒ Regression.
    let befunde = stand.tick_werten(
        &tick(vec![geaendert("a.ts", -5)], 1, 1),
        &bestand_mit("a.ts", 1, "AAA"),
    );
    pruefe(
        "a→b→a löst Regression aus",
        befunde.iter().any(|b| b.art == "regression" && b.pfad.as_deref() == Some("a.ts")),
    );
}

#[test]
fn loeschsturm_und_explosion_erkennen() {
    let mut stand = BeobachtungsStand::neu();

    // Löschsturm: 5 von 10 Dateien weg (20 % anteil ⇒ 2, absolut ⇒ 10):
    // 5 >= 2 löst aus.
    let befunde = stand.tick_werten(
        &tick(
            (0..5)
                .map(|index| JournalEintrag {
                    pfad: format!("weg{index}.ts"),
                    art: "entfernt".into(),
                    zeilen_delta: -1,
                })
                .collect(),
            5,
            5,
        ),
        &HashMap::new(),
    );
    pruefe(
        "Massenlöschung löst Löschsturm aus",
        befunde.iter().any(|b| b.art == "loeschsturm" && b.schwere == 3),
    );

    // Explosion: +50 Zeilen bei vorher 4 Zeilen gesamt.
    let befunde = stand.tick_werten(
        &tick(vec![geaendert("gross.ts", 50)], 3, 54),
        &bestand_mit("gross.ts", 54, "XXL"),
    );
    pruefe(
        "Zeilenschub löst Explosion aus",
        befunde.iter().any(|b| b.art == "explosion"),
    );
}

#[test]
fn explosion_grenze_eine_zeile_ist_keine() {
    let mut stand = BeobachtungsStand::neu();
    // +1 Zeile bei 5 davor ist 20 % – normale Arbeit, keine Explosion.
    // (Exakt 25 % bei +1 auf 4 zählt als am Schwellwert und löst aus.)
    let befunde = stand.tick_werten(
        &tick(vec![geaendert("klein.ts", 1)], 3, 6),
        &bestand_mit("klein.ts", 6, "k"),
    );
    pruefe(
        "Eine Zeile auf fünf löst keine Explosion aus",
        !befunde.iter().any(|b| b.art == "explosion"),
    );
}

#[test]
fn regression_ueber_loeschung_ist_keine() {
    let mut stand = BeobachtungsStand::neu();
    // a → b → gelöscht → wieder a: Die Wiederherstellung nach Löschung ist
    // legitime Arbeit, keine Rückrolle eines anderen Agenten.
    let _ = stand.tick_werten(
        &tick(
            vec![JournalEintrag { pfad: "a.ts".into(), art: "neu".into(), zeilen_delta: 1 }],
            1,
            1,
        ),
        &bestand_mit("a.ts", 1, "AAA"),
    );
    let _ = stand.tick_werten(&tick(vec![geaendert("a.ts", 5)], 1, 6), &bestand_mit("a.ts", 6, "BBB"));
    let _ = stand.tick_werten(
        &tick(
            vec![JournalEintrag { pfad: "a.ts".into(), art: "entfernt".into(), zeilen_delta: -6 }],
            0,
            0,
        ),
        &HashMap::new(),
    );
    let befunde = stand.tick_werten(
        &tick(
            vec![JournalEintrag { pfad: "a.ts".into(), art: "neu".into(), zeilen_delta: 1 }],
            1,
            1,
        ),
        &bestand_mit("a.ts", 1, "AAA"),
    );
    pruefe(
        "Wiederherstellung nach Löschung ist keine Regression",
        !befunde.iter().any(|b| b.art == "regression"),
    );
}

#[test]
fn loeschsturm_eine_von_zehn_ist_keiner() {
    let mut stand = BeobachtungsStand::neu();
    // Eine von zehn Dateien: 10 % unter der 10-Datei-Grenze und (mit der
    // Grenz-Berichtigung) 10 % anteilig unter den 20 % – kein Sturm.
    let befunde = stand.tick_werten(
        &tick(
            vec![JournalEintrag { pfad: "eine.ts".into(), art: "entfernt".into(), zeilen_delta: -1 }],
            9,
            9,
        ),
        &HashMap::new(),
    );
    pruefe(
        "Einzellöschung ist kein Löschsturm",
        !befunde.iter().any(|b| b.art == "loeschsturm"),
    );
}

#[test]
fn loeschsturm_absolut_grenze_10_loest_aus() {
    let mut stand = BeobachtungsStand::neu();
    // Exakt 10 entfernte Dateien (Katalog-Grenze `loeschsturm_dateien`):
    // Schwere-3-Befund über die Absolut-Grenze, ohne Anteils-Auslösung.
    let befunde = stand.tick_werten(
        &tick(
            (0..10)
                .map(|index| JournalEintrag {
                    pfad: format!("weg{index}.ts"),
                    art: "entfernt".into(),
                    zeilen_delta: -1,
                })
                .collect(),
            0,
            0,
        ),
        &HashMap::new(),
    );
    pruefe(
        "Zehn gelöschte Dateien löst Löschsturm aus",
        befunde.iter().any(|b| b.art == "loeschsturm" && b.schwere == 3),
    );
}

#[test]
fn pendeln_erkennen_ohne_fortschritt() {
    let mut stand = BeobachtungsStand::neu();
    let mut letzter_befund = 0;
    // 12 Ticks: Zeilen pendeln 100 ↔ 90 und enden wieder bei 100 – das
    // Fenster beginnt und endet gleich, netto also null Fortschritt.
    // (Sonst wäre es konvergierende Arbeit, die zu Recht nicht meldet.)
    let folge: [usize; 12] = [100, 90, 100, 90, 100, 90, 100, 90, 100, 90, 100, 100];
    for (tick_index, &zeilen) in folge.iter().enumerate() {
        let delta: i64 = if tick_index == 0 {
            100 // Erstauftauchen der Datei im Fenster
        } else {
            zeilen as i64 - folge[tick_index - 1] as i64
        };
        let art = if tick_index == 0 { "neu" } else { "geaendert" };
        let befunde = stand.tick_werten(
            &tick(
                vec![JournalEintrag {
                    pfad: "wackler.ts".into(),
                    art: art.into(),
                    zeilen_delta: delta,
                }],
                5,
                zeilen,
            ),
            &bestand_mit("wackler.ts", zeilen, "p"),
        );
        if befunde.iter().any(|b| b.art == "pendeln") {
            letzter_befund += 1;
        }
    }
    pruefe("Pendeln im Fenster gemeldet", letzter_befund >= 1);
}

#[test]
fn differenzen_kohorte_ab_schwelle() {
    let mut stand = BeobachtungsStand::neu();
    let bestand = HashMap::from([
        ("ordner/a.rs".to_string(), BestandEintrag { zeilen: 10, hash: "A".into() }),
        ("ordner/b.rs".to_string(), BestandEintrag { zeilen: 10, hash: "B".into() }),
    ]);
    // Tick 1: a→b→a→b (3 Wechsel) — unter der Schwelle 6: stumm.
    let erste = stand.tick_werten(&tick(vec![geaendert("ordner/a.rs", 0), geaendert("ordner/b.rs", 0), geaendert("ordner/a.rs", 0), geaendert("ordner/b.rs", 0)], 2, 10), &bestand);
    pruefe("Drei Wechsel unter der Schwelle bleiben stumm", !erste.iter().any(|b| b.art == "differenzen"));
    // Tick 2: a→b→a — zusammen 6 Wechsel über die Tick-Grenze: Befund.
    let zweite = stand.tick_werten(&tick(vec![geaendert("ordner/a.rs", 0), geaendert("ordner/b.rs", 0), geaendert("ordner/a.rs", 0)], 2, 10), &bestand);
    pruefe(
        "Sechs Wechsel melden Differenzen (schwere 3)",
        zweite.iter().any(|b| b.art == "differenzen" && b.schwere == 3),
    );
}
