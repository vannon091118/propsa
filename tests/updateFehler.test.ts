/**
 * Test: Der Update-Lauf bricht bei lokalen Änderungen mit UpdateFehler und
 * deutschem Lösungshinweis ab (statt Stacktrace).
 *
 * Aufruf: npx ts-node tests/updateFehler.test.ts
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { updateAusfuehren, UpdateFehler } from '../src/update';

const WURZEL = path.resolve(__dirname, '..');

function pruefe(name: string, bedingung: boolean): void {
  console.log(`${bedingung ? 'PASS' : 'FAIL'} ${name}`);
  if (!bedingung) process.exitCode = 1;
}

// Sauberen Stand voraussetzen; sonst zuerst melden und überspringen.
const schmutzig = execFileSync('git', ['status', '--porcelain'], {
  cwd: WURZEL, encoding: 'utf8',
});
if (schmutzig.trim().length > 0) {
  console.log('SKIP: Arbeitsverzeichnis hat lokale Änderungen – Test braucht sauberen Start.');
  process.exit(0);
}

// Lokale Änderung erzeugen (README anfassen), dann Update-Lauf erwarten.
const readme = path.join(WURZEL, 'README.md');
const original = fs.readFileSync(readme, 'utf8');
try {
  fs.writeFileSync(readme, `${original}\n<!-- test-update-fehler -->\n`, 'utf8');
  try {
    updateAusfuehren();
    pruefe('Update-Lauf bricht bei lokalen Änderungen ab', false);
  } catch (fehler) {
    pruefe('UpdateFehler statt Stacktrace', fehler instanceof UpdateFehler);
    pruefe('deutscher Lösungshinweis enthalten',
      fehler instanceof UpdateFehler && fehler.message.includes('Lösung:'));
    pruefe('Meldung nennt commit/stash',
      fehler instanceof UpdateFehler &&
      fehler.message.includes('commit') && fehler.message.includes('stash'));
  }
} finally {
  fs.writeFileSync(readme, original, 'utf8');
}

if (process.exitCode === 1) process.exit(1);
