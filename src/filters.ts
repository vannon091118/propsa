/**
 * Pattern-Auflösung für Ein-/Ausschluss-Filter (minimatch-kompatibel).
 *
 * Der Katalog unten ist die **einzige** Quelle der CLI. Die GUI führt dieselbe
 * Liste in `tauri-app/src-tauri/src/filter.rs` (nie betretene Verzeichnisse) und
 * als Vorbelegung des Ausschlussfelds in `tauri-app/src/typen.ts`;
 * `npm run pruefen` vergleicht alle drei.
 */

/**
 * Verzeichnisnamen, die nie betreten werden.
 *
 * Zweite Sicherung neben den Mustern: auch bei geleertem Ausschlussfeld darf
 * kein Abhängigkeits- oder Cache-Verzeichnis gescannt werden. Aus dieser Liste
 * entstehen unten die Ausschlussmuster.
 */
export const IGNORIERTE_VERZEICHNISSE = [
  // Abhängigkeiten
  'node_modules',
  'bower_components',
  'vendor',
  '.venv',
  'venv',
  // Versionsverwaltung
  '.git',
  '.svn',
  '.hg',
  // Build-Artefakte
  'dist',
  'build',
  'out',
  'target',
  'coverage',
  '.next',
  '.nuxt',
  '.output',
  '.svelte-kit',
  '.angular',
  '.turbo',
  '.parcel-cache',
  // Caches (u. a. Python)
  '.cache',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  '.tox',
  '.npm',
  '.pnpm-store',
  '.yarn',
  '.gradle',
  '.m2',
  // Editor-Metadaten
  '.idea',
  '.vscode',
  // PROPSA-History (gehört nie in ein Paket)
  '.propsa',
  // Wegwerf-Verzeichnisse (Artefakte, kein Quelltext)
  '.tmp',
];

/** Einzelne Dateien, die zusätzlich ausgeschlossen werden. */
const AUSGESCHLOSSENE_DATEIEN = [
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.min.js',
  '*.min.css',
  '*.pyc',
  '*.bak',
  // Eigene früherer Outputs: sonst frisst sich das Paket selbst.
  'context.md',
  'context.json',
  'kontext.md',
  'kontext.json',
  // Lockfiles interessieren kein Sprachmodell (allein ~3.400 Zeilen).
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Cargo.lock',
];

/**
 * Setzt vordefinierte Ausschluss-Patterne zusammen mit benutzerdefinierten.
 */
export function resolveExcludes(benutzerMuster?: string): string[] {
  const vordefiniert = [
    ...IGNORIERTE_VERZEICHNISSE.map(verzeichnis => `${verzeichnis}/**`),
    ...AUSGESCHLOSSENE_DATEIEN,
  ];

  if (!benutzerMuster) {
    return vordefiniert;
  }

  const benutzer = benutzerMuster
    .split(',')
    .map(muster => muster.trim())
    .filter(muster => muster.length > 0);

  return [...vordefiniert, ...benutzer];
}

/**
 * Setzt Einbeziehung-Patterne. Falls leer: alle nicht-ausgeschlossenen Dateien.
 */
export function resolveIncludes(benutzerMuster?: string): string[] {
  if (!benutzerMuster) return [];

  return benutzerMuster
    .split(',')
    .map(muster => muster.trim())
    .filter(muster => muster.length > 0);
}
