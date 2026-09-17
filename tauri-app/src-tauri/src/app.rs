use tauri::Manager;
use std::env;
use std::fs;
use crate::history::{self, ProjektMetriken};
use crate::live_zeitreihe::ZeitreihePunkt;
use crate::live_store;

/// Returns the application version from Cargo.toml.
#[tauri::command]
pub fn fetch_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Returns the changelog text from the bundled resources.
#[tauri::command]
pub fn fetch_changelog(app_handle: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app_handle
        .path()
        .resolve("Changelog.md", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve changelog path: {e}"))?;

    fs::read_to_string(&resource_path)
        .map_err(|e| format!("Failed to read changelog at {:?}: {e}", resource_path))
}

/// Returns the historical metrics for a project identity.
#[tauri::command]
pub fn get_history_metrics(identitaet: String) -> Vec<(String, ProjektMetriken)> {
    history::get_metrik_historie(&identitaet)
}

/// Live-Zeitreihe (Phase 4): Snapshots aus `~/.propsa/live/<identitaet>.db`
/// als Graph-Punkte. `stunden` begrenzt den Zeitraum (`None` = alles);
/// fehlende Datenbank ergibt eine leere Serie, kein Fehler.
#[tauri::command]
pub fn get_live_zeitreihe(
    identitaet: String,
    stunden: Option<f64>,
) -> Vec<ZeitreihePunkt> {
    let pfad = live_store::db_pfad(&identitaet);
    if !pfad.exists() {
        return Vec::new();
    }
    match live_store::oeffne_db(&pfad) {
        Ok(verbindung) => crate::live_zeitreihe::zeitreihe_lesen(&verbindung, stunden)
            .unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}
