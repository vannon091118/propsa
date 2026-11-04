/**
 * Fixtures für die Doku-Wahrheit-Linse aus `src/paketKritik.ts`.
 *
 * Gegenstück: `tauri-app/src-tauri/src/paketkritik.rs` (`mod tests`).
 * Aufruf: npx ts-node tests/paketKritik.test.ts
 */
import { kritik } from '../src/paketKritik';
import { dokumentation } from '../src/paketQuellen';
import { projektTitel } from '../src/paketBasis';
import { minimatch } from 'minimatch';
import { resolveExcludes } from '@propakt/core';
import { GescannteDatei } from '../src/scanner';

function datei(relativerPfad: string, inhalt: string): GescannteDatei {
  return {
    relativerPfad,
    inhalt,
    zeilen: inhalt.split('\n').length,
    sprache: relativerPfad.endsWith('.ts') ? 'TypeScript' : 'Markdown',
    zeichen: inhalt.length,
    hash: 'test',
  } as unknown as GescannteDatei;
}

function pruefe(name: string, bedingung: boolean): void {
  console.log(`${bedingung ? 'PASS' : 'FAIL'} ${name}`);
  if (!bedingung) process.exitCode = 1;
}

const meta = { version: 2, schema: 'kontextpaket' } as unknown as never;

// Fixture 1: Referenz auf existierende Datei und abgedecktes Verzeichnis.
const paketErfuellt = [
  datei('docs/Anleitung.md', 'Siehe `src/scanner.ts` und das Verzeichnis `src/`.\n'),
  datei('src/scanner.ts', 'export {};\n'),
];
const textErfuellt = kritik(meta, paketErfuellt);
pruefe('erfüllte Referenz gemeldet', textErfuellt.includes('existieren im Paket'));
pruefe('keine Fehlliste bei erfüllter Referenz', !textErfuellt.includes('fehlen im Paket'));

// Fixture 2: Referenz auf Datei, die nicht im Paket ist.
const paketFehlend = [
  datei('docs/Anleitung.md', 'Siehe `src/fehlt.ts`.\n'),
  datei('src/scanner.ts', 'export {};\n'),
];
const textFehlend = kritik(meta, paketFehlend);
pruefe('fehlende Referenz gemeldet', textFehlend.includes('`src/fehlt.ts`'));

// Fixture 3: Pseudo-Referenzen sind keine Datei-Behauptung.
const paketPseudo = [
  datei('docs/Anleitung.md', 'Module in `src/…`, Wildcard `src/**/*.ts`, Ordner `src/components`.\n'),
  datei('src/components/a.ts', 'export {};\n'),
];
const textPseudo = kritik(meta, paketPseudo);
pruefe('Pseudo-Referenzen erzeugen keine Fehlliste', !textPseudo.includes('fehlen im Paket'));

// Fixture 4: Verzeichnis-Abdeckung – Referenz auf Ordner, dessen Kinder im Paket sind.
const paketAbdeckung = [
  datei('docs/Anleitung.md', 'Alles unter `src/components` ist relevant.\n'),
  datei('src/components/tief/a.ts', 'export {};\n'),
];
pruefe('Ordnerpfad wird nicht als Dateinachweis ausgegeben', kritik(meta, paketAbdeckung).includes('ohne konkrete Datei-Referenz'));

// Fixture 5: keine Doku → Hinweis statt Prüfbericht.
const textOhneDoku = kritik(meta, [datei('src/a.ts', 'export {};\n')]);
pruefe('Hinweis bei fehlender Doku', textOhneDoku.includes('nichts zu prüfen'));

// Fixture 6: Brace-Expansion wird in einzelne Datei-Referenzen aufgelöst.
const paketKlammern = [
  datei('docs/Anleitung.md', 'Siehe `src/core/io/{issues,envelope,repair}.ts`.\\n'),
  datei('src/core/io/issues.ts', 'export {};\\n'),
  datei('src/core/io/envelope.ts', 'export {};\\n'),
  datei('src/core/io/repair.ts', 'export {};\\n'),
];
const textKlammern = kritik(meta, paketKlammern);
pruefe('Brace-Expansion erkennt alle vorhandenen Dateien', textKlammern.includes('Alle 3 Datei-Referenzen existieren'));
pruefe('Brace-Expansion erzeugt keine falschen Fehlpfade', !textKlammern.includes('fehlen im Paket'));

const textTeilKlammern = kritik(meta, paketKlammern.slice(0, 3));
pruefe('Fehlende Brace-Variante wird einzeln gemeldet', textTeilKlammern.includes('1 von 3 Referenzen fehlen'));

// Fixture 8: foreign project layout (src/core, not PROPAKT's former fixed folders).
const fremdesProjekt = [
  datei('src/core/narrative/engine.ts',
    "import { clock } from '@/systems/clock';\n" +
    "import { panel } from '@/render/panel';\n" +
    "import { store } from '@/persistence/store';\n"),
  datei('src/systems/clock.ts', 'export const clock = 1;\n'),
  datei('src/render/panel.ts', 'export const panel = 1;\n'),
  datei('src/persistence/store.ts', 'export const store = 1;\n'),
];
const fremdeKritik = kritik(meta, fremdesProjekt);
pruefe('unbekannte Domänenstruktur wird erkannt', fremdeKritik.includes('src/core'));
pruefe('fremde Imports werden in unbekannter Struktur erkannt', fremdeKritik.includes('src/core/narrative/engine.ts'));

// Markdown documentation may itself contain fenced code blocks.
const verschachteltesMarkdown = datei('docs/Beispiel.md', '# Beispiel\n```ts\nconst wert = 1;\n```\n');
const dokumentationsText = dokumentation(
  { titel: 'Fixture', zeitstempel: '2026-11-04 00:00:00', uebersprungen: 0 } as never,
  [verschachteltesMarkdown]
);
pruefe('äußerer Markdown-Fence ist länger als eingebetteter Fence',
  dokumentationsText.includes('\n````markdown\n') && dokumentationsText.endsWith('\n````\n'));
pruefe('eingebetteter Markdown-Codeblock bleibt unverändert',
  dokumentationsText.includes('```ts\nconst wert = 1;\n```'));
// Lockfiles are retained by default so the snapshot preserves dependency resolution.
const lockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock'];
const standardExcludes = resolveExcludes();
pruefe('Lockfiles werden nicht standardmaessig ausgeschlossen',
  lockfiles.every(pfad => !standardExcludes.some(muster =>
    minimatch(pfad, muster, { dot: true, matchBase: true })
  )));
// Export metadata is shareable: it must not disclose a local parent path.
pruefe('Projekttitel enthält nur den letzten Verzeichnisnamen',
  projektTitel('C:\\Users\\private\\workspace\\rigged-by-design') === 'rigged-by-design' &&
  projektTitel('/home/private/workspace/rigged-by-design') === 'rigged-by-design');
pruefe('Wurzelpfad erhält neutralen Projekttitel', projektTitel('/') === 'Projekt');
// Long data registries are not source-code monoliths.
const grossesQuellmodul = datei('src/large.ts', Array(301).fill('const wert = 1;').join('\n'));
const grosseDatenregistry = { ...datei('content/registry.json', Array(301).fill('{}').join('\n')), sprache: 'JSON' };
const groessenKritik = kritik(meta, [grossesQuellmodul, grosseDatenregistry]);
pruefe('große Quellcodedatei bleibt Hotspot-Kandidat', groessenKritik.includes('src/large.ts'));
pruefe('große JSON-Registry wird nicht als Godfile bewertet', !groessenKritik.includes('content/registry.json'));
const fehlern = process.exitCode === 1 ? 'FEHLER' : 'ALLE PASSED';
console.log(`Doku-Wahrheit-Fixtures: ${fehlern}`);
if (process.exitCode === 1) process.exit(1);
