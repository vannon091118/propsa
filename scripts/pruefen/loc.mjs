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
import { execFileSync } from "node:child_process";
import { join, relative, sep } from "node:path";
import { WURZEL, versionierteDateien } from "../dateien.mjs";

export { WURZEL };
export const LOC_GRENZE = 300;

/** Verzeichnisse, die nie Quelltext enthalten. */
export const UEBERSPRUNGEN = new Set([
  "node_modules", "dist", "target", "gen", ".freebuff", ".agents", "test-output", "snapshots",
]);

export const QUELL_ENDUNGEN = [".ts", ".tsx", ".rs", ".mjs", ".js", ".css"];

/** Ein Name, der aus der Zählung herausfällt – Verzeichnis oder Datei. */
const ausgeschlossen = name => UEBERSPRUNGEN.has(name);

/**
 * Zählt dieser Pfad als Quelldatei? Einzige Entscheidungsstelle.
 *
 * Arbeitsbaumlauf und Indexlauf benutzen beide diese Funktion. Sie
 * unterscheiden sich nur darin, welche Dateien sie sehen: der
 * Arbeitsbaumlauf sieht auch unversionierte, der Indexlauf nicht. Die
 * Frage, OB eine Datei überhaupt zählt, wird hier genau einmal gestellt –
 * sonst könnten die beiden Läufe für dieselbe Datei zu verschiedenen
 * Ergebnissen kommen.
 *
 * `pfad` muss mit Schrägstrichen geschrieben sein, wie `relativ` und
 * `versionierteDateien()` sie liefern.
 */
export function zaehltMit(pfad, endungen = QUELL_ENDUNGEN) {
  const teile = pfad.split("/");
  if (teile.some(ausgeschlossen)) return false;
  return endungen.some(endung => teile[teile.length - 1].endsWith(endung));
}

export function dateienSammeln(ordner, endungen = QUELL_ENDUNGEN, treffer = []) {
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    // Prune statt Testen: in node_modules steigen ist der teuerste Fall.
    if (ausgeschlossen(eintrag.name)) continue;
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) dateienSammeln(pfad, endungen, treffer);
    else if (zaehltMit(relativ(pfad), endungen)) treffer.push(pfad);
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

/**
 * Zählung aus dem Index statt aus dem Arbeitsbaum.
 *
 * Das Commit-Gate braucht diese, `npm run pruefen` die andere. Grund: die
 * LOC-Zeile steht im Commit-Text und muss den Stand beschreiben, den der
 * Commit festschreibt. Aus dem Arbeitsbaum gemessen nennt sie bei
 * teilweise gestagten Änderungen eine Zahl, die nicht stimmt – belegt in
 * `.gaterepro`: dort verlangte das Gate „4 Dateien, größte 401 Zeilen“,
 * der Commit enthielt 3 Quelldateien und maximal 199 Zeilen. Zwei Ursachen:
 * eine nach dem Stagen weiter geänderte Datei wird in ihrer Arbeitsbaum-Fass
 * gemessen, und unversionierte Dateien werden mitgezählt, obwohl der Commit
 * sie nicht enthält.
 */
export function locMessenAusIndex() {
  let groesste = 0;
  let anzahl = 0;
  const ueber = [];
  const roh = versionierteDateien();
  for (const pfad of roh) {
    if (!zaehltMit(pfad)) continue;
    let inhalt;
    try {
      inhalt = execFileSync("git", ["show", `:${pfad}`], { encoding: "utf8", cwd: WURZEL });
    } catch {
      continue; // im Index nicht lesbar: nicht Teil des Commits
    }
    const zeilen = inhalt.split("\n").length;
    anzahl++;
    groesste = Math.max(groesste, zeilen);
    if (zeilen > LOC_GRENZE) ueber.push({ pfad, zeilen });
  }
  return { dateien: anzahl, groesste, grenze: LOC_GRENZE, ueber };
}

/** Die Zeile, die der Commit-Body wörtlich enthalten muss. */
export const locZeile = mess => `LOC: ${mess.dateien} Dateien, größte ${mess.groesste} Zeilen (Grenze ${mess.grenze})`;
