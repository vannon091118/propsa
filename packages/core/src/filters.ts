/**
 * Pattern-Auflösung für Ein-/Ausschluss-Filter (minimatch-kompatibel).
 *
 * Dieser Katalog ist die **einzige** TypeScript-Quelle. Das Rust-Backend
 * spiegelt ihn (`tauri-app/src-tauri/src/filter.rs`), und das Frontend
 * bezieht die Vorbelegung seines Ausschlussfelds (`STANDARD_AUSSCHLUESSE`)
 * von hier statt einer eigenen Kopie; `npm run pruefen` vergleicht die Kataloge.
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
  // Standard-Ausgabeverzeichnis von PROPSA selbst. Ohne diesen Eintrag
  // scannt ein Lauf sein eigenes Paket mit: der nächste Lauf zählt die
  // gerade geschriebenen Dateien als neu und geändert, und `--delta`
  // konvergiert nie. Siehe CLAUDE.md, Smoke-Tests.
  'propsa-kontext',
];

/** Einzelne Dateien, die zusätzlich ausgeschlossen werden. */
export const AUSGESCHLOSSENE_DATEIEN = [
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
 * Vorbelegung des Ausschlussfelds (GUI) bzw. der Vorgabe-Excludes (CLI):
 * alle Katalog-Einträge als kommatrennter Text.
 */
export const STANDARD_AUSSCHLUESSE = [
  ...IGNORIERTE_VERZEICHNISSE,
  ...AUSGESCHLOSSENE_DATEIEN,
].join(', ');

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
