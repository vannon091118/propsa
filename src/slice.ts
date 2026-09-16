/**
 * Slice-Selektoren: zielbasierte Auswahl statt arbiträrer Grenzen.
 *
 * Der frühere Kompaktmodus (≤ 500 Zeilen, ≤ 50 Dateien) ist entfernt. Statt
 * dessen wählt der Aufrufer ein Ziel:
 *
 * - `einstiegspunktSelektor`: Einstiegsdatei plus ihre lokale Import-Kette.
 * - `tiefeSelektor`: nur Dateien bis zu einer Ordnertiefe.
 * - `topDateienSelektor`: die n größten Dateien nach Zeilen.
 *
 * Selektoren dürfen kombiniert werden; sie schneiden die Menge Schritt für
 * Schritt zurück. Die Reihenfolge bleibt immer die kanonische Scan-Reihenfolge
 * (siehe `kanonischeReihenfolge` in `scanner.ts`).
 */
import { GescannteDatei, kanonischeReihenfolge } from './scanner';

/** Endungen, die beim Auflösen lokaler Imports ergänzt werden. */
const LOKALE_ENDUNGEN = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/** Statische relative Imports (`./x`, `../y`) im Quelltext erkennen. */
function importSpezifikationen(inhalt: string): string[] {
  const spezifikationen: string[] = [];
  const muster = [
    /(?:from|import)\s*['"](\.[^'"]+)['"]/g,
    /(?:require|import)\s*\(\s*['"](\.[^'"]+)['"]/g,
  ];
  for (const regex of muster) {
    for (const treffer of inhalt.matchAll(regex)) {
      spezifikationen.push(treffer[1]);
    }
  }
  return spezifikationen;
}

/** Löst eine relative Spezifikation gegen die gescannten Dateien auf. */
function auflösen(vonDatei: string, spezifikation: string, vorhanden: Set<string>): string | null {
  const teile = vonDatei.split('/');
  teile.pop();
  let basis = teile.join('/');

  for (const teil of spezifikation.split('/')) {
    if (teil === '.' || teil === '') {
      continue;
    }
    if (teil === '..') {
      basis = basis.split('/').slice(0, -1).join('/');
      continue;
    }
    basis = basis ? `${basis}/${teil}` : teil;
  }

  const kandidaten = [
    basis,
    ...LOKALE_ENDUNGEN.map(endung => basis + endung),
    ...LOKALE_ENDUNGEN.map(endung => `${basis}/index${endung}`),
  ];
  return kandidaten.find(kandidat => vorhanden.has(kandidat)) ?? null;
}

/**
 * Einstiegspunkt plus transitive lokale Import-Kette.
 *
 * Nur relative Imports werden aufgelöst; Paket-Imports (`react`, `lodash`)
 * gehören nicht zum Projekt und bleiben außen vor. Nicht-JS/TS-Dateien
 * (Dokumentation, Konfiguration) werden von dieser Linse nicht nachgezogen.
 */
export function einstiegspunktSelektor(
  dateien: GescannteDatei[],
  einstiegspunkt: string
): GescannteDatei[] {
  const index = new Map(dateien.map(datei => [datei.relativerPfad, datei]));
  const pfade = new Set(index.keys());

  if (!pfade.has(einstiegspunkt)) {
    throw new Error(
      `Einstiegspunkt "${einstiegspunkt}" ist im Scan nicht enthalten. ` +
        'Pfad relativ zur Scan-Basis angeben oder Include-/Exclude-Muster prüfen.'
    );
  }

  const behalten = new Set<string>();
  const warteschlange = [einstiegspunkt];

  while (warteschlange.length > 0) {
    const pfad = warteschlange.pop() as string;
    if (behalten.has(pfad)) {
      continue;
    }
    behalten.add(pfad);

    const datei = index.get(pfad);
    if (!datei) {
      continue;
    }
    for (const spezifikation of importSpezifikationen(datei.inhalt)) {
      const ziel = auflösen(pfad, spezifikation, pfade);
      if (ziel && !behalten.has(ziel)) {
        warteschlange.push(ziel);
      }
    }
  }

  return dateien.filter(datei => behalten.has(datei.relativerPfad));
}

/** Nur Dateien, deren relativer Pfad höchstens `tiefe` Segmente hat. */
export function tiefeSelektor(dateien: GescannteDatei[], tiefe: number): GescannteDatei[] {
  if (!Number.isInteger(tiefe) || tiefe < 1) {
    throw new Error(`--depth braucht eine ganze Zahl ≥ 1, erhalten: ${tiefe}`);
  }
  return dateien.filter(datei => datei.relativerPfad.split('/').length <= tiefe);
}

/** Die `n` größten Dateien nach Zeilen; Auswahl nach Größe, Reihenfolge bleibt. */
export function topDateienSelektor(dateien: GescannteDatei[], n: number): GescannteDatei[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`--top-files braucht eine ganze Zahl ≥ 1, erhalten: ${n}`);
  }
  const größte = [...dateien]
    .sort((a, b) => b.zeilen - a.zeilen || (a.relativerPfad < b.relativerPfad ? -1 : 1))
    .slice(0, n)
    .map(datei => datei.relativerPfad);
  const menge = new Set(größte);
  return dateien.filter(datei => menge.has(datei.relativerPfad));
}

/** Wendet Selektoren in fester Reihenfolge an (Einstieg, Tiefe, Top). */
export function selektieren(
  dateien: GescannteDatei[],
  selektoren: {
    einstiegspunkt?: string;
    tiefe?: number;
    topDateien?: number;
  }
): GescannteDatei[] {
  let auswahl = dateien;
  if (selektoren.einstiegspunkt) {
    auswahl = einstiegspunktSelektor(auswahl, selektoren.einstiegspunkt);
  }
  if (selektoren.tiefe !== undefined) {
    auswahl = tiefeSelektor(auswahl, selektoren.tiefe);
  }
  if (selektoren.topDateien !== undefined) {
    auswahl = topDateienSelektor(auswahl, selektoren.topDateien);
  }
  return kanonischeReihenfolge(auswahl.map(datei => datei.relativerPfad)).map(pfad =>
    auswahl.find(datei => datei.relativerPfad === pfad)
  ) as GescannteDatei[];
}
