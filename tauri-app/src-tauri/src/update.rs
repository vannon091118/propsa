//! Git-basierte Selbstaktualisierung der App (Spiegel zu `src/update.ts`).
//!
//! Der Check holt den Stand der Fernquelle (`git fetch origin`) und vergleicht
//! den lokalen HEAD mit `origin/main`; der Update-Lauf übernimmt per
//! Fast-Forward und erneuert die Installation (`npm run installieren`).
//! Vertrag (Typen) lebt in `@propsa/core` (`update.ts`).

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::Emitter;

/// Wo liegt die Projekt-Wurzel relativ zur laufenden Exe?
///
/// In der Entwicklung: `tauri-app/src-tauri/target/(debug|release)/propsa.exe`
/// → drei Ebenen hoch. Als Fallback das Arbeitsverzeichnis.
fn projekt_wurzel() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        // target/<profil>/propsa.exe → drei Eltern hoch.
        if let Some(wurzel) = exe
            .parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
        {
            if wurzel.join("package.json").exists() {
                return wurzel.to_path_buf();
            }
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn git(wurzel: &PathBuf, args: &[&str]) -> Result<String, String> {
    let ausgabe = Command::new("git")
        .args(args)
        .current_dir(wurzel)
        .output()
        .map_err(|fehler| format!("git nicht startbar: {fehler}"))?;
    if !ausgabe.status.success() {
        let fehler = String::from_utf8_lossy(&ausgabe.stderr);
        return Err(format!("git {} fehlgeschlagen: {}", args.join(" "), fehler.trim()));
    }
    Ok(String::from_utf8_lossy(&ausgabe.stdout).trim().to_string())
}

/// Prüft auf Updates: fetch, dann Vergleich HEAD ↔ origin/main.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateCheck {
    pub erreichbar: bool,
    pub lokal: String,
    pub fern: String,
    pub update_verfuegbar: bool,
    pub fehler: Option<String>,
}

#[tauri::command]
pub fn update_check() -> Result<UpdateCheck, String> {
    let wurzel = projekt_wurzel();
    if let Err(fehler) = git(&wurzel, &["fetch", "origin", "--quiet"]) {
        return Ok(UpdateCheck {
            erreichbar: false,
            lokal: String::new(),
            fern: String::new(),
            update_verfuegbar: false,
            fehler: Some(fehler),
        });
    }
    let lokal = git(&wurzel, &["rev-parse", "HEAD"])?;
    let fern = git(&wurzel, &["rev-parse", "origin/main"])?;
    let kette = git(&wurzel, &["rev-list", &format!("{lokal}..{fern}")])?;
    Ok(UpdateCheck {
        erreichbar: true,
        lokal: lokal.chars().take(12).collect(),
        fern: fern.chars().take(12).collect(),
        update_verfuegbar: lokal != fern && !kette.is_empty(),
        fehler: None,
    })
}

/// Übernimmt neue Commits (fast-forward) und installiert neu.
#[tauri::command]
pub fn update_ausfuehren(app: tauri::AppHandle) -> Result<UpdateCheck, String> {
    let wurzel = projekt_wurzel();
    let _ = app.emit(
        "update-fortschritt",
        serde_json::json!({ "schritt": "uebernehmen", "text": "Übernehme Commits …" }),
    );
    git(&wurzel, &["pull", "--ff-only", "origin", "main", "--quiet"])?;
    let lokal = git(&wurzel, &["rev-parse", "HEAD"])?;
    let _ = app.emit(
        "update-fortschritt",
        serde_json::json!({ "schritt": "installieren", "text": "Installiere neu …" }),
    );
    // Windows: npm ist eine .cmd — ohne shell findet Command sie nicht.
    #[cfg(windows)]
    let status = Command::new("cmd")
        .args(["/C", "npm", "run", "installieren", "--silent"])
        .current_dir(&wurzel)
        .status();
    #[cfg(not(windows))]
    let status = Command::new("npm")
        .args(["run", "installieren", "--silent"])
        .current_dir(&wurzel)
        .status();
    status
        .map_err(|fehler| format!("npm nicht startbar: {fehler}"))?
        .success()
        .then_some(())
        .ok_or_else(|| "Installation fehlgeschlagen".to_string())?;
    let _ = app.emit(
        "update-fortschritt",
        serde_json::json!({ "schritt": "fertig", "text": "Aktualisiert." }),
    );
    Ok(UpdateCheck {
        erreichbar: true,
        lokal: lokal.chars().take(12).collect(),
        fern: lokal.chars().take(12).collect(),
        update_verfuegbar: false,
        fehler: None,
    })
}
