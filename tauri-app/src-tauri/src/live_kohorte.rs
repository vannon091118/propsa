//! Differenzen-Regel des Detektors: abwechselnde Änderungen zweier
//! Dateien derselben Kohorte (gleicher Ordner).
//!
//! Typisch für zwei Agenten, die abwechselnd dieselben Dateien
//! überschreiben und sich gegenseitig die Arbeit zertreten: A ändert,
//! B ändert zurück, A wieder — ohne dass je Ruhe dazwischen liegt.
//! Erkennung: In den letzten `differenzen_fenster` Ticks genügend reine
//! Wechsel (`differenzen_alternationen`) zwischen zwei Dateien desselben
//! Ordners. Nur Inhaltsänderungen (`geaendert`) zählen; Neu/Entfernt sind
//! Kohorten-Ereignisse, aber keine Zertrittenheit.
//!
//! Umsetzungsplan: `docs/wiki/Live-Modus-Plan.md` (Phase 2+).

use crate::live_store::JournalEintrag;

/// Ordner eines Pfads (alles vor dem letzten `/`; ohne `/` leer).
fn ordner(pfad: &str) -> &str {
    match pfad.rfind('/') {
        Some(i) => &pfad[..i],
        None => "",
    }
}

/// Wechselstationen pro Kohorte (Ordner): Aufeinanderfolgende Änderungen
/// am selben Pfad sind eine Station, jeder echte Pfadwechsel zählt als
/// weitere. Verschränkte Kohorten stören sich nicht (je Kohorte eigenes
/// Gedächtnis). Liefert je Kohorte die Zahl der Wechsel-Kanten.
fn wechsel_je_kohorte(journal: &[JournalEintrag], fenster: usize) -> Vec<(String, usize)> {
    let start = journal.len().saturating_sub(fenster);
    let mut folgen: Vec<(String, String, usize)> = Vec::new(); // (Ordner, letzter Pfad, Wechsel)

    for eintrag in &journal[start..] {
        if eintrag.art != "geaendert" {
            continue;
        }
        let kohorte = ordner(&eintrag.pfad).to_string();
        match folgen.iter_mut().find(|(o, _, _)| *o == kohorte) {
            Some((_, pfad, wechsel)) => {
                if *pfad != eintrag.pfad {
                    *pfad = eintrag.pfad.clone();
                    *wechsel += 1;
                }
            }
            None => folgen.push((kohorte, eintrag.pfad.clone(), 0)),
        }
    }
    folgen
        .into_iter()
        .map(|(kohorte, _, wechsel)| (kohorte, wechsel))
        .collect()
}

/// Prüft auf Differenzen: Mindestens `schwelle_alternationen` Wechsel
/// zwischen Dateien desselben Ordners im Fenster `fenster`.
pub fn differenzen_befund(
    journal: &[JournalEintrag],
    schwelle_alternationen: usize,
    fenster: usize,
) -> bool {
    wechsel_je_kohorte(journal, fenster)
        .iter()
        .any(|(_, wechsel)| *wechsel >= schwelle_alternationen)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn geaendert(pfad: &str) -> JournalEintrag {
        JournalEintrag {
            pfad: pfad.to_string(),
            art: "geaendert".to_string(),
            zeilen_delta: 1,
        }
    }

    #[test]
    fn nichts_im_leeren_journal() {
        assert!(!differenzen_befund(&[], 6, 12));
    }

    #[test]
    fn unter_schwelle_kein_befund() {
        // 5 Wechsel a↔b — eine unter der Schwelle 6.
        let journal: Vec<JournalEintrag> = (0..6)
            .map(|i| {
                if i % 2 == 0 {
                    geaendert("ordner/a.rs")
                } else {
                    geaendert("ordner/b.rs")
                }
            })
            .collect();
        assert!(!differenzen_befund(&journal, 6, 12));
    }

    #[test]
    fn ab_schwelle_befund() {
        // 6 Wechsel a↔b — genau die Schwelle.
        let journal: Vec<JournalEintrag> = (0..7)
            .map(|i| {
                if i % 2 == 0 {
                    geaendert("ordner/a.rs")
                } else {
                    geaendert("ordner/b.rs")
                }
            })
            .collect();
        assert!(differenzen_befund(&journal, 6, 12));
    }

    #[test]
    fn verschiedene_ordner_sind_keine_kohorte() {
        // a.rs und b.rs in verschiedenen Ordnern — keine gemeinsame Kohorte.
        let journal: Vec<JournalEintrag> = (0..7)
            .map(|i| {
                if i % 2 == 0 {
                    geaendert("ordner-a/a.rs")
                } else {
                    geaendert("ordner-b/b.rs")
                }
            })
            .collect();
        assert!(!differenzen_befund(&journal, 6, 12));
    }

    #[test]
    fn gleiche_datei_zaehlt_als_eine_station() {
        // 6× dieselbe Datei hintereinander ist Flattern, kein Pfadwechsel.
        let journal: Vec<JournalEintrag> =
            (0..6).map(|_| geaendert("ordner/a.rs")).collect();
        assert!(!differenzen_befund(&journal, 6, 12));
    }

    #[test]
    fn alte_ticks_fallen_aus_dem_fenster() {
        // 6 Wechsel, aber das Fenster 3 zeigt nur die letzten 3 Stationen.
        let journal: Vec<JournalEintrag> = (0..7)
            .map(|i| {
                if i % 2 == 0 {
                    geaendert("ordner/a.rs")
                } else {
                    geaendert("ordner/b.rs")
                }
            })
            .collect();
        assert!(!differenzen_befund(&journal, 6, 3));
    }

    #[test]
    fn neu_und_entfernt_sind_keine_wechsel() {
        // Neu/Entfernt-Wechsel sind Kohorten-Ereignisse, keine Zertrittenheit.
        let journal: Vec<JournalEintrag> = (0..6)
            .map(|i| JournalEintrag {
                pfad: if i % 2 == 0 {
                    "ordner/a.rs".to_string()
                } else {
                    "ordner/b.rs".to_string()
                },
                art: if i % 2 == 0 { "neu" } else { "entfernt" }.to_string(),
                zeilen_delta: 0,
            })
            .collect();
        assert!(!differenzen_befund(&journal, 2, 12));
    }
}
