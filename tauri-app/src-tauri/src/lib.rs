//! Einstiegspunkt der PROPSA-Anwendung.
//!
//! Die eigentliche Arbeit liegt in Modulen (ein Besitzer je Aufgabe):
//! `scan` (Verzeichnis-Scan mit Filtern/Limits), `domaene` (Aufteilung des
//! Pakets nach Domänen), `paketbasis`/`pakettexte`/`paketquellen` (Texte des
//! Pakets), `paket` (Schreiben in einen Ordner), `schema` (JSON-Vertrag) und
//! `sprache` (Sprach- und Fence-Mapping).

mod app;
mod domaene;
// filter ist pub, damit die Integrationstests Kandidaten für die
// Zwischenspeicher-Signatur bauen können (gleiche Begründung wie scan).
pub mod filter;
mod filterignore;
mod fortschritt;
// history, paketkritik und scan sind pub, damit die Integrationstests
// (tests/) die Typen und Funktionen direkt prüfen können.
pub mod history;
// Live-Modus: pub, damit die Integrationstests (tests/) den Tick-Kern,
// die Anomalie-Erkennung und die Persistenz direkt prüfen können.
pub mod live_anomalie;
pub mod live_bremse;
mod live_kohorte;
pub mod live_kommandos;
pub mod live_store;
pub mod live_takt;
pub mod live_zyklus;
pub mod live_zeitreihe;
mod paket;
mod kritik_regeln;
mod paketbasis;
pub mod paketkritik;
mod paketquellen;
mod pakettexte;
pub mod scan;mod schema;
pub mod sprache;
pub mod zwischenspeicher;
mod tray;
mod update;

/// Startet die Anwendung und registriert die Kommandos für das Frontend.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Tray dauerhaft einrichten; ein Fehlschlag startet die App
            // trotzdem, der Live-Modus funktioniert dann ohne Tray.
            if let Err(fehler) = tray::init_tray(app.handle()) {
                eprintln!("Tray nicht verfügbar: {fehler}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan::scan,
            paket::paket_schreiben,
            update::update_check,
            update::update_ausfuehren,
            app::fetch_version,
            app::fetch_changelog,
            app::get_history_metrics,
            app::get_live_zeitreihe,
            live_kommandos::live_start,
            live_kommandos::live_stop,
            live_kommandos::live_status
        ])
        .run(tauri::generate_context!())
        .expect("PROPSA konnte nicht gestartet werden");
}
