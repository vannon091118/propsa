/**
 * Das Kontextpaket: mehrere Dateien in einem Ordner, aufgeteilt nach Domänen.
 *
 * Aufbau (Vertrag: `wiki/Kontextpaket.md`):
 *
 * ```text
 * Zusammenfassung.md      Einstieg für Sprachmodelle
 * Architektur.md          Verzeichnisbaum und Dateiübersicht
 * Dokumentation.md        alle Markdown-Dateien im Volltext
 * Quellen/<Domäne>.md     vollständiger Code je Domäne
 * kontext.json            dieselben Daten maschinenlesbar
 * ```
 */
import * as fs from 'fs';
import * as path from 'path';
import { gruppiereNachDomaene, quellenName } from '@propakt/core';
import { architektur, zusammenfassung } from './paketTexte';
import { dokumentation, quellen } from './paketQuellen';
import { kritik } from './paketKritik';
import { GescannteDatei } from './scanner';
import { kontextAlsJson, SchemaMeta } from '@propakt/core';

/** Eine Datei des Pakets; `name` darf einen Unterordner enthalten. */
export interface Paketdatei {
  name: string;
  inhalt: string;
}

/** Baut alle Dateien des Pakets. */
export function paketBauen(
  meta: SchemaMeta,
  dateien: GescannteDatei[]
): Paketdatei[] {
  const domaenen = gruppiereNachDomaene(dateien);

  const paket: Paketdatei[] = [
    {
      name: 'Zusammenfassung.md',
      inhalt: zusammenfassung(meta, dateien, domaenen),
    },
    { name: 'Architektur.md', inhalt: architektur(meta, dateien, domaenen) },
    { name: 'Kritik.md', inhalt: kritik(meta, dateien) },
    { name: 'Dokumentation.md', inhalt: dokumentation(meta, dateien) },
    { name: 'kontext.json', inhalt: `${kontextAlsJson(meta, dateien)}\n` },
  ];

  for (const domaene of domaenen) {
    paket.push({
      name: quellenName(domaene),
      inhalt: quellen(meta, domaene, quellenName(domaene)),
    });
  }

  return paket;
}

/**
 * Schreibt das Paket in einen Ordner und liefert die geschriebenen Pfade.
 *
 * Der Ordner wird angelegt, falls er fehlt; vorhandene Dateien desselben Namens
 * werden ersetzt.
 */
export function paketSchreiben(ordner: string, paket: Paketdatei[]): string[] {
  const ziel = path.resolve(ordner);
  return paket.map((datei) => {
    const pfad = path.join(ziel, datei.name);
    fs.mkdirSync(path.dirname(pfad), { recursive: true });
    fs.writeFileSync(pfad, datei.inhalt, 'utf8');
    return pfad;
  });
}
