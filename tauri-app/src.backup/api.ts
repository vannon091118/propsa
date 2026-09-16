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
import { istVorschauMock, mockOrdnerWaehlen, mockPaketSchreiben, mockScan } from "./devMock";
import type { Fortschritt, ScanEinstellungen, ScanErgebnis } from "./typen";
import type { UpdateCheck } from "@propsa/core";
import "../src/scan_metrics"; // Import to ensure module is included; functions can be used if needed.

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

  // TODO: Implement scan-metrics cache.
  // Idea: Before invoking the scan, compute a cheap fingerprint of the file tree
  // (e.g., list of relative paths and file sizes) and compare with cached version.
  // If unchanged, return cached ScanErgebnis from cache.
  // This requires a backend command to provide file metadata, or we could
  // replicate the scanning logic in the frontend (which would duplicate work).
  // For now, we always invoke the scan.

  const abmelden = await listen<Fortschritt>("scan-fortschritt", (ereignis) => {
    beiFortschritt(ereignis.payload);
  });

  try {
    return await invoke<ScanErgebnis>("scan", {
      pfad: einstellungen.pfad,
      delta: einstellungen.delta,
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