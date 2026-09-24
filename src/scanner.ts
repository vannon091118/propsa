import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { dateiLesen, zeilenZaehlen } from './datei';
import { IGNORIERTE_VERZEICHNISSE } from '@propakt/core';
import { negierteVerzeichnisse } from './propaktignore';
import { spracheErkennen } from '@propakt/core';

export interface ScannerOptionen {
  basisPfad: string;
  excludes: string[];
  includes: string[];
  maxFiles?: number;
  maxLines?: number;
  /**
   * Vorgesammelte Kandidaten (kanonisch sortiert, Ausgabe von
   * `kandidatenSammeln`); spart den zweiten Verzeichnisgang, etwa wenn der
   * Zwischenspeicher dieselbe Menge bereits signiert hat.
   */
  kandidaten?: string[];
}

export interface GescannteDatei {
  relativerPfad: string;
  sprache: string;
  zeilen: number;
  zeichen: number;
  inhalt: string;
}

export interface ScanErgebnis {
  dateien: GescannteDatei[];
  uebersprungen: number;
}

/**
 * Fail Loud: Limits are hard guards - exceeding them aborts processing
 */
export class LimitFehler extends Error {
  constructor(nachricht: string) {
    super(nachricht);
    this.name = 'LimitFehler';
  }
}

/**
 * Pattern matching like Rust filter: tests relative path and filename
 * '*' does not span directory separators, dotfiles are included
 */
const MUSTER_OPTIONEN = { dot: true, matchBase: true } as const;

function passtMuster(muster: string, relativerPfad: string, name: string): boolean {
  const normalisiert = muster.replace(/\\/g, '/');
  return (
    minimatch(relativerPfad, normalisiert, MUSTER_OPTIONEN) ||
    minimatch(name, normalisiert, MUSTER_OPTIONEN)
  );
}

/**
 * Excludes evaluated before Includes; empty Include means "all"
 * Negations (!muster from .propaktignore) are processed in order:
 * A matching !… entry saves a file even if other Exclude matched
 * Order in excludes: built-in patterns, then positive .propaktignore,
 * then !… negations (mirrors ist_ausgeschlossen in filter.rs)
 */
function istAusgeschlossen(
  name: string,
  relativerPfad: string,
  excludes: string[],
  includes: string[]
): boolean {
  let getroffen = false;
  for (const muster of excludes) {
    if (muster.length === 0) continue;
    if (muster.startsWith('!')) {
      if (passtMuster(muster.slice(1).trim(), relativerPfad, name)) {
        getroffen = false;
      }
    } else if (passtMuster(muster, relativerPfad, name)) {
      getroffen = true;
    }
  }
  if (includes.length === 0) return getroffen;
  return getroffen || !includes.some(muster => muster.length > 0 && passtMuster(muster, relativerPfad, name));
}

/**
 * Canonical order: paths without leading dot first, then dotfiles,
 * ascending within groups. Determines which files hit a limit,
 * never depends on filesystem state.
 */
export function kanonischeReihenfolge(pfade: string[]): string[] {
  return [...pfade].sort((a, b) => {
    const aVersteckt = a.startsWith('.') ? 1 : 0;
    const bVersteckt = b.startsWith('.') ? 1 : 0;
    if (aVersteckt !== bVersteckt) return aVersteckt - bVersteckt;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/**
 * Phase 1: collect all candidates and sort deterministically
 * !verzeichnis/-negations from .propaktignore lift the ban
 */
export async function kandidatenSammeln(
  basisPfad: string,
  excludes: string[],
  includes: string[]
): Promise<string[]> {
  const kandidaten: string[] = [];
  const freigegebene = new Set(negierteVerzeichnisse(excludes));

  async function durchsuchen(aktuellerPfad: string, relativesBasis: string): Promise<void> {
    const eintraege = await fs.promises.readdir(aktuellerPfad, { withFileTypes: true });

    for (const eintrag of eintraege) {
      const vollerPfad = path.join(aktuellerPfad, eintrag.name);
      const relativerPfad = [relativesBasis, eintrag.name].filter(Boolean).join('/');

      if (eintrag.isDirectory()) {
        const klein = eintrag.name.toLowerCase();
        if (
          IGNORIERTE_VERZEICHNISSE.includes(klein) &&
          !freigegebene.has(klein) &&
          !freigegebene.has(`${klein}/`)
        ) {
          continue;
        }
        await durchsuchen(vollerPfad, relativerPfad);
        continue;
      }

      if (!eintrag.isFile()) continue;

      if (istAusgeschlossen(eintrag.name, relativerPfad, excludes, includes)) {
        continue;
      }

      kandidaten.push(relativerPfad);
    }
  }

  await durchsuchen(basisPfad, '');

  return kanonischeReihenfolge(kandidaten);
}

/**
 * Phase 2: read candidates; limits break before processing
 * File limit checked before reading, line limit after reading file head
 * Nothing is written in either case
 */
export async function scanDirectory(optionen: ScannerOptionen): Promise<ScanErgebnis> {
  const { basisPfad, excludes, includes, maxFiles, maxLines } = optionen;

  const kandidaten =
    optionen.kandidaten ?? (await kandidatenSammeln(basisPfad, excludes, includes));

  const dateien: GescannteDatei[] = [];
  let uebersprungen = 0;
  let gesamtZeilen = 0;

  for (const relativerPfad of kandidaten) {
    if (maxFiles !== undefined && dateien.length >= maxFiles) {
      throw new LimitFehler(
        `Limit von ${maxFiles} Dateien erreicht – Abbruch vor "${relativerPfad}". ` +
          'Es wird kein unvollständiges Paket geschrieben. ' +
          'Grenze erhöhen oder mit --no-limits alle Guardrails abschalten.'
      );
    }

    const gelesen = dateiLesen(path.join(basisPfad, relativerPfad));
    if (gelesen === null) {
      uebersprungen += 1;
      continue;
    }

    const zeilen = zeilenZaehlen(gelesen.inhalt);

    if (maxLines !== undefined && gesamtZeilen + zeilen > maxLines) {
      throw new LimitFehler(
        `Limit von ${maxLines} Zeilen erreicht – Abbruch vor "${relativerPfad}" ` +
          `(${zeilen} Zeilen). Es wird kein unvollständiges Paket geschrieben. ` +
          'Grenze erhöhen oder mit --no-limits alle Guardrails abschalten.'
      );
    }

    dateien.push({
      relativerPfad,
      sprache: spracheErkennen(relativerPfad),
      zeilen,
      zeichen: gelesen.zeichen,
      inhalt: gelesen.inhalt,
    });
    gesamtZeilen += zeilen;
  }

  return { dateien, uebersprungen };
}