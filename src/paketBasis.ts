/**
 * Gemeinsame Bausteine aller Pakettexte: Kopfzeilen, Hinweise, Verteilung und
 * der Verzeichnisbaum.
 *
 * Gegenstück in der GUI: `tauri-app/src-tauri/src/paketbasis.rs`. Zahlen stehen
 * ohne Tausendertrenner, damit beide Oberflächen dieselbe Datei erzeugen.
 */
import { GescannteDatei } from './scanner';
import { SchemaMeta } from '@propsa/core';

/** Kopfzeilen, die in jeder Datei des Pakets stehen. */
export function kopf(titel: string, meta: SchemaMeta, zeilen: string[]): string {
  let text = `# PROPSA – ${titel}\n\n`;
  text += `**Projekt:** ${meta.titel}\n`;
  text += `**Erzeugt:** ${meta.zeitstempel}\n`;
  text += `${zeilen.join('\n')}\n`;
  return text;
}

/**
 * Hinweise zur Vollständigkeit.
 *
 * Mit Fail Loud ist ein Scan entweder vollständig oder es gibt kein Paket.
 * Gemeldet werden nur noch Dateien, die das Dateisystem nicht hergab.
 */
export function hinweise(meta: SchemaMeta): string[] {
  const zeilen: string[] = [];
  if (meta.uebersprungen > 0) {
    zeilen.push(
      `- ${meta.uebersprungen} Datei(en) nicht lesbar oder binär und deshalb übersprungen.`
    );
  }
  return zeilen;
}

/** Hinweisblock als eigener Abschnitt (leer, wenn alles vollständig ist). */
export function hinweisblock(meta: SchemaMeta): string {
  const zeilen = hinweise(meta);
  return zeilen.length === 0 ? '' : `\n${zeilen.join('\n')}\n`;
}

/** Zeilen je Sprache, absteigend. */
export function sprachverteilung(dateien: GescannteDatei[]): Array<[string, number]> {
  const proSprache = new Map<string, number>();
  for (const datei of dateien) {
    proSprache.set(datei.sprache, (proSprache.get(datei.sprache) ?? 0) + datei.zeilen);
  }
  return [...proSprache.entries()].sort((a, b) => b[1] - a[1]);
}

/** Anteil als ganze Prozentzahl. */
export function prozent(teil: number, gesamt: number): string {
  const basis = gesamt > 0 ? gesamt : 1;
  return `${Math.round((teil / basis) * 100)} %`;
}

/** Verzeichnisbaum aus den (sortierten) Pfaden. */
export function baum(dateien: GescannteDatei[]): string[] {
  const zeilen: string[] = [];
  let letzteOrdner: string[] = [];

  for (const datei of dateien) {
    const teile = datei.relativerPfad.split('/');
    const ordner = teile.slice(0, -1);

    let gemeinsam = 0;
    while (gemeinsam < ordner.length && letzteOrdner[gemeinsam] === ordner[gemeinsam]) {
      gemeinsam += 1;
    }
    for (let tiefe = gemeinsam; tiefe < ordner.length; tiefe += 1) {
      zeilen.push(`${'  '.repeat(tiefe)}- ${ordner[tiefe]}/`);
    }
    letzteOrdner = ordner;
    zeilen.push(`${'  '.repeat(ordner.length)}- ${teile[teile.length - 1]}`);
  }

  return zeilen;
}
