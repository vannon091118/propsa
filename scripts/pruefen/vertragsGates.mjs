/**
 * Gate-Prüfung der sieben Baustein-Verträge (Regel 10 von `npm run pruefen`).
 *
 * Der Satz aus `bausteine/AGENTS.md` lautet: eine Regel ohne alle sieben
 * Punkte ist nicht implementiert, sondern behauptet. Damit das eine Zusage
 * bleibt und kein Wunsch, prüft dieser Lauf jede Regel in
 * `bausteine/vertrage/` gegen den Katalog `GATE_PUNKTE` aus
 * `packages/core/src/vertrag.ts` – die einzige Quelle für die Punktfamen.
 *
 * Gelesen wird per Regex, wie alle anderen Kataloge in `pruefen.mjs`. Das ist
 * hier mehr als Kosmetik: kommt ein achter Punkt in den Katalog dazu,
 * verlangt die Prüfung ihn von jeder Regel, ohne dass in diesem Modul eine
 * Liste zu pflegen wäre.
 *
 * Geprüft werden ausschliesslich Zusicherungen, die in den Dateien stehen. Ob
 * eine Zusicherung *wahr* ist, bleibt eine Frage der Lektüre – das Schema
 * macht Lücken sichtbar, es schliesst sie nicht.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { WURZEL } from "./loc.mjs";

/** Der Core ist die einzige Quelle für Punktfamen und Zustandswerte. */
const VERTRAG_TS = "packages/core/src/vertrag.ts";
const VERTRAGS_ORDNER = "bausteine/vertrage";

/** Die Schlüssel eines Katalogs aus vertrag.ts, in unveränderter Deklarationsform. */
function katalogSchluessel(name) {
  const text = readFileSync(join(WURZEL, VERTRAG_TS), "utf8");
  const block = text.match(
    new RegExp(`export const ${name}: Record<[^>]*> = \\{([\\s\\S]*?)\\r?\\n\\};`),
  );
  if (!block) return [];
  return [...block[1].matchAll(/^\s*([A-Z_]+):/gm)].map(treffer => treffer[1]);
}

/** Die Punkte, die einer Regel fehlen: nicht vorhanden oder ohne Inhalt. */
function fehlendePunkte(regel, punkte) {
  return punkte.filter(punkt => {
    const wert = regel[punkt];
    return typeof wert !== "string" || wert.trim().length === 0;
  });
}

/** Der erste Zustandswort eines Abschnitts, etwa aus "STUB – bewusst offen". */
function zustandswort(text) {
  return String(text).trim().split(/\s+/)[0];
}

/**
 * Prüft alle sieben Verträge und trägt jeden Befund in `fehler`.
 *
 * Geprüft wird, was der Vertrag über sich selbst behauptet: ob jede Regel
 * alle sieben Punkte trägt und ob jede Zustandsangabe ein Wert aus
 * `STATUS_WERTE` ist. Beides ist maschinell entscheidbar, und genau deshalb
 * gehört es in den Pflichtlauf statt in einen Test.
 */
export function vertragsGatesPruefen(fehler) {
  const punkte = katalogSchluessel("GATE_PUNKTE");
  const status = katalogSchluessel("STATUS_WERTE");
  if (punkte.length === 0 || status.length === 0) {
    fehler.push(`Baustein-Gates: Katalog nicht gefunden in ${VERTRAG_TS}`);
    return;
  }

  const ordner = join(WURZEL, VERTRAGS_ORDNER);
  const befunde = [];
  const dateien = readdirSync(ordner)
    .filter(name => name.endsWith(".contract.json"))
    .sort();
  let regelnGeprueft = 0;

  for (const name of dateien) {
    const vertrag = JSON.parse(readFileSync(join(ordner, name), "utf8"));
    const regeln = vertrag.contract_gates?.regeln ?? [];
    if (regeln.length === 0) {
      befunde.push(`${name}: keine Regel im contract_gates – ein Vertrag ohne Regel behauptet nur`);
      continue;
    }
    for (const regel of regeln) {
      regelnGeprueft++;
      const fehlt = fehlendePunkte(regel, punkte);
      if (fehlt.length > 0) {
        befunde.push(`${name}: Regel ${regel.gate} ohne ${fehlt.join(", ")}`);
      }
    }

    const bereich = vertrag.implementation_status;
    if (!bereich) {
      befunde.push(`${name}: implementation_status fehlt – ohne Selbstverifikation ist der Vertrag eine Behauptung`);
      continue;
    }
    if (!status.includes(bereich.overall)) {
      befunde.push(`${name}: overall "${bereich.overall}" ist kein Zustand aus ${VERTRAG_TS}`);
    }
    for (const [abschnitt, wert] of Object.entries(bereich.sections ?? {})) {
      const zustand = zustandswort(wert);
      if (!status.includes(zustand)) {
        befunde.push(`${name}: Abschnitt ${abschnitt} nennt "${zustand}", keinen Zustand aus ${VERTRAG_TS}`);
      }
    }
  }

  fehler.push(...befunde);
  if (befunde.length === 0) {
    console.log(
      `✓ Baustein-Gates: ${dateien.length} Verträge, ${regelnGeprueft} Regeln, je ${punkte.length} Punkte aus dem Core-Katalog`,
    );
  }
}
