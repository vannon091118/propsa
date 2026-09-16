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

/// Übersetzt einen git-Fehlertext in eine deutsche Meldung mit Lösungshinweis
/// (Spiegel zu `gitHinweis` in `src/update.ts`).
fn git_hinweis(args: &[&str], text: &str) -> String {
    if text.contains("ENOENT") || text.contains("not found") {
        return "Git ist nicht installiert oder nicht im PATH.\nLösung: Git installieren (https://git-scm.com) und erneut versuchen.".into();
    }
    if args.first() == Some(&"fetch") || args.first() == Some(&"pull") {
        if text.contains("No such remote") || text.contains("does not appear to be a git repository") {
            return "Kein Remote `origin` oder keine Verbindung zu ihm.\nLösung: `git remote add origin <url>` setzen oder Netzwerk/Anmeldung prüfen.".into();
        }
        if text.contains("Could not resolve host")
            || text.contains("Connection")
            || text.contains("authentication")
            || text.contains("Permission")
        {
            return "Fernquelle nicht erreichbar (Netzwerk oder Anmeldung).\nLösung: Internetverbindung und Git-Zugang prüfen, dann erneut versuchen.".into();
        }
    }
    if text.contains("Please commit") || text.contains("stash") || text.contains("would be overwritten") {
        return "Lokale Änderungen blockieren den Fast-Forward.\nLösung: Änderungen commiten (`git commit`) oder zur Seite legen (`git stash`), dann den Scan mit Update erneut ausführen.".into();
    }
    if text.contains("Diverging") || text.contains("not possible to fast-forward") {
        return "Lokaler Stand ist von origin/main abgezweigt (Divergenz).\nLösung: `git pull --rebase` ausführen oder den lokalen Stand verwerfen (`git reset --hard origin/main` – überschreibt lokale Commits!).".into();
    }
    format!("git {} fehlgeschlagen: {}", args.join(" "), text.trim())
}

fn git(wurzel: &PathBuf, args: &[&str]) -> Result<String, String> {
    let ausgabe = Command::new("git")
        .args(args)
        .current_dir(wurzel)
        .output()
        .map_err(|fehler| git_hinweis(args, &format!("ENOENT: {fehler}")))?;
    if !ausgabe.status.success() {
        return Err(git_hinweis(args, &String::from_utf8_lossy(&ausgabe.stderr)));
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
    // Vorab prüfen: lokale Änderungen blockieren den Fast-Forward.
    let schmutzig = git(&wurzel, &["status", "--porcelain"])?;
    if !schmutzig.is_empty() {
        return Err(git_hinweis(
            &["status"],
            "Please commit your changes or stash them before you merge.",
        ));
    }
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
