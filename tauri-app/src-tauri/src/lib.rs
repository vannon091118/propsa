//! Einstiegspunkt der PROPSA-Anwendung.
//!
//! Die eigentliche Arbeit liegt in Modulen (ein Besitzer je Aufgabe):
//! `scan` (Verzeichnis-Scan mit Filtern/Limits), `domaene` (Aufteilung des
//! Pakets nach Domänen), `paketbasis`/`pakettexte`/`paketquellen` (Texte des
//! Pakets), `paket` (Schreiben in einen Ordner), `schema` (JSON-Vertrag) und
//! `sprache` (Sprach- und Fence-Mapping).

mod domaene;
mod filter;
mod filterignore;
mod fortschritt;
mod history;
mod paket;
mod kritik_regeln;
mod paketbasis;
mod paketkritik;
mod paketquellen;
mod pakettexte;
mod scan;
mod schema;
mod sprache;

/// Startet die Anwendung und registriert die Kommandos für das Frontend.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan::scan,
            paket::paket_schreiben
        ])
        .run(tauri::generate_context!())
        .expect("PROPSA konnte nicht gestartet werden");
}
