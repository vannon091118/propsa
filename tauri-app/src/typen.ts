/**
 * Datentypen der Oberfläche.
 *
 * Die Feldnamen der Backend-Typen sind bewusst snake_case, weil sie 1:1 den
 * Rust-Structs in `src-tauri/src/scan.rs` und `export.rs` entsprechen.
 */

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
  /** Delta zum letzten Lauf melden (.propsa/history.json). */
  delta: boolean;
};

/**
 * Standardausschlüsse: Abhängigkeiten, Caches und Build-Artefakte.
 *
 * Standard ist damit „alles außer Modulen und Caches“. Dieselbe Liste steht in
 * `src-tauri/src/filter.rs` (IGNORIERTE_VERZEICHNISSE) und in der CLI
 * (`src/filters.ts`).
 */
export const STANDARD_AUSSCHLUESSE = [
  // Abhängigkeiten
  "node_modules",
  "bower_components",
  "vendor",
  ".venv",
  "venv",
  // Versionsverwaltung
  ".git",
  ".svn",
  ".hg",
  // Build-Artefakte
  "dist",
  "build",
  "out",
  "target",
  "coverage",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".angular",
  ".turbo",
  ".parcel-cache",
  // Caches
  ".cache",
  "__pycache__",
  "*.pyc",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".tox",
  ".npm",
  ".pnpm-store",
  ".yarn",
  ".gradle",
  ".m2",
  // System- und Editor-Rauschen
  ".idea",
  ".vscode",
  ".propsa",
  ".tmp",
  ".DS_Store",
  "Thumbs.db",
  "*.log",
  "*.min.js",
  "*.min.css",
  "*.pyc",
  "*.bak",
  // Eigene früherer Outputs: sonst frisst sich das Paket selbst.
  "context.md",
  "context.json",
  "kontext.md",
  "kontext.json",
  // Lockfiles interessieren kein Sprachmodell.
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
].join(", ");

/** Startwerte: vollständiger Scan (keine Limits gesetzt). */
export const BASIS_EINSTELLUNGEN: ScanEinstellungen = {
  pfad: "",
  maxDateien: null,
  maxZeilen: null,
  includeMuster: "",
  excludeMuster: STANDARD_AUSSCHLUESSE,
  delta: false,
};
