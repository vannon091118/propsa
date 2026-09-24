#!/usr/bin/env node
/**
 * Installation von PROPAKT: baut CLI und Core und richtet die zentrale
 * Ablage im Benutzerverzeichnis ein.
 *
 * Die Ablage `~/.propakt` nimmt alles auf, was PROPAKT zwischen den Läufen
 * behält – **außer dem Output** (Kontextpaket/Einzeldatei landen, wo der
 * Nutzer sie hin haben will):
 *
 *   ~/.propakt/
 *   ├── history/           Delta-History je Projekt-Identität (<hash>.jsonl)
 *   └── version.json       Installations-Metadaten (Version, Zeitstempel)
 *
 * Aufruf: `npm run installieren` (oder `node scripts/install.mjs`)
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HEIM = join(homedir(), '.propakt');
const HEIM_ALT = join(homedir(), '.propsa');

/**
 * Übernimmt eine bestehende Ablage unter dem Altnamen `~/.propsa` einmalig
 * nach `~/.propakt`, damit History, Cache und Live-Daten die Umbenennung
 * nicht überleben. Scheitert das Umbenennen, geht die Einrichtung trotzdem
 * weiter – der Nutzer wird aber gewarnt.
 */
function heimMigrieren() {
  if (existsSync(HEIM) || !existsSync(HEIM_ALT)) return;
  try {
    renameSync(HEIM_ALT, HEIM);
    console.log(`♻️  Alte Ablage ${HEIM_ALT} nach ${HEIM} übernommen.`);
  } catch {
    console.warn(`⚠ Alte Ablage ${HEIM_ALT} gefunden, konnte aber nicht übernommen werden – bitte von Hand umbenennen.`);
  }
}

function bauen() {
  console.log('▸ Baue @propakt/core und CLI …');
  // Windows: npm ist eine .cmd — ohne shell:true findet spawnSync sie nicht.
  execFileSync('npm', ['run', 'build'], { cwd: WURZEL, stdio: 'inherit', shell: true });
  console.log('✓ Build fertig (dist/ + packages/core/dist/)');
}

function heimEinrichten() {
  heimMigrieren();
  mkdirSync(join(HEIM, 'history'), { recursive: true });
  const manifest = JSON.parse(readFileSync(join(WURZEL, 'package.json'), 'utf8'));
  const meta = {
    produkt: 'propakt',
    version: manifest.version,
    installiert_am: new Date().toISOString(),
    hinweis:
      'Zentrale PROPAKT-Ablage. History und Installations-Metadaten; ' +
      'kein Output – Kontextpakete landen, wo sie angefordert werden.',
  };
  writeFileSync(join(HEIM, 'version.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  console.log(`✓ Zentrale Ablage bereit: ${HEIM}`);
  console.log('  - history/   Delta-History je Projekt-Identität');
  console.log('  - version.json  Installations-Metadaten');
  console.log('  Output (Kontextpaket, --einzeln) bewusst NICHT hier: er bleibt,');
  console.log('  wo der Nutzer ihn anfordert.');
}

/** Deinstallation rückt nichts weg, das nicht PROPAKT gehört. */
function heimVorhanden() {
  return existsSync(HEIM);
}

const schritt = process.argv[2];
if (schritt === '--nur-heim') {
  if (!heimVorhanden()) heimEinrichten();
  else console.log(`✓ Ablage vorhanden: ${HEIM}`);
} else {
  bauen();
  heimEinrichten();
  console.log('\n✓ Installation abgeschlossen. Erster Lauf:');
  console.log('  npm start -- <pfad> --einzeln kontext.md');
}
