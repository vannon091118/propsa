//! Regeln der Kritik-Linse: Schwellwerte und Prädikate.

pub const GOD_GRENZE: usize = 300;

// Conventional source containers are roots; module names come from scanned paths.
pub const QUELLWURZELN: &[&str] = &[
    "src", "app", "lib", "source", "modules", "packages", "server", "client",
];
const NICHT_QUELLSPRACHEN: &[&str] = &[
    "Markdown", "JSON", "YAML", "TOML", "Text", "XML", "HTML", "CSV", "INI",
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

fn quellwurzel(name: &str) -> bool {
    let klein = name.to_ascii_lowercase();
    QUELLWURZELN.iter().any(|w| *w == klein.as_str())
}

fn pfad_segmente(pfad: &str) -> Vec<String> {
    pfad.replace('\\', "/")
        .split('/')
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .collect()
}

pub fn datei_domain(pfad: &str, sprache: &str) -> Option<String> {
    if NICHT_QUELLSPRACHEN.iter().any(|s| *s == sprache) {
        return None;
    }
    let teile = pfad_segmente(pfad);
    if teile.len() < 2 {
        return None;
    }
    if quellwurzel(&teile[0]) {
        return Some(if teile.len() >= 3 {
            format!("{}/{}", teile[0], teile[1])
        } else {
            teile[0].clone()
        });
    }
    if teile.len() >= 3 && quellwurzel(&teile[1]) {
        return Some(format!("{}/{}", teile[0], teile[1]));
    }
    Some(teile[0].clone())
}

fn domain_fuer_pfad<'a>(pfad: &str, domaenen: &'a [String]) -> Option<&'a String> {
    let mut treffer: Vec<&String> = domaenen
        .iter()
        .filter(|d| pfad == d.as_str() || pfad.starts_with(&format!("{}/", d)))
        .collect();
    treffer.sort_by_key(|d| std::cmp::Reverse(d.len()));
    if treffer.is_empty() {
        return None;
    }
    if treffer.len() > 1 && treffer[0].len() == treffer[1].len() {
        return None;
    }
    treffer.into_iter().next()
}

fn relativen_import_aufloesen(importer: &str, spec: &str) -> String {
    let mut teile = pfad_segmente(importer);
    teile.pop();
    for teil in spec.replace('\\', "/").split('/') {
        match teil {
            "" | "." => {},
            ".." => { teile.pop(); },
            wert => teile.push(wert.to_string()),
        }
    }
    teile.join("/")
}

pub fn import_domain(spec: &str, importer: &str, domaenen: &[String]) -> Option<String> {
    let muster = spec.replace('\\', "/");
    if muster.starts_with("./") || muster.starts_with("../") {
        return domain_fuer_pfad(&relativen_import_aufloesen(importer, &muster), domaenen).cloned();
    }
    if muster.starts_with("@/") || muster.starts_with("~/") {
        let rest = &muster[2..];
        let mut treffer = std::collections::BTreeSet::new();
        for wurzel in QUELLWURZELN {
            if let Some(domain) = domain_fuer_pfad(&format!("{}/{}", wurzel, rest), domaenen) {
                treffer.insert(domain.clone());
            }
        }
        return if treffer.len() == 1 { treffer.into_iter().next() } else { None };
    }
    if muster.starts_with('/') {
        return domain_fuer_pfad(muster.trim_start_matches('/'), domaenen).cloned();
    }
    if QUELLWURZELN.iter().any(|w| muster.starts_with(&format!("{}/", w))) {
        return domain_fuer_pfad(&muster, domaenen).cloned();
    }
    None
}

pub fn ist_lokaler_import(spec: &str) -> bool {
    let muster = spec.replace('\\', "/");
    muster.starts_with("./") || muster.starts_with("../") ||
        muster.starts_with("@/") || muster.starts_with("~/") || muster.starts_with('/') ||
        QUELLWURZELN.iter().any(|w| muster.starts_with(&format!("{}/", w)))
}


/// Expands simple and nested brace lists in documentation file references.
pub fn klammer_pfade_erweitern(pfad: &str) -> Vec<String> {
    let Some(start) = pfad.find('{') else {
        return vec![pfad.to_string()];
    };
    let Some(rel_ende) = pfad[start + 1..].find('}') else {
        return vec![pfad.to_string()];
    };
    let ende = start + 1 + rel_ende;
    let varianten: Vec<&str> = pfad[start + 1..ende].split(',').collect();
    if varianten.len() < 2 {
        return vec![pfad.to_string()];
    }
    varianten
        .into_iter()
        .flat_map(|variante| {
            let erweitert = format!("{}{}{}", &pfad[..start], variante, &pfad[ende + 1..]);
            klammer_pfade_erweitern(&erweitert)
        })
        .collect()
}
