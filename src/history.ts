/**
 * Delta- und History-Erkennung.
 *
 * Die History wohnt zentral im Benutzerverzeichnis:
 * `~/.propsa/history/<identitaet>.json` – je Projekt-Identität eine Datei
 * (pro Zeile ein History-Eintrag, JSONL). Sie wird nach jedem erfolgreichen
 * Paketlauf ergänzt; `--delta` vergleicht den aktuellen Lauf mit dem letzten
 * Eintrag derselben Identität. Im gescannten Projekt bleibt nichts zurück –
 * auch keine `.propsa/` und kein `.gitignore`-Eintrag mehr.
 *
 * Identity-Matching über den **Root-Commit-Hash** (`git rev-list
 * --max-parents=0 HEAD`): stabil über Branches, Pfade und Remote-URLs.
 * Ohne Git fällt die Identität auf den normierten Pfad zurück.
 */
import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GescannteDatei } from './scanner';

/** Zentrale Ablage im Benutzerverzeichnis (alles außer Output liegt hier). */
export const PROPSA_HEIM = path.join(os.homedir(), '.propsa');
const HISTORY_ORDNER = 'history';
const MAX_EINTRAEGE = 50;

/** Ein History-Eintrag: das Minimum, das ein Delta braucht. */
export interface HistoryEintrag {
  zeitstempel: string;
  identitaet: string;
  herkunft: 'root-commit' | 'pfad';
  dateien: Record<string, string>;
  metriken: {
    anzahl_dateien: number;
    gesamt_zeilen: number;
  };
}

/** Unterschied zweier Läufe, je Datei genau eine Kategorie. */
export interface Delta {
  neu: string[];
  geaendert: string[];
  entfernt: string[];
  unverändert: string[];
}

/**
 * Die zentrale Ablage anlegen: `~/.propsa` mit Unterordnern.
 *
 * Installations- und Deinstallationsskript (`scripts/install.mjs`,
 * `scripts/deinstall.mjs`) nutzen denselben Ordner; der Lauf allein braucht
 * ihn aber auch, deshalb legt diese Funktion ihn idempotent an.
 */
export function heimSichern(): string {
  fs.mkdirSync(path.join(PROPSA_HEIM, HISTORY_ORDNER), { recursive: true });
  return PROPSA_HEIM;
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
 * Projektidentität: Root-Commit-Hash vorrangig, sonst normierter Pfad.
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

/**
 * Pfad → Inhalts-Fingerprint für alle gescannten Dateien.
 *
 * Bewusst als Hex-String wie der Rust-Spiegel (`fingerabdruecke` in
 * `history.rs`): beide Seiten müssen denselben Wert je Datei erzeugen,
 * sonst vergleicht CLI und App aneinander vorbei.
 */
function fingerabdrücke(dateien: GescannteDatei[]): Record<string, string> {
  const abbild: Record<string, string> = {};
  for (const datei of dateien) {
    abbild[datei.relativerPfad] = inhaltsHash(datei.inhalt);
  }
  return abbild;
}

/** History-Datei der Identität unter `~/.propsa/history/`. */
function historyPfad(identitaet: string): string {
  return path.join(PROPSA_HEIM, HISTORY_ORDNER, `${identitaet}.jsonl`);
}

/** Liest die History; fehlendes oder fehlerhaftes File ergibt eine leere Liste. */
export function historyLesen(identitaet: string): HistoryEintrag[] {
  let text: string;
  try {
    text = fs.readFileSync(historyPfad(identitaet), 'utf8');
  } catch {
    return [];
  }
  return text
    .split(/\r?\n/)
    .filter(zeile => zeile.trim().length > 0)
    .map(zeile => JSON.parse(zeile) as HistoryEintrag)
    .filter(eintrag => typeof eintrag?.identitaet === 'string');
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

/** Hängt den Lauf an die History der Identität an und kürzt auf MAX_EINTRAEGE. */
export function historyErgänzen(identitaet: string, eintrag: HistoryEintrag): void {
  heimSichern();
  const eintraege = [...historyLesen(identitaet), eintrag].slice(-MAX_EINTRAEGE);
  fs.writeFileSync(
    historyPfad(identitaet),
    `${eintraege.map(eintrag => JSON.stringify(eintrag)).join('\n')}\n`,
    'utf8'
  );
}

/** Komfort: Delta ermitteln, Eintrag anfügen. */
export function laufVerarbeiten(
  basisPfad: string,
  zeitstempel: string,
  dateien: GescannteDatei[]
): { delta: Delta | null; erstlauf: boolean; identitaet: string; herkunft: string } {
  const { identitaet, herkunft } = projektIdentitaet(basisPfad);
  const eintraege = historyLesen(identitaet);
  const früher = letztenEintragFinden(eintraege, identitaet);
  const delta = früher ? deltaBerechnen(dateien, früher) : null;

  const gesamtZeilen = dateien.reduce((sum, d) => sum + d.zeilen, 0);

  historyErgänzen(identitaet, {
    zeitstempel,
    identitaet,
    herkunft,
    dateien: fingerabdrücke(dateien),
    metriken: {
      anzahl_dateien: dateien.length,
      gesamt_zeilen: gesamtZeilen,
    },
  });

  return { delta, erstlauf: früher === null, identitaet, herkunft };
}
