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

/** Eine Datei im Volltext. */
function volltext(datei: GescannteDatei): string {
  let text = `\n---\n\n### \`${datei.relativerPfad}\`\n\n`;
  text += `**Sprache:** ${datei.sprache}  **Zeilen:** ${datei.zeilen}  **Zeichen:** ${datei.zeichen}\n\n`;
  text += `\`\`\`${codeBlockSprache(datei.sprache)}\n${datei.inhalt}\n\`\`\`\n`;
  return text;
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
    text += `\n---\n\n## \`${datei.relativerPfad}\`\n\n`;
    text += `**Sprache:** ${datei.sprache}  **Zeilen:** ${datei.zeilen}  **Zeichen:** ${datei.zeichen}\n\n`;
    text += `\`\`\`${codeBlockSprache(datei.sprache)}\n${datei.inhalt}\n\`\`\`\n`;
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
