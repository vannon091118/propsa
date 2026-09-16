/**
 * Delta- und History-Erkennung.
 *
 * Die History wohnt lokal im Projekt: `.propsa/history.json`. Sie wird nach
 * jedem erfolgreichen Paketlauf ergänzt; `--delta` vergleicht den aktuellen
 * Lauf mit dem letzten Eintrag derselben Projekt-Identität.
 *
 * Identity-Matching über den **Root-Commit-Hash** (`git rev-list
 * --max-parents=0 HEAD`): stabil über Branches, Pfade und Remote-URLs.
 * Ohne Git fällt die Identität auf den normierten Pfad zurück.
 */
import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { GescannteDatei } from './scanner';

const PROPSA_ORDNER = '.propsa';
const HISTORY_DATEI = 'history.json';
const MAX_EINTRAEGE = 50;

/** Ein History-Eintrag: das Minimum, das ein Delta braucht. */
export interface HistoryEintrag {
  zeitstempel: string;
  identitaet: string;
  herkunft: 'root-commit' | 'pfad';
  dateien: Record<string, number>;
}

/** Unterschied zweier Läufe, je Datei genau eine Kategorie. */
export interface Delta {
  neu: string[];
  geaendert: string[];
  entfernt: string[];
  unverändert: string[];
}

/** Root-Commit-Hash oder `null` ohne Git-Repository/Commit. */
export function rootCommitHash(basisPfad: string): string | null {
  try {
    const hash = execFileSync(
      'git',
      ['rev-list', '--max-parents=0', 'HEAD'],
      { cwd: basisPfad, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    return hash.split('\n')[0] || null;
  } catch {
    return null;
  }
}

/**
 * Projektdentität: Root-Commit-Hash vorrangig, sonst normierter Pfad.
 *
 * Der Pfad-Fallback hält auch Repositories ohne Commit auseinander; er ist
 * bewusst gekennzeichnet, damit ein Delta aus gemischten Herkünften lesbar
 * bleibt.
 */
export function projektIdentitaet(basisPfad: string): {
  identitaet: string;
  herkunft: 'root-commit' | 'pfad';
} {
  const hash = rootCommitHash(basisPfad);
  if (hash) {
    return { identitaet: hash, herkunft: 'root-commit' };
  }
  const normiert = path.resolve(basisPfad).toLowerCase();
  return {
    identitaet: crypto.createHash('sha256').update(normiert).digest('hex'),
    herkunft: 'pfad',
  };
}

/** Fingerabdruck einer Datei: Hash über den Inhalt. */
function inhaltsHash(inhalt: string): string {
  return crypto.createHash('sha256').update(inhalt).digest('hex');
}

/** Pfad → Inhalts-Hash für alle gescannten Dateien. */
function fingerabdrücke(dateien: GescannteDatei[]): Record<string, number> {
  const abbild: Record<string, number> = {};
  for (const datei of dateien) {
    abbild[datei.relativerPfad] = parseInt(inhaltsHash(datei.inhalt).slice(0, 12), 16);
  }
  return abbild;
}

/** Ordner und History-Datei der Scan-Basis. */
function historyPfad(basisPfad: string): string {
  return path.join(basisPfad, PROPSA_ORDNER, HISTORY_DATEI);
}

/** Liest die History; fehlerhaftes oder fehlendes File ergibt eine leere Liste. */
export function historyLesen(basisPfad: string): HistoryEintrag[] {
  try {
    const gelesen: unknown = JSON.parse(fs.readFileSync(historyPfad(basisPfad), 'utf8'));
    return Array.isArray(gelesen) ? (gelesen as HistoryEintrag[]) : [];
  } catch {
    return [];
  }
}

/** Letzter Eintrag derselben Identität oder `null` bei Erstlauf. */
export function letztenEintragFinden(
  eintraege: HistoryEintrag[], identitaet: string
): HistoryEintrag | null {
  for (let i = eintraege.length - 1; i >= 0; i -= 1) {
    if (eintraege[i].identitaet === identitaet) {
      return eintraege[i];
    }
  }
  return null;
}

/** Vergleicht den aktuellen Lauf mit einem früheren Fingerabdruck. */
export function deltaBerechnen(aktuell: GescannteDatei[], früher: HistoryEintrag): Delta {
  const vorher = früher.dateien ?? {};
  const delta: Delta = { neu: [], geaendert: [], entfernt: [], unverändert: [] };

  const jetzige = fingerabdrücke(aktuell);
  for (const [pfad, hash] of Object.entries(jetzige)) {
    if (!(pfad in vorher)) {
      delta.neu.push(pfad);
    } else if (vorher[pfad] !== hash) {
      delta.geaendert.push(pfad);
    } else {
      delta.unverändert.push(pfad);
    }
  }
  for (const pfad of Object.keys(vorher)) {
    if (!(pfad in jetzige)) {
      delta.entfernt.push(pfad);
    }
  }
  return delta;
}

/** Hängt den Lauf an die History an und kürzt auf MAX_EINTRAEGE. */
export function historyErgänzen(
  basisPfad: string,
  eintrag: HistoryEintrag
): void {
  const eintraege = [...historyLesen(basisPfad), eintrag].slice(-MAX_EINTRAEGE);
  fs.mkdirSync(path.join(basisPfad, PROPSA_ORDNER), { recursive: true });
  fs.writeFileSync(historyPfad(basisPfad), JSON.stringify(eintraege, null, 2), 'utf8');
}

/**
 * Stellt sicher, dass `.propsa/` in der .gitignore steht.
 *
 * Idempotent: ein vorhandener, exakter Eintrag bleibt unberührt. Andernfalls
 * wird eine Blocknotiz mit dem Eintrag angehängt.
 */
export function gitignoreSichern(basisPfad: string): boolean {
  const datei = path.join(basisPfad, '.gitignore');
  const zeile = '.propsa/';
  let inhalt = '';
  try {
    inhalt = fs.readFileSync(datei, 'utf8');
  } catch {
    // Keine .gitignore: neu anlegen.
  }
  const vorhanden = inhalt
    .split(/\r?\n/)
    .some(z => z.trim() === zeile || z.trim() === '.propsa');
  if (vorhanden) {
    return false;
  }
  const basis = inhalt === '' || inhalt.endsWith('\n') ? inhalt : `${inhalt}\n`;
  fs.writeFileSync(
    datei,
    `${basis}\n# PROPSA-History (lokal, nie committen)\n${zeile}\n`,
    'utf8'
  );
  return true;
}

/** Komfort: Delta ermitteln, Eintrag anfügen, .gitignore sichern. */
export function laufVerarbeiten(
  basisPfad: string,
  zeitstempel: string,
  dateien: GescannteDatei[]
): { delta: Delta | null; erstlauf: boolean; identitaet: string; herkunft: string } {
  const { identitaet, herkunft } = projektIdentitaet(basisPfad);
  const eintraege = historyLesen(basisPfad);
  const früher = letztenEintragFinden(eintraege, identitaet);
  const delta = früher ? deltaBerechnen(dateien, früher) : null;

  historyErgänzen(basisPfad, {
    zeitstempel,
    identitaet,
    herkunft,
    dateien: fingerabdrücke(dateien),
  });
  gitignoreSichern(basisPfad);

  return { delta, erstlauf: früher === null, identitaet, herkunft };
}
