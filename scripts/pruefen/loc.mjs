/**
 * Zeilenzählung – einzige Quelle für `npm run pruefen` und das Commit-Gate.
 *
 * Ausgelagert, weil zwei Skripte dieselbe Zahl brauchen und PROPAKT keine
 * zweite Wahrheit je Regel duldet: pruefen.mjs meldet die Grenzverletzung,
 * commit_gate.mjs verlangt genau diese Zahl im Commit-Body.
 *
 * Gezählt werden Quelltext-Endungen, nicht Markdown – die LOC-Grenze gilt
 * für Code, nicht für Doku (AGENTS.md).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const WURZEL = resolve(import.meta.dirname, "..", "..");
export const LOC_GRENZE = 300;

/** Verzeichnisse, die nie Quelltext enthalten. */
export const UEBERSPRUNGEN = new Set([
  "node_modules", "dist", "target", "gen", ".freebuff", ".agents", "test-output", "snapshots",
]);

export const QUELL_ENDUNGEN = [".ts", ".tsx", ".rs", ".mjs", ".js", ".css"];

export function dateienSammeln(ordner, endungen = QUELL_ENDUNGEN, treffer = []) {
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    if (UEBERSPRUNGEN.has(eintrag.name)) continue;
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) dateienSammeln(pfad, endungen, treffer);
    else if (endungen.some(endung => eintrag.name.endsWith(endung))) treffer.push(pfad);
  }
  return treffer;
}

export const relativ = pfad => relative(WURZEL, pfad).split(sep).join("/");

export function locMessen() {
  let groesste = 0;
  const ueber = [];
  const dateien = dateienSammeln(WURZEL);
  for (const pfad of dateien) {
    const zeilen = readFileSync(pfad, "utf8").split("\n").length;
    groesste = Math.max(groesste, zeilen);
    if (zeilen > LOC_GRENZE) ueber.push({ pfad: relativ(pfad), zeilen });
  }
  return { dateien: dateien.length, groesste, grenze: LOC_GRENZE, ueber };
}

/** Die Zeile, die der Commit-Body wörtlich enthalten muss. */
export const locZeile = mess => `LOC: ${mess.dateien} Dateien, größte ${mess.groesste} Zeilen (Grenze ${mess.grenze})`;
