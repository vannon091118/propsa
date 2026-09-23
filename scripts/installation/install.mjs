#!/usr/bin/env node
/**
 * Installation von PROPSA: baut CLI und Core und richtet die zentrale
 * Ablage im Benutzerverzeichnis ein.
 *
 * Die Ablage `~/.propsa` nimmt alles auf, was PROPSA zwischen den Läufen
 * behält – **außer dem Output** (Kontextpaket/Einzeldatei landen, wo der
 * Nutzer sie hin haben will):
 *
 *   ~/.propsa/
 *   ├── history/           Delta-History je Projekt-Identität (<hash>.jsonl)
 *   └── version.json       Installations-Metadaten (Version, Zeitstempel)
 *
 * Aufruf: `npm run installieren` (oder `node scripts/install.mjs`)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HEIM = join(homedir(), '.propsa');

function bauen() {
  console.log('▸ Baue @propsa/core und CLI …');
  // Windows: npm ist eine .cmd — ohne shell:true findet spawnSync sie nicht.
  execFileSync('npm', ['run', 'build'], { cwd: WURZEL, stdio: 'inherit', shell: true });
  console.log('✓ Build fertig (dist/ + packages/core/dist/)');
}

function heimEinrichten() {
  mkdirSync(join(HEIM, 'history'), { recursive: true });
  const manifest = JSON.parse(readFileSync(join(WURZEL, 'package.json'), 'utf8'));
  const meta = {
    produkt: 'propsa',
    version: manifest.version,
    installiert_am: new Date().toISOString(),
    hinweis:
      'Zentrale PROPSA-Ablage. History und Installations-Metadaten; ' +
      'kein Output – Kontextpakete landen, wo sie angefordert werden.',
  };
  writeFileSync(join(HEIM, 'version.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  console.log(`✓ Zentrale Ablage bereit: ${HEIM}`);
  console.log('  - history/   Delta-History je Projekt-Identität');
  console.log('  - version.json  Installations-Metadaten');
  console.log('  Output (Kontextpaket, --einzeln) bewusst NICHT hier: er bleibt,');
  console.log('  wo der Nutzer ihn anfordert.');
}

/** Deinstallation rückt nichts weg, das nicht PROPSA gehört. */
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
