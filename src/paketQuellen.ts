/**
 * Die zwei Volltext-Teile des Pakets: Dokumentation und Domänenquellen.
 *
 * Jede Datei erscheint im Paket genau einmal mit Inhalt: Markdown-Dateien in
 * `Dokumentation.md`, alles andere in der Quellendatei der Domäne.
 * Gegenstück in der GUI: `tauri-app/src-tauri/src/paketquellen.rs`.
 */
import { Domaene, istDokumentation } from '@propakt/core';
import { hinweisblock, kopf } from './paketBasis';
import { GescannteDatei } from './scanner';
import { SchemaMeta } from '@propakt/core';
import { codeBlockSprache } from '@propakt/core';

/** Selects an outer Markdown fence longer than every backtick run in the source. */
function codeFence(inhalt: string): string {
  let longest = 0;
  let current = 0;
  for (const character of inhalt) {
    if (character === '`') { current += 1; longest = Math.max(longest, current); }
    else current = 0;
  }
  return '`'.repeat(Math.max(3, longest + 1));
}

/** Eine Datei im Volltext. */
function volltext(datei: GescannteDatei): string {
  const fence = codeFence(datei.inhalt);
  return '\n---\n\n### `' + datei.relativerPfad + '`\n\n' +
    '**Sprache:** ' + datei.sprache + '  **Zeilen:** ' + datei.zeilen + '  **Zeichen:** ' + datei.zeichen + '\n\n' +
    fence + codeBlockSprache(datei.sprache) + '\n' + datei.inhalt + '\n' + fence + '\n';
}
/** Alle Markdown-Dateien im Volltext (Doku-Linse). */
export function dokumentation(meta: SchemaMeta, dateien: GescannteDatei[]): string {
  const dokumente = dateien.filter(istDokumentation);

  let text = kopf('Dokumentation', meta, [`**Dokumente:** ${dokumente.length}`]);
  text += hinweisblock(meta);

  if (dokumente.length === 0) {
    text += '\nKeine Dokumentationsdateien gefunden.\n';
    return text;
  }

  for (const datei of dokumente) {
    const fence = codeFence(datei.inhalt);
    text += '\n---\n\n## `' + datei.relativerPfad + '`\n\n';
    text += '**Sprache:** ' + datei.sprache + '  **Zeilen:** ' + datei.zeilen + '  **Zeichen:** ' + datei.zeichen + '\n\n';
    text += fence + codeBlockSprache(datei.sprache) + '\n' + datei.inhalt + '\n' + fence + '\n';
  }

  return text;
}

/** Vollständiger Code einer Domäne (ohne Dokumentationsdateien). */
export function quellen(meta: SchemaMeta, domaene: Domaene, dateiname: string): string {
  const dateien = domaene.dateien.filter((datei) => !istDokumentation(datei));
  const zeilen = dateien.reduce((summe, datei) => summe + datei.zeilen, 0);

  let text = kopf(`Quellen der Domäne \`${domaene.name}\``, meta, [
    `**Datei:** \`${dateiname}\``,
    `**Umfang:** ${dateien.length} Dateien · ${zeilen} Zeilen`,
  ]);
  text += hinweisblock(meta);

  if (dateien.length === 0) {
    text += '\nDiese Domäne enthält nur Dokumentationsdateien; sie stehen in `Dokumentation.md`.\n';
    return text;
  }

  text += '\n## Dateiindex\n\n';
  dateien.forEach((datei, index) => {
    text += `${index + 1}. \`${datei.relativerPfad}\` — ${datei.sprache}, ${datei.zeilen} Zeilen, ${datei.zeichen} Zeichen\n`;
  });

  for (const datei of dateien) {
    text += volltext(datei);
  }

  return text;
}
