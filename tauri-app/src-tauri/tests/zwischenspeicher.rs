//! Integrationstests des Scan-Zwischenspeichers (Rust-Spiegel).
//!
//! Gegenstück: `src-tauri/src/zwischenspeicher.rs`, Vertrag:
//! `@propakt/core` (`zwischenspeicher.ts`). Geprüft wird der volle
//! Lifecycle — und bewusst auch der Tamper-Fall: Ein manipulierter
//! Cache darf niemals als „unverändert“ durchgehen (Fail Loud).

use propakt_lib::filter::Kandidat;
use propakt_lib::scan::{DateiInfo, ScanErgebnis};
use propakt_lib::zwischenspeicher::{
    baum_eintraege, baum_signatur, cache_laden, cache_ordner, cache_pfad, cache_speichern,
    cache_treffer, gleiche_signatur, konfigurations_schluessel, ZWISCHENSPEICHER_SCHEMA,
    ZWISCHENSPEICHER_VERSION,
};
use std::fs;
use std::path::{Path, PathBuf};

fn pruefe(name: &str, bedingung: bool) {
    println!("{} {name}", if bedingung { "PASS" } else { "FAIL" });
    if !bedingung {
        std::process::exit(1);
    }
}

/// Eine Datei des Wegwerf-Projekts: schreiben und als Kandidat melden.
fn kandidat_in(basis: &Path, relativer_pfad: &str, inhalt: &str) -> Kandidat {
    let absoluter = basis.join(relativer_pfad);
    if let Some(eltern) = absoluter.parent() {
        fs::create_dir_all(eltern).expect("Projektordner");
    }
    fs::write(&absoluter, inhalt).expect("Datei schreiben");
    Kandidat {
        absoluter_pfad: absoluter,
        relativer_pfad: relativer_pfad.to_string(),
    }
}

/// Kleines Ergebnis, das zur Signatur passt (Integritätsregel erfüllt).
fn ergebnis_fuer(kandidaten: &[Kandidat]) -> ScanErgebnis {
    let dateien: Vec<DateiInfo> = kandidaten
        .iter()
        .map(|k| DateiInfo {
            relativer_pfad: k.relativer_pfad.clone(),
            zeilen: 3,
            zeichen: 30,
            inhalt: "export const a = 1;\n".repeat(3),
            sprache: "TypeScript".to_string(),
        })
        .collect();
    ScanErgebnis {
        titel: "Wegwerf-Projekt".to_string(),
        zeitstempel: "2026-09-17 12:00:00".to_string(),
        identitaet: "test-identitaet".to_string(),
        gesamt_zeilen: dateien.len() * 3,
        gesamt_zeichen: dateien.len() * 90,
        dateien,
        uebersprungen: 0,
        delta_info: None,
    }
}

/// Wegwerf-Projekt: TempDir **und** Basis-Pfad. Das TempDir wird als
/// Eigentum zurückgegeben, damit es nicht vor den Schreibvorgängen gelöscht
/// wird (der klassische TempDir-Fehler).
fn wegwerf_projekt() -> (tempfile::TempDir, PathBuf) {
    let ordner = tempfile::tempdir().expect("TempDir");
    let basis = ordner.path().to_path_buf();
    (ordner, basis)
}

#[test]
fn schluessel_und_pfad_sind_stabil() {
    let (_projekt, basis) = wegwerf_projekt();
    let excludes = vec!["node_modules".to_string()];
    let includes: Vec<String> = vec![];
    let erster = konfigurations_schluessel(&basis, &excludes, &includes, None, None);
    let zweiter = konfigurations_schluessel(&basis, &excludes, &includes, None, None);
    pruefe("Gleiche Konfiguration ⇒ gleicher Schlüssel", erster == zweiter);

    let anderer = konfigurations_schluessel(&basis, &includes, &excludes, None, None);
    pruefe("Gedrehte Muster ⇒ anderer Schlüssel", erster != anderer);

    let mit_limit =
        konfigurations_schluessel(&basis, &excludes, &includes, Some(10), None);
    pruefe("Limit gehört zum Schlüssel", erster != mit_limit);

    let pfad = cache_pfad(Path::new("/x"), &erster);
    let text = pfad.to_string_lossy().replace('\\', "/");
    pruefe("Cache-Datei liegt als sha256.json", text.ends_with(".json") && text.contains("/x/"));
}

#[test]
fn signatur_ist_ordnungsunabhaengig() {
    let (_projekt, basis) = wegwerf_projekt();
    let a = kandidat_in(&basis, "a.ts", "export const a = 1;\n");
    let b = kandidat_in(&basis, "b.ts", "export const b = 2;\n");

    let vorwaerts = baum_eintraege(&[a.clone(), b.clone()]).expect("Signatur");
    let rueckwaerts = baum_eintraege(&[b, a]).expect("Signatur");
    pruefe(
        "Gleicher Baum in anderer Reihenfolge ⇒ deckungsgleich",
        gleiche_signatur(&vorwaerts, &rueckwaerts),
    );

    let normalisiert = baum_signatur(vorwaerts);
    pruefe(
        "Normalisierte Signatur ist nach Pfad sortiert",
        normalisiert.windows(2).all(|fenster| fenster[0].relativer_pfad <= fenster[1].relativer_pfad),
    );
}

#[test]
fn signatur_sieht_aenderung() {
    let (_projekt, basis) = wegwerf_projekt();
    let pfad = basis.join("a.ts");
    fs::write(&pfad, "export const a = 1;\n").expect("a.ts");
    let kandidat = Kandidat {
        absoluter_pfad: pfad.clone(),
        relativer_pfad: "a.ts".to_string(),
    };
    let vorher = baum_eintraege(&[kandidat.clone()]).expect("Signatur");

    // Größe ändern (mtime kann auflösen; die Größe nie).
    fs::write(&pfad, "export const a = 12;\n").expect("a.ts größer");
    let nachher = baum_eintraege(&[kandidat]).expect("Signatur");
    pruefe(
        "Geänderte Datei ⇒ andere Signatur",
        !gleiche_signatur(&vorher, &nachher),
    );

    // Neue Datei ⇒ längere Signatur.
    let mehr = baum_eintraege(&[
        Kandidat {
            absoluter_pfad: pfad.clone(),
            relativer_pfad: "a.ts".to_string(),
        },
        Kandidat {
            absoluter_pfad: basis.join("neu.ts"),
            relativer_pfad: "neu.ts".to_string(),
        },
    ]);
    // Datei existiert hier nicht ⇒ Fehler ist der korrekte Fail-Loud-Weg.
    pruefe("Fehlende Metadaten ⇒ kein Signatur-Ergebnis", mehr.is_err());
}

#[test]
fn voller_lifecycle_mit_treffer() {
    let (_projekt, basis) = wegwerf_projekt();
    let ordner = tempfile::tempdir().expect("Cache-Dir");
    let cache = ordner.path().to_path_buf();
    let kandidaten = vec![
        kandidat_in(&basis, "a.ts", "export const a = 1;\n"),
        kandidat_in(&basis, "ordner/b.ts", "export const b = 2;\n"),
    ];
    let signatur = baum_eintraege(&kandidaten).expect("Signatur");
    let schluessel = konfigurations_schluessel(&basis, &[], &[], None, None);

    pruefe("Leerer Cache ⇒ kein Treffer", cache_laden(&cache, &schluessel).is_none());

    let ergebnis = ergebnis_fuer(&kandidaten);
    cache_speichern(&cache, &schluessel, signatur.clone(), &ergebnis)
        .expect("Cache schreiben");
    pruefe(
        "Cache-Datei existiert",
        cache_pfad(&cache, &schluessel).exists(),
    );

    let geladen = cache_laden(&cache, &schluessel);
    pruefe("Gespeicherter Eintrag lesbar", geladen.is_some());
    let treffer = cache_treffer(geladen, &signatur);
    pruefe("Unveränderter Baum ⇒ Treffer", treffer.is_some());
    let treffer = treffer.expect("Treffer");
    pruefe(
        "Treffer trägt das gespeicherte Ergebnis",
        treffer.dateien.len() == ergebnis.dateien.len()
            && treffer.dateien[0].relativer_pfad == ergebnis.dateien[0].relativer_pfad,
    );
    // Identität/Zeitstempel bleiben aus dem Speicher; der Aufrufer frischt
    // sie an — das prüft `scan.rs`, hier der Vertrags-Wortlaut:
    pruefe(
        "Treffer behält Lauf-Zeitstempel",
        treffer.zeitstempel == ergebnis.zeitstempel,
    );
}

#[test]
fn tamper_wird_nicht_durchgelassen() {
    let (_projekt, basis) = wegwerf_projekt();
    let ordner = tempfile::tempdir().expect("Cache-Dir");
    let cache = ordner.path().to_path_buf();
    let kandidaten = vec![kandidat_in(&basis, "a.ts", "export const a = 1;\n")];
    let signatur = baum_eintraege(&kandidaten).expect("Signatur");
    let schluessel = konfigurations_schluessel(&basis, &[], &[], None, None);
    cache_speichern(&cache, &schluessel, signatur.clone(), &ergebnis_fuer(&kandidaten))
        .expect("Cache schreiben");
    let pfad = cache_pfad(&cache, &schluessel);

    // a) Schema-Feld vertauscht.
    let text = fs::read_to_string(&pfad).expect("Cache lesen");
    let verdreht = text.replace(ZWISCHENSPEICHER_SCHEMA, "falsches-schema");
    fs::write(&pfad, verdreht).expect("Cache manipulieren");
    pruefe(
        "Fremdes Schema ⇒ kein Treffer",
        cache_treffer(cache_laden(&cache, &schluessel), &signatur).is_none(),
    );

    // b) Version erhöht ⇒ Formatwechsel, kein Treffer.
    let text = fs::read_to_string(&pfad).expect("Cache lesen");
    let erhoeht = text.replace(
        &format!("\"version\":{ZWISCHENSPEICHER_VERSION}"),
        &format!("\"version\":{}", ZWISCHENSPEICHER_VERSION + 1),
    );
    fs::write(&pfad, erhoeht).expect("Cache manipulieren");
    pruefe(
        "Fremde Version ⇒ kein Treffer",
        cache_treffer(cache_laden(&cache, &schluessel), &signatur).is_none(),
    );

    // c) Ergebnis-Inhalt manipuliert (Datei entfernt) ⇒ Integritätsregel.
    let text = fs::read_to_string(&pfad).expect("Cache lesen");
    let roh: serde_json::Value = serde_json::from_str(&text).expect("Cache-JSON");
    let mut gefaelscht = roh.clone();
    gefaelscht["ergebnis"]["dateien"] = serde_json::Value::Array(vec![]);
    fs::write(&pfad, serde_json::to_string(&gefaelscht).expect("JSON")).expect("Cache manipulieren");
    pruefe(
        "Ergebnis ohne Dateien bei signiertem Baum ⇒ kein Treffer",
        cache_treffer(cache_laden(&cache, &schluessel), &signatur).is_none(),
    );

    // d) Pfad in der Signatur geändert ⇒ nicht deckungsgleich.
    let mut gefaelscht = roh.clone();
    gefaelscht["signatur"][0]["relativer_pfad"] = serde_json::json!("anders.ts");
    fs::write(&pfad, serde_json::to_string(&gefaelscht).expect("JSON")).expect("Cache manipulieren");
    pruefe(
        "Geänderter Signatur-Pfad ⇒ kein Treffer",
        cache_treffer(cache_laden(&cache, &schluessel), &signatur).is_none(),
    );

    // e) Größe in der Signatur geändert ⇒ nicht deckungsgleich.
    let mut gefaelscht = roh;
    gefaelscht["signatur"][0]["groesse"] = serde_json::json!(999999);
    fs::write(&pfad, serde_json::to_string(&gefaelscht).expect("JSON")).expect("Cache manipulieren");
    pruefe(
        "Geänderte Signatur-Größe ⇒ kein Treffer",
        cache_treffer(cache_laden(&cache, &schluessel), &signatur).is_none(),
    );
}

#[test]
fn baum_aenderung_ungueltigt_cache() {
    let (_projekt, basis) = wegwerf_projekt();
    let ordner = tempfile::tempdir().expect("Cache-Dir");
    let cache = ordner.path().to_path_buf();
    let kandidaten = vec![kandidat_in(&basis, "a.ts", "export const a = 1;\n")];
    let signatur = baum_eintraege(&kandidaten).expect("Signatur");
    let schluessel = konfigurations_schluessel(&basis, &[], &[], None, None);
    cache_speichern(&cache, &schluessel, signatur, &ergebnis_fuer(&kandidaten))
        .expect("Cache schreiben");

    // Projekt wächst: echte Änderung im Baum, gleicher Schlüssel.
    let zweiter = kandidat_in(&basis, "b.ts", "export const b = 2;\n");
    let mut neu = vec![
        Kandidat {
            absoluter_pfad: basis.join("a.ts"),
            relativer_pfad: "a.ts".to_string(),
        },
        zweiter,
    ];
    neu.sort_by(|l, r| l.relativer_pfad.cmp(&r.relativer_pfad));
    let neue_signatur = baum_eintraege(&neu).expect("Signatur");
    let geladen = cache_laden(&cache, &schluessel);
    pruefe(
        "Gewachsener Baum ⇒ kein Treffer",
        cache_treffer(geladen, &neue_signatur).is_none(),
    );
}

#[test]
fn cache_ordner_liegt_unter_propakt_heim() {
    let ordner = cache_ordner();
    let text = ordner.to_string_lossy().replace('\\', "/");
    pruefe(
        "Cache-Ordner ist ~/.propakt/cache",
        text.ends_with("/.propakt/cache"),
    );
}
