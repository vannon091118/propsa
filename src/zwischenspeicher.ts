/**
 * Scan-Zwischenspeicher (Node-Seite): baumSignatur aus dem Dateisystem,
 * Cache-Dateien unter `~/.propsa/cache/` und die Ablauf-Logik.
 *
 * Vertrag (Signatur, Treffer-Entscheidung, Format-Prüfung) lebt in
 * `@propsa/core` (`zwischenspeicher.ts`); dieses Modul enthält nur die
 * Dateisystem-Arbeit. Der Schlüssel ist die Scan-Konfiguration (Pfad,
 * Muster, Limits) – nicht der Projektinhalt; der Inhalt steckt in der
 * Signatur.
 *
 * Rust-Spiegel: `tauri-app/src-tauri/src/zwischenspeicher.rs`.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  BaumEintrag,
  CacheEintrag,
  ZWISCHENSPEICHER_SCHEMA,
  ZWISCHENSPEICHER_VERSION,
  baumSignatur,
  cacheTreffer,
} from '@propsa/core';
import { PROPSA_HEIM } from './history';
import { ScanErgebnis, ScannerOptionen, scanDirectory, kandidatenSammeln } from './scanner';

const CACHE_ORDNER = 'cache';

/** Cache-Datei einer Konfiguration: `~/.propsa/cache/<hash>.json`. */
export function cachePfad(schluessel: string): string {
  const hash = crypto.createHash('sha256').update(schluessel).digest('hex');
  return path.join(PROPSA_HEIM, CACHE_ORDNER, `${hash}.json`);
}

/** Stabiler Schlüssel aus der Scan-Konfiguration (Pfad, Muster, Limits). */
export function konfigurationsSchluessel(
  basisPfad: string,
  excludes: string[],
  includes: string[],
  maxFiles?: number,
  maxLines?: number
): string {
  return JSON.stringify({
    basisPfad: path.resolve(basisPfad),
    excludes,
    includes,
    maxFiles: maxFiles ?? null,
    maxLines: maxLines ?? null,
  });
}

/**
 * Baum-Signatur je Kandidat: Pfad, Größe, Änderungszeit.
 *
 * Wirft bei nicht mehr lesbarer Metadaten-Datei – der Aufrufer behandelt das
 * als Cache-Vorbeiflug, nie als „unverändert“.
 */
export function baumEintraege(
  basisPfad: string,
  kandidaten: string[]
): BaumEintrag[] {
  const eintraege: BaumEintrag[] = [];
  for (const relativerPfad of kandidaten) {
    const status = fs.statSync(path.join(basisPfad, relativerPfad));
    eintraege.push({
      relativerPfad,
      groesse: status.size,
      mtime: status.mtimeMs,
    });
  }
  return eintraege;
}

/** Sieht das geladene Objekt wie ein Scan-Ergebnis aus? */
function scanErgebnisGueltig(kandidat: unknown): boolean {
  if (typeof kandidat !== 'object' || kandidat === null) {
    return false;
  }
  const felder = kandidat as Record<string, unknown>;
  return (
    Array.isArray(felder.dateien) &&
    typeof felder.uebersprungen === 'number'
  );
}

/** Cache-Datei lesen; fehlendes oder kaputtes File ergibt `null`. */
export function ladeCache(schluessel: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(cachePfad(schluessel), 'utf8'));
  } catch {
    return null;
  }
}

/** Ergebnis samt Signatur unter dem Konfigurations-Schlüssel ablegen. */
export function speichereCache(
  schluessel: string,
  signatur: BaumEintrag[],
  ergebnis: ScanErgebnis
): void {
  const eintrag: CacheEintrag<ScanErgebnis> = {
    schema: ZWISCHENSPEICHER_SCHEMA,
    version: ZWISCHENSPEICHER_VERSION,
    // Zeitpunkt des Speicherns; der Lauf-zeitstempel gehört zur Ausgabe,
    // nicht zum Cache – ein Treffer erhält in propsa.ts einen frischen.
    zeitstempel: new Date().toISOString(),
    signatur: baumSignatur(signatur),
    ergebnis,
  };
  const pfad = cachePfad(schluessel);
  fs.mkdirSync(path.dirname(pfad), { recursive: true });
  fs.writeFileSync(pfad, `${JSON.stringify(eintrag)}\n`, 'utf8');
}

/**
 * Scan mit optionalem Zwischenspeicher: erst Kandidaten sammeln und
 * signieren, dann Treffer prüfen, sonst der volle Scan. Ein gelungener
 * Lauf wird gespeichert – ein Guardrail-Abbruch nie (LimitFehler fliegt
 * hier durch, es entsteht kein Teilergebnis im Cache).
 */
export async function laufMitCache(
  optionen: ScannerOptionen & { cache: boolean }
): Promise<{ ergebnis: ScanErgebnis; ausZwischenspeicher: boolean }> {
  const { cache, ...scanOptionen } = optionen;
  if (!cache) {
    return {
      ergebnis: await scanDirectory(scanOptionen),
      ausZwischenspeicher: false,
    };
  }

  // Ein einziger Kandidaten-Gang für Signatur und Scan – die Signatur
  // beschreibt exakt die Menge, die der Scan liest.
  const kandidaten = await kandidatenSammeln(
    scanOptionen.basisPfad,
    scanOptionen.excludes,
    scanOptionen.includes
  );

  let signatur: BaumEintrag[];
  try {
    signatur = baumEintraege(scanOptionen.basisPfad, kandidaten);
  } catch {
    // Metadaten nicht lesbar ⇒ lieber ein echter Scan als ein fraglicher Treffer.
    return {
      ergebnis: await scanDirectory(scanOptionen),
      ausZwischenspeicher: false,
    };
  }

  const schluessel = konfigurationsSchluessel(
    scanOptionen.basisPfad,
    scanOptionen.excludes,
    scanOptionen.includes,
    scanOptionen.maxFiles,
    scanOptionen.maxLines
  );

  const gespeichert = cacheTreffer<ScanErgebnis>(
    ladeCache(schluessel),
    signatur,
    // Integrität: gelesene + übersprungene Dateien müssen die signierte
    // Menge ergeben – sonst stimmt der gespeicherte Lauf nicht zur Signatur.
    (kandidat) => {
      if (!scanErgebnisGueltig(kandidat)) {
        return false;
      }
      const ergebnis = kandidat as ScanErgebnis;
      return ergebnis.dateien.length + ergebnis.uebersprungen === signatur.length;
    }
  );
  if (gespeichert) {
    return { ergebnis: gespeichert, ausZwischenspeicher: true };
  }

  const ergebnis = await scanDirectory({ ...scanOptionen, kandidaten });
  speichereCache(schluessel, signatur, ergebnis);
  return { ergebnis, ausZwischenspeicher: false };
}
