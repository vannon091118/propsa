/**
 * Git-basierte Selbstaktualisierung der CLI.
 *
 * Der Check holt den Stand der Fernquelle (`git fetch origin`) und vergleicht
 * den lokalen HEAD mit `origin/main`. Liegt die Fernquelle voraus, kann
 * `updateAusfuehren` den Stand übernehmen (`git pull --ff-only`) und die
 * Installation erneuern (`npm run installieren` – baut Core und CLI neu).
 *
 * Vertrag (Typen) lebt in `@propsa/core` (`UpdateCheck`).
 */
import { execFileSync } from 'child_process';
import * as path from 'path';
import { UpdateCheck, hashKurz, updateVerfuegbar } from '@propsa/core';

/** Projekt-Wurzel: zwei Ebenen über diesem Modul (src/). */
const PROJEKT_WURZEL = path.resolve(__dirname, '..');

function git(args: string[], opts?: { ignoreFehler?: boolean }): string {
  try {
    return execFileSync('git', args, {
      cwd: PROJEKT_WURZEL,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (fehler) {
    if (opts?.ignoreFehler) return '';
    throw fehler;
  }
}

function npm(args: string[]): void {
  execFileSync('npm', args, { cwd: PROJEKT_WURZEL, stdio: 'inherit', shell: true });
}

/** Vergleicht zwei Commit-Hashes inhaltlich (Länge angleichen). */
function gleicherCommit(a: string, b: string): boolean {
  const laenge = Math.min(a.length, b.length);
  return a.slice(0, laenge) === b.slice(0, laenge);
}

/**
 * Prüft auf Updates: `git fetch origin`, dann Vergleich HEAD ↔ origin/main.
 * Wirft bei fehlendem Git/Remote eine verständliche Fehlermeldung.
 */
export function updatePruefen(): UpdateCheck {
  try {
    git(['fetch', 'origin', '--quiet']);
    const lokal = git(['rev-parse', 'HEAD']);
    const fern = git(['rev-parse', 'origin/main']);
    const kette = git(['rev-list', `${lokal}..${fern}`]);
    return {
      erreichbar: true,
      lokal: hashKurz(lokal),
      fern: hashKurz(fern),
      update_verfuegbar: !gleicherCommit(lokal, fern) && updateVerfuegbar(kette.split('\n').filter(Boolean)),
    };
  } catch (fehler) {
    const lokal = git(['rev-parse', 'HEAD'], { ignoreFehler: true });
    return {
      erreichbar: false,
      lokal: hashKurz(lokal),
      fern: '',
      update_verfuegbar: false,
      fehler: fehler instanceof Error ? fehler.message : String(fehler),
    };
  }
}

/**
 * Übernimmt neue Commits und erneuert die Installation.
 *
 * Nur Fast-Forward: Lokale Änderungen werden nie überschrieben – bei Divergenz
 * bricht der Lauf ab, statt Dateien zu mischen.
 */
export function updateAusfuehren(): { vorher: string; nachher: string; installiert: boolean } {
  const vorher = hashKurz(git(['rev-parse', 'HEAD']));
  git(['pull', '--ff-only', 'origin', 'main', '--quiet']);
  const nachher = hashKurz(git(['rev-parse', 'HEAD']));
  npm(['run', 'installieren', '--silent']);
  return { vorher, nachher, installiert: true };
}
