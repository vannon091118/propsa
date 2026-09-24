//! Kommando-Fläche des Live-Modus: `live_start`, `live_stop`, `live_status`.
//!
//! Der Zyklus läuft **niemals überlappend**: `live_start` legt den Thread
//! an (ein Taktgeber je Prozess), `live_stop` beendet ihn per Atom-Flag –
//! der laufende Tick wird noch zu Ende geführt. Starten während eines
//! laufenden Zyklus kehrt mit `Err` zurück.
//!
//! Taktgeber-Loop: `live_takt.rs`, Tick-Kern: `live_zyklus.rs`,
//! Persistenz: `live_store.rs`. Umsetzungsplan: `docs/wiki/Live-Modus-Plan.md`.

use crate::live_store::oeffne_db_fuer_identitaet;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

/// Ereignisname eines abgeschlossenen Ticks (auch als Herzschlag, Phase 3).
pub const EREIGNIS_TICK: &str = "live-tick";

/// Ereignisname schwerer Anomalien (Schwere 3) für Widget und Tray.
pub const EREIGNIS_ANOMALIE: &str = "live-anomalie";

/// Mindest-Intervall zwischen Ticks (Hardware-Schonung, Plan: 10 s).
pub const MIN_INTERVALL_SEKUNDEN: u64 = 10;

/// Zustand des Taktgebers (Antwort aller drei Kommandos).
#[derive(Debug, Clone, serde::Serialize)]
pub struct LiveStatus {
    pub laeuft: bool,
    pub pfad: Option<String>,
    pub ticks: u64,
    pub aenderungs_ticks: u64,
    pub intervall_sekunden: u64,
}

impl LiveStatus {
    fn still(heimliche_ticks: (u64, u64), intervall: u64) -> Self {
        LiveStatus {
            laeuft: false,
            pfad: None,
            ticks: heimliche_ticks.0,
            aenderungs_ticks: heimliche_ticks.1,
            intervall_sekunden: intervall,
        }
    }
}

/// Ein laufender Zyklus: Stopp-Flag, Zähler, Projekt-Pfad, Thread.
struct LaufenderZyklus {
    stopp: Arc<AtomicBool>,
    pfad: PathBuf,
    intervall_sekunden: u64,
    ticks: Arc<AtomicU64>,
    aenderungs_ticks: Arc<AtomicU64>,
    /// Baum-Größe des letzten Ticks — die Bremse-Quelle für `live_status`.
    letzte_dateien: Arc<AtomicU64>,
    handle: Option<std::thread::JoinHandle<()>>,
}

/// Der eine Zyklus des Prozesses (Phase 1: eine Identität gleichzeitig).
static ZYKLUS: Mutex<Option<LaufenderZyklus>> = Mutex::new(None);

fn sperre() -> Result<std::sync::MutexGuard<'static, Option<LaufenderZyklus>>, String> {
    ZYKLUS.lock().map_err(|_| "Zyklus-Sperre vergiftet".to_string())
}

/// Kommando `live_start`: Zyklus-Thread für einen Projekt-Pfad starten.
#[tauri::command]
pub fn live_start(
    app: AppHandle,
    pfad: String,
    intervall_sekunden: Option<u64>,
) -> Result<LiveStatus, String> {
    let mut waechter = sperre()?;
    if waechter.is_some() {
        return Err(
            "Ein Live-Zyklus läuft bereits. Beende ihn zuerst: Tray-Menü → \"Live-Zyklus beenden\" oder der Stop-Knopf im Live-Widget."
                .to_string(),
        );
    }
    let basis = PathBuf::from(&pfad);
    if !basis.is_dir() {
        return Err(format!("Kein Verzeichnis: {pfad}"));
    }
    // Fail Loud beim Start: Identität bestimmen und DB öffnen passiert hier,
    // nicht erst still im Thread.
    oeffne_db_fuer_identitaet(&basis)?;

    let intervall = intervall_sekunden.unwrap_or(60).max(MIN_INTERVALL_SEKUNDEN);
    let stopp = Arc::new(AtomicBool::new(false));
    let ticks = Arc::new(AtomicU64::new(0));
    let aenderungs_ticks = Arc::new(AtomicU64::new(0));
    let letzte_dateien = Arc::new(AtomicU64::new(0));

    let thread_pfad = basis.clone();
    let thread_stopp = Arc::clone(&stopp);
    let thread_ticks = Arc::clone(&ticks);
    let thread_aenderungen = Arc::clone(&aenderungs_ticks);
    let thread_letzte = Arc::clone(&letzte_dateien);
    let handle = std::thread::Builder::new()
        .name("propakt-live".to_string())
        .spawn(move || {
            crate::live_takt::zyklus_schleife(
                app,
                thread_pfad,
                intervall,
                thread_stopp,
                thread_ticks,
                thread_aenderungen,
                thread_letzte,
            );
        })
        .map_err(|fehler| format!("Live-Thread nicht startbar: {fehler}"))?;

    *waechter = Some(LaufenderZyklus {
        stopp,
        pfad: basis,
        intervall_sekunden: intervall,
        ticks,
        aenderungs_ticks,
        letzte_dateien,
        handle: Some(handle),
    });
    Ok(LiveStatus {
        laeuft: true,
        pfad: Some(pfad),
        ticks: 0,
        aenderungs_ticks: 0,
        intervall_sekunden: intervall,
    })
}

/// Kommando `live_stop`: Zyklus beenden; der laufende Tick wird zu Ende
/// geführt, die Zähler bleiben bis zum nächsten Start in der Meldung.
#[tauri::command]
pub fn live_stop() -> Result<LiveStatus, String> {
    let mut waechter = sperre()?;
    match waechter.take() {
        None => Ok(LiveStatus::still((0, 0), MIN_INTERVALL_SEKUNDEN)),
        Some(mut lauf) => {
            lauf.stopp.store(true, Ordering::SeqCst);
            if let Some(handle) = lauf.handle.take() {
                let _ = handle.join();
            }
            Ok(LiveStatus {
                laeuft: false,
                pfad: Some(lauf.pfad.display().to_string()),
                ticks: lauf.ticks.load(Ordering::SeqCst),
                aenderungs_ticks: lauf.aenderungs_ticks.load(Ordering::SeqCst),
                intervall_sekunden: lauf.intervall_sekunden,
            })
        }
    }
}

/// Kommando `live_status`: Zustand des Taktgebers ohne Nebenwirkung.
/// Das Intervall ist die **effektive** Pause inklusive Bremse (Phase 5).
#[tauri::command]
pub fn live_status() -> Result<LiveStatus, String> {
    let waechter = sperre()?;
    Ok(match waechter.as_ref() {
        None => LiveStatus::still((0, 0), MIN_INTERVALL_SEKUNDEN),
        Some(lauf) => LiveStatus {
            laeuft: true,
            pfad: Some(lauf.pfad.display().to_string()),
            ticks: lauf.ticks.load(Ordering::SeqCst),
            aenderungs_ticks: lauf.aenderungs_ticks.load(Ordering::SeqCst),
            intervall_sekunden: crate::live_bremse::effektives_intervall(
                lauf.intervall_sekunden,
                lauf.letzte_dateien.load(Ordering::SeqCst) as usize,
            ),
        },
    })
}
