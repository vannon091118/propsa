/**
 * Der erzeugte Anhang eines Committextes – Marke und Aufbau an einer Stelle.
 *
 * Zwei Werkzeuge müssen dieselbe Form kennen: `commit_text.mjs` schreibt sie,
 * `commit_gate.mjs` erkennt sie, um sie bei der Mindestlänge der Begründung
 * auszublenden. Deshalb steht sie hier und nicht in einem der beiden – ein
 * Import aus dem Gate würde dessen Lauf auslösen, weil es ein Skript mit
 * Seiteneffekt ist, und eine eigene Marke an zwei Orten wäre eine zweite
 * Wahrheit über genau die Form, an der sich das Gate entscheidet.
 *
 * Warum es sie überhaupt braucht: Das Gate verlangt in jedem Committext die
 * LOC-Zeile und jede gestagte Datei namentlich. Der Vorbereiter trägt beides
 * ein. Diese Blöcke sind Werkzeugausgabe, keine Begründung – so wie Zitate
 * und Code-Fences für die Sprachprüfung keine Prosa sind. Ohne die Marke
 * zählte der Anhang zur Begründung, und genug Pfade plus LOC-Zeile ergäben
 * mehr als 120 Zeichen, auch wenn der Mensch gar nichts geschrieben hat.
 */

/** Steht vor dem erzeugten Teil. Bewusst unverwechselbar mit dem Dateinamen. */
export const ANHANG = "Betrifft (von commit_text.mjs erzeugt):";

/**
 * Der Anhang: Marke, dann die gestagten Dateien, dann die LOC-Zeile.
 *
 * Die Pfade stehen als nackte Zeilen ohne Aufzählungszeichen. Regel 5 des Gates
 * verbietet Listenzeichen am Zeilenanfang – auch innerhalb eines Code-Fences,
 * weil es jede Zeile einzeln prüft. Eine aufgeräumte Liste wäre genau die Form,
 * die das eigene Gate ablehnt.
 */
export function anhangBlock(pfade, locZeile) {
  const zeilen = [ANHANG];
  if (pfade.length === 0) {
    zeilen.push("(nichts gestaged – zuerst git add)");
  } else {
    zeilen.push(...pfade);
  }
  return [...zeilen, "", locZeile, ""].join("\n");
}
