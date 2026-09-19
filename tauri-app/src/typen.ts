/**
 * Datentypen der Oberfläche.
 *
 * Die Feldnamen der Backend-Typen sind bewusst snake_case, weil sie 1:1 den
 * Rust-Structs in `src-tauri/src/scan.rs` und `export.rs` entsprechen.
 */
import { STANDARD_AUSSCHLUESSE } from "@propsa/core";

/**
 * Eine gescannte Datei (Rust: `DateiInfo`).
 *
 * Bewusst ohne absoluten Pfad: der Export wandert in geteilte Kontexte und
 * darf keine lokalen Pfade verraten.
 */
export type DateiInfo = {
  relativer_pfad: string;
  zeilen: number;
  zeichen: number;
  inhalt: string;
  sprache: string;
};

/**
 * Ergebnis des Kommandos `scan` (Rust: `ScanErgebnis`).
 *
 * Fail Loud: Es gibt keinen Abbruchgrund mehr – ein Limit bricht den Scan
 * ab, das Kommando kehrt mit `Err` zurück, und ein Ergebnis ist immer
 * vollständig (bis auf Übersprungene).
 */
export type ScanErgebnis = {
  titel: string;
  zeitstempel: string;
  identitaet: string;
  dateien: DateiInfo[];
  gesamt_zeilen: number;
  gesamt_zeichen: number;
  uebersprungen: number;
  /** Nur gesetzt, wenn der Scan mit Delta-Anfrage lief. */
  delta_info?: DeltaInfo;
};

/** Unterschied zweier Läufe (Rust: `Delta`). */
export type Delta = {
  neu: string[];
  geaendert: string[];
  entfernt: string[];
  unveraendert: string[];
};

/** Delta-Block des Scan-Ergebnisses (Rust: `DeltaInfo`). */
export type DeltaInfo = {
  erstlauf: boolean;
  herkunft: string;
  identitaet: string;
  delta: Delta | null;
};

/** Fortschritt eines laufenden Scans (Rust: `ScanFortschritt`). */
export type Fortschritt = {
  gelesen: number;
  gesamt: number;
  aktueller_pfad: string;
  uebersprungen: number;
  zeilen: number;
};

/** Zustand der Oberfläche für Statusanzeige und Animationen. */
export type ScanZustand = "bereit" | "scanne" | "fertig" | "fehler" | "export";

/**
 * Einstellungen des Scan-Panels; Muster als komma-getrennter Text.
 *
 * Limits sind Guardrails (Hard Blocks): `null` bedeutet „kein Limit“, ein
 * gesetztes Limit bricht den Scan ab, statt Dateien still wegzulassen.
 */
export type ScanEinstellungen = {
  pfad: string;
  maxDateien: number | null;
  maxZeilen: number | null;
  includeMuster: string;
  excludeMuster: string;
  /** Delta zum letzten Lauf melden (~/.propsa/history/). */
  delta: boolean;
  /** Scan-Zwischenspeicher (~/.propsa/cache/) bei unverändertem Baum. */
  cache: boolean;
};

/**
 * Standardausschlüsse des Ausschlussfelds: aus `@propsa/core` – dieselbe
 * Quelle wie in der CLI und als Spiegel in `src-tauri/src/filter.rs`.
 */
export { STANDARD_AUSSCHLUESSE };

/** Startwerte: vollständiger Scan (keine Limits gesetzt). */
export const BASIS_EINSTELLUNGEN: ScanEinstellungen = {
  pfad: "",
  maxDateien: null,
  maxZeilen: null,
  includeMuster: "",
  excludeMuster: STANDARD_AUSSCHLUESSE,
  delta: false,
  cache: true,
};

/** Ein Punkt der Live-Zeitreihe (Rust: `ZeitreihePunkt`, Phase 4). */
export type LiveZeitreihePunkt = {
  zeitstempel: string;
  dateien: number;
  zeilen: number;
  neu: number;
  geaendert: number;
  entfernt: number;
};

/** Zeitraum-Wahl des History-Graphen (gilt für die Live-Serie). */
export type Zeitraum = "alle" | "7t" | "24h" | "6h";

/** Journal-Eintrag eines Live-Ticks (Rust: `JournalEintrag`). */
export type LiveJournalEintrag = {
  pfad: string;
  art: string;
  zeilen_delta: number;
};

/** Ereignis-Payload eines Live-Ticks (Rust: `TickErgebnis`). */
export type LiveTick = {
  identitaet: string;
  zeitstempel: string;
  dateien: number;
  zeilen: number;
  neu: number;
  geaendert: number;
  entfernt: number;
  unverändert: number;
  journal: LiveJournalEintrag[];
  ruhig: boolean;
  /** true beim ersten Tick einer Identität (Baseline, kein Änderungsschwall). */
  erstaufnahme: boolean;
};

/** Befund einer Anomalie (Rust: `AnomalieBefund`). */
export type AnomalieBefund = {
  art: string;
  pfad: string | null;
  beschreibung: string;
  schwere: number;
};

/** Zustandsmeldung des Taktgebers (Rust: `LiveStatus`). */
export type LiveStatus = {
  laeuft: boolean;
  pfad: string | null;
  ticks: number;
  aenderungs_ticks: number;
  intervall_sekunden: number;
};
