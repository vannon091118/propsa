/**
 * Git-basierte Selbstaktualisierung der CLI.
 *
 * Der Check holt den Stand der Fernquelle (`git fetch origin`) und vergleicht
 * den lokalen HEAD mit `origin/main`. Liegt die Fernquelle voraus, kann
 * `updateAusfuehren` den Stand übernehmen (`git pull --ff-only`) und die
 * Installation erneuern (`npm run installieren` – baut Core und CLI neu).
 *
 * Fehler werden klassifiziert (kein Git, kein Remote, Netzwerk, lokale
 * Änderungen, Divergenz) und als `UpdateFehler` mit deutschem
 * Lösungshinweis gemeldet – nie als rohe Stacktrace.
 *
 * Vertrag (Typen) lebt in `@propakt/core` (`UpdateCheck`).
 */
import { execFileSync } from 'child_process';
import * as path from 'path';
import { UpdateCheck, hashKurz, updateVerfuegbar } from '@propakt/core';

/** Projekt-Wurzel: zwei Ebenen über diesem Modul (src/). */
const PROJEKT_WURZEL = path.resolve(__dirname, '..');

/** Klassifizierter Update-Fehler mit deutschem Lösungshinweis. */
export class UpdateFehler extends Error {
  constructor(nachricht: string) {
    super(nachricht);
    this.name = 'UpdateFehler';
  }
}

function git(args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: PROJEKT_WURZEL,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (fehler) {
    throw new UpdateFehler(gitHinweis(args, fehler));
  }
}

/** Übersetzt einen git-Fehler in eine deutsche Meldung mit Lösungshinweis. */
function gitHinweis(args: string[], fehler: unknown): string {
  const text = fehler instanceof Error ? `${fehler.message}` : String(fehler);
  if (text.includes('ENOENT') || text.includes('not found')) {
    return 'Git ist nicht installiert oder nicht im PATH.\n' +
      '   Lösung: Git installieren (https://git-scm.com) und erneut versuchen.';
  }
  if (args[0] === 'fetch' || args[0] === 'pull') {
    if (text.includes('No such remote') || text.includes("origin")) {
      return 'Kein Remote `origin` oder keine Verbindung zu ihm.\n' +
        '   Lösung: `git remote add origin <url>` setzen oder Netzwerk/Anmeldung prüfen.';
    }
    if (text.includes('Could not resolve host') || text.includes('Connection') ||
        text.includes('authentication') || text.includes('Permission')) {
      return 'Fernquelle nicht erreichbar (Netzwerk oder Anmeldung).\n' +
        '   Lösung: Internetverbindung und Git-Zugang prüfen, dann erneut versuchen.';
    }
  }
  if (text.includes('Please commit') || text.includes('stash') ||
      text.includes('would be overwritten')) {
    return 'Lokale Änderungen blockieren den Fast-Forward.\n' +
      '   Lösung: Änderungen commiten (`git commit`) oder zur Seite legen\n' +
      '   (`git stash`), dann `propakt update` erneut ausführen.';
  }
  if (text.includes('Diverging') || text.includes('not possible to fast-forward')) {
    return 'Lokaler Stand ist von origin/main abgezweigt (Divergenz).\n' +
      '   Lösung: `git pull --rebase` ausführen oder den lokalen Stand verwerfen\n' +
      '   (`git reset --hard origin/main` – überschreibt lokale Commits!).';
  }
  return `git ${args.join(' ')} fehlgeschlagen:\n   ${text.split('\n')[0]}`;
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
 * Klassifiziert Fehler (kein Git, kein Remote, Netzwerk) in `fehler`.
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
    let lokal = '';
    try {
      lokal = hashKurz(execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: PROJEKT_WURZEL, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim());
    } catch { /* nicht einmal ein Repo – lokal bleibt leer */ }
    return {
      erreichbar: false,
      lokal,
      fern: '',
      update_verfuegbar: false,
      fehler: fehler instanceof Error ? fehler.message : String(fehler),
    };
  }
}

/**
 * Übernimmt neue Commits und erneuert die Installation.
 *
 * Nur Fast-Forward. Vorher geprüft: lokale Änderungen blockieren den Lauf –
 * jede Bedingung bricht mit deutschem Lösungshinweis ab (UpdateFehler).
 */
export function updateAusfuehren(): { vorher: string; nachher: string; installiert: boolean } {
  const vorher = hashKurz(git(['rev-parse', 'HEAD']));
  const schmutzig = git(['status', '--porcelain']);
  if (schmutzig.length > 0) {
    throw new UpdateFehler(
      'Lokale Änderungen blockieren den Fast-Forward.\n' +
      '   Lösung: Änderungen commiten (`git commit`) oder zur Seite legen\n' +
      '   (`git stash`), dann `propakt update` erneut ausführen.'
    );
  }
  git(['pull', '--ff-only', 'origin', 'main', '--quiet']);
  const nachher = hashKurz(git(['rev-parse', 'HEAD']));
  try {
    npm(['run', 'installieren', '--silent']);
  } catch {
    throw new UpdateFehler(
      'Commits übernommen, aber die Installation schlug fehl.\n' +
      '   Lösung: `npm run installieren` manuell ausführen und die Ausgabe lesen.'
    );
  }
  return { vorher, nachher, installiert: true };
}
