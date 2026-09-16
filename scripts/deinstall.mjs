#!/usr/bin/env node
/**
 * Deinstallation von PROPSA: entfernt die zentrale Ablage `~/.propsa`
 * (History, Installations-Metadaten) nach Bestätigung und erklärt, was
 * **nicht** entfernt wird:
 *
 *   - der Output: geschriebene Kontextpakete und `--einzeln`-Dateien liegen
 *     dort, wo der Nutzer sie angefordert hat,
 *   - der Quelltext des Projekts selbst und node_modules (das übernimmt
 *     das Löschen des Projektordners),
 *   - ggf. ein `npm link`-Eintrag (wird hier gelöst, falls vorhanden).
 *
 * Aufruf: `npm run deinstallieren` (oder `node scripts/deinstall.mjs`)
 * Ohne TTY (CI) bricht das Skript ab; mit `--ja` läuft es ohne Rückfrage.
 */
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, exit } from 'node:process';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HEIM = join(homedir(), '.propsa');

/** Zeigt, was entfernt werden wird, und holt im TTY eine Bestätigung ein. */
async function bestaetigen() {
  if (process.argv.includes('--ja')) return;
  if (!stdin.isTTY) {
    console.error('✗ Kein TTY: Bitte mit `--ja` bestätigen oder interaktiv ausführen.');
    exit(1);
  }
  const eintraege = existsSync(HEIM) ? readdirSync(HEIM) : [];
  console.log('Es wird entfernt:');
  console.log(`  1. ${HEIM}  (${eintraege.length > 0 ? eintraege.join(', ') : 'leer'})`);
  console.log('  2. npm-link des Befehls `propsa`, falls vorhanden');
  console.log('\nNicht entfernt werden:');
  console.log('  - geschriebene Kontextpakete und --einzeln-Ausgaben (Output)');
  console.log('  - der Projektordner selbst');
  const antwort = await createInterface({ input: stdin, output: stdout }).question(
    '\nWeiter? (j/N) '
  );
  if (antwort.trim().toLowerCase() !== 'j') {
    console.log('Abgebrochen – nichts wurde entfernt.');
    exit(0);
  }
}

/** Löst ein vorhandenes `npm link` (globaler Binär-Eintrag). */
function linkLoesen() {
  try {
    // Windows: npm ist eine .cmd — ohne shell:true findet spawnSync sie nicht.
    execFileSync('npm', ['unlink', '-g', '--no-workspaces'], { cwd: WURZEL, stdio: 'ignore', shell: true });
    console.log('✓ npm link gelöst');
  } catch {
    console.log('· kein npm link vorhanden');
  }
}

await bestaetigen();

if (existsSync(HEIM)) {
  const meta = (() => {
    try {
      return JSON.parse(readFileSync(join(HEIM, 'version.json'), 'utf8'));
    } catch {
      return null;
    }
  })();
  if (meta?.version) console.log(`  Ablage der Version ${meta.version}, installiert ${meta.installiert_am}`);
  rmSync(HEIM, { recursive: true, force: true });
  console.log(`✓ entfernt: ${HEIM}`);
} else {
  console.log(`· ${HEIM} nicht vorhanden – nichts zu löschen`);
}

linkLoesen();
console.log('\n✓ Deinstallation abgeschlossen.');
