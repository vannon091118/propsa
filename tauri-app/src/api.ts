/**
 * Zugriff auf die Tauri-Kommandos.
 *
 * Wichtig: Tauri erwartet Argumentnamen in camelCase (Rust-Parameter
 * `max_dateien` ⇒ `maxDateien`). Felder *innerhalb* übergebener Structs
 * behalten dagegen ihre Rust-Namen.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  istVorschauMock,
  mockLiveAbonnieren,
  mockLiveStart,
  mockLiveStatus,
  mockLiveStoppen,
  mockLiveZeitreihe,
  mockOrdnerWaehlen,
  mockPaketSchreiben,
  mockScan,
} from "./devMock";
import type {
  AnomalieBefund,
  Fortschritt,
  LiveStatus,
  LiveTick,
  LiveZeitreihePunkt,
  ScanEinstellungen,
  ScanErgebnis,
} from "./typen";
import type { Beratungsauftrag, BeratungsAntwort } from "./llm";
import type { UpdateCheck } from "@propsa/core";


export { invoke };

/** Komma-getrennte Muster in eine Liste umwandeln (analog zur CLI). */
function musterListe(text: string): string[] {
  return text
    .split(",")
    .map((muster) => muster.trim())
    .filter((muster) => muster.length > 0);
}

/** Ordner-Dialog; liefert `null` bei Abbruch. */
export async function ordnerWaehlen(titel: string): Promise<string | null> {
  if (istVorschauMock()) {
    return mockOrdnerWaehlen();
  }
  const gewaehlt = await open({ directory: true, multiple: false, title: titel });
  return typeof gewaehlt === "string" ? gewaehlt : null;
}

/**
 * Startet einen Scan und meldet den Fortschritt über `beiFortschritt`.
 *
 * Das Backend sendet `scan-fortschritt`-Ereignisse; nach dem Scan wird der
 * Zuhörer wieder abgemeldet.
 */
export async function scanStarten(
  einstellungen: ScanEinstellungen,
  beiFortschritt: (fortschritt: Fortschritt) => void,
): Promise<ScanErgebnis> {
  if (istVorschauMock()) {
    return mockScan(einstellungen, beiFortschritt);
  }

  // Der Scan-Zwischenspeicher lebt im Backend (Rust-Spiegel
  // `zwischenspeicher.rs`, Spiegel zum Core-Vertrag); die App schickt
  // nur den Schalter mit.

  const abmelden = await listen<Fortschritt>("scan-fortschritt", (ereignis) => {
    beiFortschritt(ereignis.payload);
  });

  try {
    return await invoke<ScanErgebnis>("scan", {
      pfad: einstellungen.pfad,
      delta: einstellungen.delta,
      zwischenspeicher: einstellungen.cache,
      maxDateien: einstellungen.maxDateien,
      maxZeilen: einstellungen.maxZeilen,
      includeMuster: musterListe(einstellungen.includeMuster),
      excludeMuster: musterListe(einstellungen.excludeMuster),
    });
  } finally {
    abmelden();
  }
}

/**
 * Prüft auf Updates über origin/main (Rust: `update_check`).
 *
 * In der Browser-Vorschau (Mock) immer „alles aktuell“.
 */
export async function updatePruefen(): Promise<UpdateCheck> {
  if (istVorschauMock()) {
    return {
      erreichbar: true,
      lokal: "vorschau",
      fern: "vorschau",
      update_verfuegbar: false,
      fehler: undefined,
    };
  }
  return invoke<UpdateCheck>("update_check");
}

/**
 * Übernimmt Updates (fast-forward + Neuinstallation) mit Fortschritts-
 * rückmeldung über `update-fortschritt` (Rust: `update_ausfuehren`).
 */
export async function updateStarten(
  beiFortschritt: (text: string) => void,
): Promise<UpdateCheck> {
  if (istVorschauMock()) {
    beiFortschritt("Vorschau: nichts zu aktualisieren.");
    return {
      erreichbar: true,
      lokal: "vorschau",
      fern: "vorschau",
      update_verfuegbar: false,
      fehler: undefined,
    };
  }
  const abmelden = await listen<{ schritt: string; text: string }>(
    "update-fortschritt",
    (ereignis) => beiFortschritt(ereignis.payload.text),
  );
  try {
    return await invoke<UpdateCheck>("update_ausfuehren");
  } finally {
    abmelden();
  }
}

/**
 * Schreibt das Kontextpaket in einen Ordner.
 *
 * Liefert die geschriebenen Dateinamen (relativ zum Ordner).
 */
export async function paketSchreiben(
  ergebnis: ScanErgebnis,
  ordner: string,
): Promise<string[]> {
  if (istVorschauMock()) {
    return mockPaketSchreiben(ordner);
  }
  return invoke<string[]>("paket_schreiben", { scan: ergebnis, ordner });
}

// ── Live-Modus (Phase 3) ────────────────────────────────────────────────

/** Ereignisnamen (Rust: `live_kommandos.rs`). */
export const LIVE_TICK_EREIGNIS = "live-tick";
export const LIVE_ANOMALIE_EREIGNIS = "live-anomalie";

/** Zustand des Taktgebers ohne Nebenwirkung (Poll-Quelle des Widgets). */
export async function liveStatus(): Promise<LiveStatus> {
  if (istVorschauMock()) {
    return mockLiveStatus();
  }
  return invoke<LiveStatus>("live_status");
}

/** Startet den Live-Zyklus für einen Projekt-Pfad. */
export async function liveStarten(pfad: string, intervallSekunden?: number): Promise<LiveStatus> {
  if (istVorschauMock()) {
    return mockLiveStart(pfad, intervallSekunden);
  }
  return invoke<LiveStatus>("live_start", { pfad, intervallSekunden });
}

/** Beendet den Live-Zyklus; der laufende Tick wird zu Ende geführt. */
export async function liveStoppen(): Promise<LiveStatus> {
  if (istVorschauMock()) {
    return mockLiveStoppen();
  }
  return invoke<LiveStatus>("live_stop");
}

/**
 * Live-Zeitreihe (Phase 4): Snapshots aus `~/.propsa/live/<identitaet>.db`
 * als Graph-Punkte; `stunden` begrenzt den Zeitraum (`null` = alles).
 */
export async function liveZeitreiheLaden(
  identitaet: string,
  stunden: number | null,
): Promise<LiveZeitreihePunkt[]> {
  if (istVorschauMock()) {
    return mockLiveZeitreihe(stunden);
  }
  return invoke<LiveZeitreihePunkt[]>("get_live_zeitreihe", { identitaet, stunden });
}

/** Liest AGENTS.md + ARCHITECTURE.md des Projekts als LLM-Kontext. */
export async function liveKontextLesen(pfad: string): Promise<string> {
  return invoke<string>("live_kontext_lesen", { pfad });
}

/**
 * LLM-Beratung über die Backend-Brücke (Rust: `llm_bruecke.rs`).
 * Der Key läuft nur durch diesen einen Aufruf und wird nirgends abgelegt.
 */
export async function beratungAusfuehren(auftrag: Beratungsauftrag): Promise<BeratungsAntwort> {
  if (istVorschauMock()) {
    return {
      ok: true,
      text: "(Vorschau) Keine echte Beratung — Backend-Bridge im Browser-Mock nicht aktiv.",
      modell: auftrag.model,
      fehler: null,
    };
  }
  return invoke<BeratungsAntwort>("llm_beratung", { auftrag });
}

/**
 * Abonnieren der Live-Ereignisse: je Tick die Meldung, je schwerer Anomalie
 * die Befunde. Liefert die Abmelde-Funktion.
 */
export async function liveTickAbonnieren(
  beiTick: (tick: LiveTick) => void,
  beiAnomalie: (befunde: AnomalieBefund[]) => void,
): Promise<() => void> {
  if (istVorschauMock()) {
    return mockLiveAbonnieren(beiTick, beiAnomalie);
  }
  const tickLos = await listen<LiveTick>(LIVE_TICK_EREIGNIS, (e) => beiTick(e.payload));
  const anomalieLos = await listen<AnomalieBefund[]>(LIVE_ANOMALIE_EREIGNIS, (e) =>
    beiAnomalie(e.payload),
  );
  return () => {
    tickLos();
    anomalieLos();
  };
}