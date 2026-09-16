/**
 * Domänen des Kontextpakets.
 *
 * Eine Domäne ist der **oberste** Ordner eines relativen Pfads: Unterordner
 * gehören zur Domäne ihres Root-Ordners (`tauri-app/src/App.tsx` ⇒ `tauri-app`).
 * Dateien ohne Ordner bilden die Domäne `wurzel`.
 *
 * Dieselbe Regel gilt in der GUI (`tauri-app/src-tauri/src/domaene.rs`); der
 * Vertrag steht in `wiki/Kontextpaket.md`.
 */
import { GescannteDatei } from './scanner';

/** Domäne der Dateien, die direkt in der Scan-Basis liegen. */
export const WURZEL_DOMAENE = 'wurzel';

export interface Domaene {
  /** Anzeigename: oberster Ordner des Pfads. */
  name: string;
  /** Dateiname der Quellendatei (ohne `.md`). */
  dateiname: string;
  dateien: GescannteDatei[];
  zeilen: number;
}

/** Domänenname eines relativen Pfads. */
export function domaeneVon(relativerPfad: string): string {
  const trenner = relativerPfad.indexOf('/');
  return trenner === -1 ? WURZEL_DOMAENE : relativerPfad.slice(0, trenner);
}

/**
 * Dateiname einer Domäne: nur unbedenkliche Zeichen.
 *
 * Zwei Domänen, die sich nur in Groß- und Kleinschreibung unterscheiden,
 * ergeben denselben Dateinamen; das Paket nennt sie dann in einer Datei.
 */
export function dateinameFuerSprache(domaene: string): string {
  const bereinigt = domaene.replace(/[^A-Za-z0-9._-]/g, '-');
  return bereinigt.length > 0 ? bereinigt : WURZEL_DOMAENE;
}

/**
 * Gruppiert Dateien nach Domäne.
 *
 * Reihenfolge: Domänen alphabetisch, `wurzel` zuletzt (es ist der Rest, nicht
 * der Einstieg). Innerhalb der Domäne bleibt die Scan-Reihenfolge erhalten.
 */
export function gruppiereNachDomaene(dateien: GescannteDatei[]): Domaene[] {
  const nachName = new Map<string, GescannteDatei[]>();

  for (const datei of dateien) {
    const name = domaeneVon(datei.relativerPfad);
    const liste = nachName.get(name);
    if (liste) {
      liste.push(datei);
    } else {
      nachName.set(name, [datei]);
    }
  }

  return [...nachName.entries()]
    .map(([name, gruppe]) => ({
      name,
      dateiname: dateinameFuerSprache(name),
      dateien: gruppe,
      zeilen: gruppe.reduce((summe, datei) => summe + datei.zeilen, 0),
    }))
    .sort((a, b) => {
      if (a.name === WURZEL_DOMAENE) return 1;
      if (b.name === WURZEL_DOMAENE) return -1;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
}

/** Ist die Datei eine Dokumentationsdatei (Markdown)? */
export function istDokumentation(datei: GescannteDatei): boolean {
  return datei.sprache === 'Markdown';
}

/** Name der Quellendatei einer Domäne, relativ zum Paketordner. */
export function quellenName(domaene: Domaene): string {
  return `Quellen/${domaene.dateiname}.md`;
}
