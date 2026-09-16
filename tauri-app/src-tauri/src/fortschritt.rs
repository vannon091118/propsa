//! Fortschrittsmeldungen eines laufenden Scans.
//!
//! Die Oberfläche abonniert das Ereignis mit
//! `listen("scan-fortschritt", …)` aus `@tauri-apps/api/event`.

use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Ereignisname der Fortschrittsmeldung.
pub const EREIGNIS: &str = "scan-fortschritt";

/// Höchstens so oft wird gemeldet (schont die IPC bei großen Repos).
pub const INTERVALL: Duration = Duration::from_millis(120);

/// Fortschritt eines laufenden Scans.
#[derive(Clone, Serialize)]
pub struct ScanFortschritt {
    pub gelesen: usize,
    pub gesamt: usize,
    pub aktueller_pfad: String,
    pub uebersprungen: usize,
    pub zeilen: usize,
}

impl ScanFortschritt {
    /// Sendet den Fortschritt an die Oberfläche.
    pub fn melden(&self, app: &AppHandle) {
        // Fehlende Empfänger sind kein Fehler (z. B. beim Export).
        let _ = app.emit(EREIGNIS, self.clone());
    }
}
