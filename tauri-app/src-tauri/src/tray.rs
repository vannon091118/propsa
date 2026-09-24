//! Tray-Icon des Live-Modus (Phase 3): dauerhaft im Hintergrund, auch wenn
//! das Hauptfenster geschlossen wird.
//!
//! Aufgaben laut Plan (`docs/wiki/Live-Modus-Plan.md`):
//! - Menü: App öffnen, Live-Widget zeigen, Einstellungen, Live-Zyklus
//!   beenden, Beenden.
//! - `forward_to_overlay`: holt das Overlay-Fenster einmalig nach vorn –
//!   nur für schwere Befunde (Schwere 3), nie dauerhaft always-on-top.
//! - `alarm_melden`: dezent, aber bemerkbar – der Tray-Tooltip trägt den
//!   Befundtext, bis die Beruhigung (nächster ruhiger Tick) ihn löscht.
//!
//! Ein fehlendes Fenster oder Tray ist hier kein Fehler: Die Wächter
//! kehren mit `Ok`/`false` zurück, damit der Live-Zyklus im Tray-Betrieb
//! nie an der Oberfläche stirbt (Fail Loud gilt für Daten, nicht für
//! fehlende Empfänger).

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::Emitter;
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

/// Kennung des Tray-Icons (für spätere Zustands-Änderungen).
const TRAY_ID: &str = "propakt-tray";

/// Kennung des Overlay-Fensters (wie in `tauri.conf.json`).
const OVERLAY_LABEL: &str = "overlay";

/// Tray-Icon und Menü einrichten. Genau einmal beim Start aufrufen.
pub fn init_tray(app: &AppHandle) -> Result<(), String> {
    let oeffnen = MenuItemBuilder::with_id("oeffnen", "PROPAKT öffnen")
        .build(app)
        .map_err(|fehler| format!("Menüpunkt nicht baubar: {fehler}"))?;
    let widget = MenuItemBuilder::with_id("widget", "Live-Widget zeigen")
        .build(app)
        .map_err(|fehler| format!("Menüpunkt nicht baubar: {fehler}"))?;
    let einstellungen = MenuItemBuilder::with_id("einstellungen", "Einstellungen")
        .build(app)
        .map_err(|fehler| format!("Menüpunkt nicht baubar: {fehler}"))?;
    let stopp = MenuItemBuilder::with_id("live_stop", "Live-Zyklus beenden")
        .build(app)
        .map_err(|fehler| format!("Menüpunkt nicht baubar: {fehler}"))?;
    let trennen = MenuItemBuilder::with_id("beenden", "Beenden")
        .build(app)
        .map_err(|fehler| format!("Menüpunkt nicht baubar: {fehler}"))?;
    let menue = MenuBuilder::new(app)
        .item(&oeffnen)
        .item(&widget)
        .item(&einstellungen)
        .separator()
        .item(&stopp)
        .separator()
        .item(&trennen)
        .build()
        .map_err(|fehler| format!("Tray-Menü nicht baubar: {fehler}"))?;

    let mut bauer = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("PROPAKT – Live-Wächter bereit")
        .menu(&menue)
        .on_menu_event(|app, ereignis| match ereignis.id().as_ref() {
            "oeffnen" => {
                if let Some(fenster) = app.get_webview_window("main") {
                    let _ = fenster.show();
                    let _ = fenster.unminimize();
                    let _ = fenster.set_focus();
                }
            }
            "widget" => {
                forward_to_overlay(app);
            }
            "einstellungen" => {
                // Hauptfenster nach vorn holen **und** das Frontend auf den
                // Einstellungen-Tab schalten (App.tsx hört auf das Ereignis).
                if let Some(fenster) = app.get_webview_window("main") {
                    let _ = fenster.show();
                    let _ = fenster.unminimize();
                    let _ = fenster.set_focus();
                }
                let _ = app.emit("tray-navigieren", "einstellungen");
            }
            "live_stop" => {
                let _ = crate::live_kommandos::live_stop();
                alarm_melden(app, "Live-Zyklus beendet");
            }
            "beenden" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        bauer = bauer.icon(icon.clone());
    }
    let tray = bauer
        .build(app)
        .map_err(|fehler| format!("Tray nicht baubar: {fehler}"))?;
    // Das Tray-Icon muss den Prozess überleben; bewusst behalten.
    std::mem::forget(tray);
    Ok(())
}

/// Holt das Overlay-Fenster einmalig nach vorn. `false`, wenn das Fenster
/// fehlt (z. B. geschlossen) – kein Fehlerfall für den Zyklus.
pub fn forward_to_overlay(app: &AppHandle) -> bool {
    match app.get_webview_window(OVERLAY_LABEL) {
        Some(fenster) => {
            let _ = fenster.show();
            let _ = fenster.unminimize();
            let _ = fenster.set_focus();
            true
        }
        None => false,
    }
}

/// Dezent, aber bemerkbar: Der Tooltip trägt den Befundtext. Der nächste
/// ruhige Tick räumt ihn mit `beruhigen` wieder weg.
pub fn alarm_melden(app: &AppHandle, text: &str) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_tooltip(Some(format!("⚠ PROPAKT Live: {text}")));
    }
}

/// Tooltip nach einer Beruhigung zurücksetzen.
pub fn beruhigen(app: &AppHandle) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_tooltip(Some("PROPAKT – Live-Wächter bereit"));
    }
}
