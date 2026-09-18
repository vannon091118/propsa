//! Liest die Architektur-Dokumentation eines Projekts für den LLM-Kontext.
//! Dateien: AGENTS.md, ARCHITECTURE.md, CLAUDE.md (wenn vorhanden).

use std::path::PathBuf;

#[tauri::command]
pub fn live_kontext_lesen(pfad: String) -> Result<String, String> {
    let basis = PathBuf::from(&pfad);
    let kandidaten = ["AGENTS.md", "ARCHITECTURE.md", "CLAUDE.md"];
    let mut teile: Vec<String> = Vec::new();

    for name in &kandidaten {
        let datei = basis.join(name);
        if let Ok(inhalt) = std::fs::read_to_string(&datei) {
            if !inhalt.trim().is_empty() {
                teile.push(format!("# {name}\n\n{inhalt}"));
            }
        }
    }

    if teile.is_empty() {
        return Err(format!(
            "Keine Architektur-Doku gefunden in {pfad} \
             (AGENTS.md, ARCHITECTURE.md oder CLAUDE.md erwartet)"
        ));
    }

    Ok(teile.join("\n\n---\n\n"))
}