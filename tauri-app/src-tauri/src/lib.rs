//! Einstiegspunkt der PROPAKT-Anwendung.
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
mod live_kontext;
mod llm_bruecke;
mod paket;
mod kritik_regeln;
mod paketbasis;
pub mod paketkritik;
mod paketquellen;
mod pakettexte;
mod prozesse;
pub mod scan;
mod schema;
pub mod sprache;
pub mod zwischenspeicher;
mod tray;
mod update;
// Baustein-Kataloge: pub, weil sie der Spiegel zu packages/core/src/vertrag.ts
// sind und `npm run pruefen` sie als getrennte Paare liest – die Rust-Seite
// muss deshalb eigenständig benennbar bleiben.
pub mod vertrag;

/// Startet die Anwendung und registriert die Kommandos für das Frontend.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
                .plugin(tauri_plugin_dialog::init())
                .plugin(tauri_plugin_store::Builder::default().build())
                .setup(|app| {
            // Tray dauerhaft einrichten; ein Fehlschlag startet die App
            // trotzdem, der Live-Modus funktioniert dann ohne Tray.
            if let Err(fehler) = tray::init_tray(app.handle()) {
                eprintln!("Tray nicht verfügbar: {fehler}");
            }
            // Overlay hart auf 360×260 (logisch): `maximizable: false` blockt
            // den Nutzer-Klick, aber nicht programmatische Aufrufe. Der
            // Wächter rechnet die Sollgröße mit dem Skalierungsfaktor in
            // physische Pixel um — ein festes PhysicalSize würde auf
            // Skalierung-1,5-Displays das Fenster auf logisch 240×174
            // schrumpfen. Auch bei DPI-Wechsel (ScaleFactorChanged) nachziehen.
            if let Some(overlay) = app.get_webview_window("overlay") {
                let overlay_klon = overlay.clone();
                overlay.on_window_event(move |ereignis| match ereignis {
                    tauri::WindowEvent::Resized(_)
                    | tauri::WindowEvent::ScaleFactorChanged { .. } => {
                        let skala = overlay_klon
                            .scale_factor()
                            .unwrap_or(1.0);
                        let soll = tauri::PhysicalSize::new(
                            (360.0 * skala).round() as u32,
                            (260.0 * skala).round() as u32,
                        );
                        let ist = overlay_klon.inner_size().unwrap_or_default();
                        if (ist.width as i64 - soll.width as i64).abs() > 1
                            || (ist.height as i64 - soll.height as i64).abs() > 1
                        {
                            let _ = overlay_klon.unmaximize();
                            let _ = overlay_klon.set_size(soll);
                        }
                    }
                    _ => {}
                });
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
                    live_kommandos::live_status,
                    live_kontext::live_kontext_lesen,
                    llm_bruecke::llm_beratung
                ])
        .run(tauri::generate_context!())
        .expect("PROPAKT konnte nicht gestartet werden");
}
