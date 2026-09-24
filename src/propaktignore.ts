/**
 * Projektspezifische Ausschlüsse: `.propaktignore` im Projekt-Root.
 *
 * Die Datei ist versionierbar und ergänzt die eingebauten Ausschlüsse
 * (Katalog der ignorierten Verzeichnisse, `AUSGESCHLOSSENE_DATEIEN`,
 * `-e`-Muster). Es gilt:
 *
 * - eine Zeile = ein Glob-Muster, `#`-Kommentare und Leerzeilen erlaubt,
 * - `!muster` negiert: ein passender Eintrag der Vorbelegung wird wieder
 *   eingeschlossen (nützlich für Pfade, die der Standard ausschließt),
 * - gematcht wird gegen relativen Pfad und Dateinamen wie bei `-e`,
 * - die Datei selbst und `.propakt/` werden nie gescannt.
 *
 * Gegenstück in der GUI: `tauri-app/src-tauri/src/filter.rs`
 * (`propaktignore_muster`); beide Seiten müssen zusammen geändert werden.
 */
import * as fs from 'fs';
import * as path from 'path';

export const PROPAKTIGNORE_DATEI = '.propaktignore';

/** Dateiname vor der Umbenennung – nur als Rückfall, siehe `propaktignoreLesen`. */
const PROPAKTIGNORE_ALT = '.propsaignore';

/**
 * Zeilen der Ignore-Datei des Projekts (ohne Kommentare/Leerzeilen).
 *
 * Gelesen wird `.propaktignore`; fehlt sie, wird auf den Altnamen
 * `.propsaignore` zurückgefallen, damit die Ausschlüsse eines bestehenden
 * Projekts durch die Umbenennung nicht wirkungslos werden. Liegen beide vor,
 * gewinnt der neue Name – die alte Datei wird dann ignoriert.
 */
export function propaktignoreLesen(basisPfad: string): string[] {
  let inhalt: string | null = null;
  for (const datei of [PROPAKTIGNORE_DATEI, PROPAKTIGNORE_ALT]) {
    try {
      inhalt = fs.readFileSync(path.join(basisPfad, datei), 'utf8');
      break;
    } catch {
      // nächste Datei versuchen
    }
  }
  if (inhalt === null) return [];
  return inhalt
    .split(/\r?\n/)
    .map(zeile => zeile.trim())
    .filter(zeile => zeile.length > 0 && !zeile.startsWith('#'));
}

/**
 * Verzeichnis-Freigaben: Aus `!muster`-Negationen die Namen derjenigen
 * Katalog-Verzeichnisse extrahieren, die damit wieder betreten werden
 * dürfen (`!vendor/`, `!vendor`, `!vendor/**` ⇒ `vendor`).
 */
export function negierteVerzeichnisse(negationen: string[]): string[] {
  const namen: string[] = [];
  for (const muster of negationen) {
    if (!muster.startsWith('!')) {
      continue;
    }
    const pfad = muster
      .slice(1)
      .trim()
      .replace(/\*\*$/,'')
      .replace(/\/$/, '');
    if (pfad && !pfad.includes('/') && !pfad.includes('*')) {
      namen.push(pfad.toLowerCase());
    }
  }
  return namen;
}

/**
 * Merged die Ausschlussmuster: Eingebauter Katalog + `-e` + `.propaktignore`,
 * danach Negationen (`!…`) aus `.propaktignore` angewendet.
 *
 * Rückgabe: wirksame Exclude-Muster (mit `!`-Einträgen) und ein Flag, ob die
 * Datei vorhanden war – für die Sichtbarkeit im Paketkopf.
 */
export function ausschluesseMergen(
  basisPfad: string,
  eingebaute: string[],
  benutzerMuster: string[]
): { excludes: string[]; propaktignoreAktiv: boolean } {
  const dateiMuster = propaktignoreLesen(basisPfad);
  const negationen = dateiMuster.filter(m => m.startsWith('!'));
  const positive = dateiMuster.filter(m => !m.startsWith('!'));

  if (negationen.length === 0) {
    return {
      excludes: [...eingebaute, ...benutzerMuster, ...positive],
      propaktignoreAktiv: dateiMuster.length > 0,
    };
  }

  // Negation: ein `!muster` entfernt jedes eingebaute Muster, das denselben
  // Pfad-Präfix hat (`!vendor/` entfernt `vendor/**`). Zusätzlich werden
  // `!…`-Negationen ans Ende gestellt, damit `istAusgeschlossen` sie zuletzt
  // auswertet.
  const negiertePfade = new Set(
    negationen.map(m => m.slice(1).trim().replace(/\*\*$/, '').replace(/\/$/, ''))
  );
  const gefiltert = eingebaute.filter(m => {
    if (m.startsWith('!')) {
      return false;
    }
    const normalisiert = m.replace(/\/\*\*$/, '').replace(/\/$/, '');
    return !negiertePfade.has(normalisiert);
  });
  return {
    excludes: [...gefiltert, ...benutzerMuster, ...positive, ...negationen],
    propaktignoreAktiv: true,
  };
}
