/**
 * Die zwei Übersichtstexte des Pakets: Zusammenfassung und Architektur.
 *
 * Gegenstück in der GUI: `tauri-app/src-tauri/src/pakettexte.rs`.
 */
import { Domaene, quellenName } from '@propakt/core';
import { baum, hinweisblock, kopf, prozent, sprachverteilung } from './paketBasis';
import { GescannteDatei } from './scanner';
import { SCHEMA_VERSION, SchemaMeta } from '@propakt/core';

/** Einstiegstext: Kennzahlen, Domänen, Sprachen, Hotspots. */
export function zusammenfassung(
  meta: SchemaMeta,
  dateien: GescannteDatei[],
  domaenen: Domaene[]
): string {
  const zeilen = dateien.reduce((summe, datei) => summe + datei.zeilen, 0);
  const zeichen = dateien.reduce((summe, datei) => summe + datei.zeichen, 0);

  let text = kopf('Zusammenfassung', meta, [
    `**Umfang:** ${dateien.length} Dateien · ${zeilen} Zeilen · ${zeichen} Zeichen`,
    `**Domänen:** ${domaenen.length}`,
  ]);
  text += hinweisblock(meta);

  text += '\n## Einstieg für Sprachmodelle\n\n';
  text += 'Dieses Paket beschreibt das Projekt vollständig. Empfohlene Reihenfolge:\n\n';
  text += '1. Diese Zusammenfassung – Umfang, Domänen, Sprachen.\n';
  text += '2. `Architektur.md` – Verzeichnisbaum und Dateiübersicht.\n';
  text += '3. `Quellen/` – der vollständige Code, eine Datei je Domäne.\n';
  text += '4. `Dokumentation.md` – alle Markdown-Dateien im Volltext.\n';
  text += `5. \`kontext.json\` – dieselben Daten maschinenlesbar (schemaVersion ${SCHEMA_VERSION}).\n`;

  text += '\n## Domänen\n\n';
  text += '| Domäne | Dateien | Zeilen | Quellendatei |\n|---|---|---|---|\n';
  for (const domaene of domaenen) {
    text += `| \`${domaene.name}\` | ${domaene.dateien.length} | ${domaene.zeilen} | \`${quellenName(domaene)}\` |\n`;
  }

  text += '\n## Sprachen\n\n';
  for (const [sprache, sprachZeilen] of sprachverteilung(dateien)) {
    text += `- ${sprache}: ${sprachZeilen} Zeilen (${prozent(sprachZeilen, zeilen)})\n`;
  }

  text += '\n## Größte Dateien\n\n';
  for (const datei of [...dateien].sort((a, b) => b.zeilen - a.zeilen).slice(0, 10)) {
    text += `- \`${datei.relativerPfad}\` — ${datei.sprache}, ${datei.zeilen} Zeilen\n`;
  }

  return text;
}

/** Landkarte: Baum und Dateiübersicht je Domäne. */
export function architektur(
  meta: SchemaMeta,
  dateien: GescannteDatei[],
  domaenen: Domaene[]
): string {
  let text = kopf('Architektur', meta, [
    `**Umfang:** ${dateien.length} Dateien · ${domaenen.length} Domänen`,
  ]);
  text += hinweisblock(meta);

  text += '\n## Verzeichnisbaum\n\n';
  text += `${baum(dateien).join('\n')}\n`;

  text += '\n## Domänen im Detail\n';
  for (const domaene of domaenen) {
    text += `\n### Domäne \`${domaene.name}\` (${domaene.dateien.length} Dateien, ${domaene.zeilen} Zeilen)\n\n`;
    text += '| Datei | Sprache | Zeilen | Zeichen |\n|---|---|---|---|\n';
    for (const datei of domaene.dateien) {
      text += `| \`${datei.relativerPfad}\` | ${datei.sprache} | ${datei.zeilen} | ${datei.zeichen} |\n`;
    }
  }

  return text;
}
