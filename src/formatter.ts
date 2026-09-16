/**
 * Einzeldatei-Ausgabe des Projekts (Markdown).
 *
 * Das ist der Bequemlichkeitspfad: alles in einer Datei zum Einfügen in einen
 * Chat. Der Standard ist das Kontextpaket (`src/paket.ts`), weil dort je Domäne
 * eine Datei entsteht und nichts doppelt vorkommt.
 */
import { GescannteDatei } from './scanner';
import { codeBlockSprache } from './sprache';
import { SchemaMeta } from './schema';

/** Markdown: Header, Übersicht der ersten 50 Dateien, Codeblock je Datei. */
export function formatContext(dateien: GescannteDatei[], meta: SchemaMeta): string {
  const gesamtZeilen = dateien.reduce((summe, datei) => summe + datei.zeilen, 0);

  let ausgabe = '# Projekt-Kontext\n\n';
  ausgabe += `**Quelle:** ${meta.titel}\n`;
  ausgabe += `**Erzeugt:** ${meta.zeitstempel}\n`;
  ausgabe += `**Dateien:** ${dateien.length}\n`;
  ausgabe += `**Gesamtzeilen:** ${gesamtZeilen}\n`;
  // Der Kontext muss erkennbar machen, wenn er unvollständig ist.
  if (meta.uebersprungen > 0) {
    ausgabe += `**Übersprungen:** ${meta.uebersprungen} Datei(en) nicht lesbar oder binär\n`;
  }
  ausgabe += '\n---\n\n';

  ausgabe += '## Übersicht\n\n';
  for (const datei of dateien.slice(0, 50)) {
    ausgabe += `- \`${datei.relativerPfad}\` — ${datei.sprache}, ${datei.zeilen} Zeilen, ${datei.zeichen} Zeichen\n`;
  }
  ausgabe += '\n---\n\n';

  for (const datei of dateien) {
    ausgabe += formatierteDatei(datei);
  }

  return ausgabe;
}

function formatierteDatei(datei: GescannteDatei): string {
  return (
    `### \`${datei.relativerPfad}\`\n` +
    `**Sprache:** ${datei.sprache}  **Zeilen:** ${datei.zeilen}  **Zeichen:** ${datei.zeichen}\n\n` +
    `\`\`\`${codeBlockSprache(datei.sprache)}\n${datei.inhalt}\n\`\`\`\n\n`
  );
}
