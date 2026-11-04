//! Regeln der Kritik-Linse: Schwellwerte und Prädikate.

pub const GOD_GRENZE: usize = 300;

pub const DOMAENEN: &[&str] = &[
    "src/components",
    "src/simulation",
    "src/render",
    "src/bus",
    "src/persistence",
];

pub fn prozent(teil: usize, gesamt: usize) -> String {
    let b = if gesamt == 0 { 1 } else { gesamt };
    format!("{} %", ((teil as f64 / b as f64) * 100.0).round() as usize)
}

pub fn artefakt_muster(pfad: &str) -> Option<&'static str> {
    if pfad == "context.md" || pfad.ends_with("/context.md") {
        return Some("context.md");
    }
    if pfad == "context.json" || pfad.ends_with("/context.json") {
        return Some("context.json");
    }
    if pfad.ends_with("package-lock.json") {
        return Some("package-lock.json");
    }
    if pfad.ends_with(".tsbuildinfo") {
        return Some("*.tsbuildinfo");
    }
    if pfad.ends_with(".bak") {
        return Some("*.bak");
    }
    if pfad.contains("playwright-report/") {
        return Some("playwright-report/**");
    }
    if pfad.contains("test-results/") {
        return Some("test-results/**");
    }
    if pfad.contains("git-noir/.tmp/") {
        return Some("git-noir/.tmp/**");
    }
    if pfad.contains("/.tmp/") {
        return Some(".tmp/**");
    }
    None
}

pub fn datei_domain(pfad: &str) -> Option<&'static str> {
    for d in DOMAENEN {
        if pfad == *d || pfad.starts_with(&format!("{}/", d)) {
            return Some(d);
        }
    }
    None
}

pub fn import_domain(spec: &str) -> Option<&'static str> {
    for d in DOMAENEN {
        let kurz = d.split('/').next_back().unwrap_or(d);
        if spec.contains(*d)
            || spec.contains(&format!("/{}/", kurz))
            || spec.contains(&format!("{}/", kurz))
        {
            return Some(d);
        }
    }
    None
}


/// Expands simple and nested brace lists used to abbreviate file paths.
pub fn klammer_pfade_erweitern(pfad: &str) -> Vec<String> {
    let Some(start) = pfad.find('{') else { return vec![pfad.to_string()]; };
    let Some(rel_ende) = pfad[start + 1..].find('}') else { return vec![pfad.to_string()]; };
    let ende = start + 1 + rel_ende;
    let varianten: Vec<&str> = pfad[start + 1..ende].split(',').collect();
    if varianten.len() < 2 { return vec![pfad.to_string()]; }
    varianten.into_iter().flat_map(|variante| {
        let erweitert = format!("{}{}{}", &pfad[..start], variante, &pfad[ende + 1..]);
        klammer_pfade_erweitern(&erweitert)
    }).collect()
}
