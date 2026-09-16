/**
 * Fixtures für die Doku-Wahrheit-Linse aus `src/paketKritik.ts`.
 *
 * Gegenstück: `tauri-app/src-tauri/src/paketkritik.rs` (`mod tests`).
 * Aufruf: npx ts-node tests/paketKritik.test.ts
 */
import { kritik } from '../src/paketKritik';
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
pruefe('Verzeichnis-Abdeckung erfüllt', kritik(meta, paketAbdeckung).includes('existieren im Paket'));

// Fixture 5: keine Doku → Hinweis statt Prüfbericht.
const textOhneDoku = kritik(meta, [datei('src/a.ts', 'export {};\n')]);
pruefe('Hinweis bei fehlender Doku', textOhneDoku.includes('nichts zu prüfen'));

const fehlern = process.exitCode === 1 ? 'FEHLER' : 'ALLE PASSED';
console.log(`Doku-Wahrheit-Fixtures: ${fehlern}`);
if (process.exitCode === 1) process.exit(1);
