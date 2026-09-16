/**
 * Gemeinsames Export-Schema von CLI und GUI (Version 2).
 *
 * Vertrag: `wiki/Export-Schema.md`. Die GUI erzeugt dasselbe JSON in
 * `tauri-app/src-tauri/src/schema.rs`; beide Seiten werden zusammen geändert.
 * Feldnamen bleiben snake_case wie in den Rust-Strukturen, damit ein Export
 * ohne Umbenennung zwischen den Oberflächen ausgetauscht werden kann.
 *
 * Gegenüber Version 1 entfallen `kompakt_ausgelassen` und `abbruch_grund`:
 * Limits brechen jetzt **vor** der Verarbeitung ab (Fail Loud), es gibt kein
 * Teilergebnis mehr, das einen Abbruchgrund erklären müsste.
 */
import { KontextDatei } from './datei';

/** Version des Schemas: bei jeder inkompatiblen Änderung erhöhen. */
export const SCHEMA_VERSION = 2;

/** Eine Datei im Export. */
export interface SchemaDatei {
  relativer_pfad: string;
  sprache: string;
  zeilen: number;
  zeichen: number;
  inhalt: string;
}

/**
 * Kopf- und Zählerdaten eines Exports.
 *
 * Auch intern in snake_case: dieselben Objekte gehen sowohl in den
 * Markdown-Header als auch in das JSON, so dass es keine zweite Schreibweise
 * gibt, die auseinanderlaufen könnte.
 */
export interface SchemaMeta {
  titel: string;
  zeitstempel: string;
  uebersprungen: number;
}

/** Vollständiger Exportinhalt. */
export interface SchemaKontext extends SchemaMeta {
  schemaVersion: number;
  gesamt_dateien: number;
  gesamt_zeilen: number;
  gesamt_zeichen: number;
  dateien: SchemaDatei[];
}

/**
 * Zeitstempel im gemeinsamen Format (lokale Zeit, Sekunden).
 *
 * Bewusst nicht `toLocaleString`: das Schema soll in jedem Gebietsschema
 * dieselbe Form haben wie `chrono` in der GUI.
 */
export function zeitstempelJetzt(): string {
  const jetzt = new Date();
  const zwei = (wert: number) => String(wert).padStart(2, '0');
  const datum = `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`;
  const uhrzeit = `${zwei(jetzt.getHours())}:${zwei(jetzt.getMinutes())}:${zwei(jetzt.getSeconds())}`;
  return `${datum} ${uhrzeit}`;
}

/** Baut das Export-Objekt; die Reihenfolge der Dateien bleibt erhalten. */
export function kontextObjekt(
  meta: SchemaMeta,
  dateien: KontextDatei[]
): SchemaKontext {
  return {
    schemaVersion: SCHEMA_VERSION,
    titel: meta.titel,
    zeitstempel: meta.zeitstempel,
    gesamt_dateien: dateien.length,
    gesamt_zeilen: dateien.reduce((summe, datei) => summe + datei.zeilen, 0),
    gesamt_zeichen: dateien.reduce((summe, datei) => summe + datei.zeichen, 0),
    uebersprungen: meta.uebersprungen,
    dateien: dateien.map(datei => ({
      relativer_pfad: datei.relativerPfad,
      sprache: datei.sprache,
      zeilen: datei.zeilen,
      zeichen: datei.zeichen,
      inhalt: datei.inhalt,
    })),
  };
}

/** JSON-Ausgabe (zwei Leerzeichen Einrückung, wie `to_string_pretty` in Rust). */
export function kontextAlsJson(
  meta: SchemaMeta,
  dateien: KontextDatei[]
): string {
  return JSON.stringify(kontextObjekt(meta, dateien), null, 2);
}
