/**
 * Zustand und Bericht eines Laufs – was der Lauf weiß und was er sagt.
 *
 * Der Zustand liegt als `lauf.json` neben dem Bericht, damit ein Lauf
 * fortgesetzt werden kann: wer das Wartefenster für die Aufnahmen verpasst
 * hat, prüft sie später nach, ohne den ganzen Lauf zu wiederholen. Ohne diese
 * Datei gäbe es nach dem Lauf keinen Weg zurück, und ein Lauf mit fehlenden
 * Belegen bliebe für immer unvollständig.
 *
 * Der Bericht wird aus dem Zustand erzeugt, nicht daneben geführt. Zwei
 * Dateien über denselben Lauf wären eine zweite Wahrheit, und die driftet.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { WURZEL } from "../dateien.mjs";
import { BESTANDEN, OFFEN, ende } from "./ausfuehren.mjs";

/** Zeilen, die der Bericht je Schritt behält. */
const ZEILEN_BERICHT = 24;

/** Kurzform des aktuellen Commits, damit der Bericht einen Stand nennt. */
function kurzCommit() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: WURZEL, encoding: "utf8" });
  return (r.stdout ?? "").trim() || "unbekannt";
}

/**
 * Der Zustand des Arbeitsbaums beim Lauf.
 *
 * Ohne diese Angabe behauptet der Bericht einen Commit, den der Lauf nicht
 * geprüft hat: Änderungen, die nicht eingestaged und nicht eingecheckt waren,
 * bauten mit, der Commit-Hash aber beschreibt sie nicht. Genau die Lücke, die
 * eine Abnahme schließen soll, würde sie selbst aufreißen.
 */
export function baumZustand() {
  const r = spawnSync("git", ["status", "--porcelain"], { cwd: WURZEL, encoding: "utf8" });
  const zeilen = (r.stdout ?? "").split("\n").filter(Boolean);
  return { sauber: zeilen.length === 0, anzahl: zeilen.length };
}

/**
 * Das Urteil über einen Lauf, aus seinen Schritten und seinem Baum.
 *
 * Reihenfolge ist nicht beliebig: gescheitert schlägt unvollständig, weil ein
 * Fehlschlag die Aussage über den Stand aufhebt. Sonst wäre ein Lauf, bei dem
 * der Build scheiterte, „unvollständig" statt „gescheitert" – und das wäre die
 * harmlosere Lüge. Danach kommt der Arbeitsbaum: alles bestanden auf einem
 * veränderten Baum ist kein Befund über den Commit, sondern über einen
 * Zwischenstand, und genau so heißt es.
 */
export function beurteil(schritte, baum) {
  if (schritte.some((s) => s.status === OFFEN)) {
    return { code: 1, befund: "ein Schritt ist gescheitert" };
  }
  if (!schritte.every((s) => s.status === BESTANDEN)) {
    return { code: 2, befund: "unvollständig – Schritte bestanden, aber nicht alle belegt" };
  }
  if (baum && !baum.sauber) {
    return {
      code: 2,
      befund: `Arbeitsbaum verändert (${baum.anzahl} Einträge) – der Lauf prüft einen Zwischenstand, nicht den Commit`,
    };
  }
  return { code: 0, befund: "vollständig – abnahmefähig" };
}

/** Den Zustand eines Laufs sichern, damit er fortsetzbar bleibt. */
export function sichereLauf(laufOrdner, laufName, schritte, baum) {
  const zustand = { laufName, commit: kurzCommit(), baum, schritte };
  writeFileSync(join(laufOrdner, "lauf.json"), `${JSON.stringify(zustand, null, 2)}\n`, "utf8");
  return zustand;
}

/** Den Zustand eines früheren Laufs lesen; null, wenn es ihn nicht gibt. */
export function ladeLauf(laufOrdner) {
  const pfad = join(laufOrdner, "lauf.json");
  if (!existsSync(pfad)) return null;
  try {
    return JSON.parse(readFileSync(pfad, "utf8"));
  } catch {
    return null;
  }
}

/** Der Bericht aus dem Zustand erzeugen. */
export function schreibeBericht(laufOrdner, zustand, befund) {
  const baum = zustand.baum;
  const zeilen = [
    "# Abnahmebereicht",
    "",
    `Lauf: ${zustand.laufName}`,
    `Commit: ${zustand.commit}`,
    `Arbeitsbaum: ${!baum ? "unbekannt" : baum.sauber ? "sauber" : `${baum.anzahl} Einträge verändert`}`,
    `Knoten: ${process.version} auf ${process.platform}`,
    `Befund: ${befund}`,
    "",
    "```text",
    "Nr  Zustand           Schritt",
  ];
  for (const s of zustand.schritte) zeilen.push(`${String(s.nr).padEnd(3)} ${s.status.padEnd(16)} ${s.label}`);
  zeilen.push(
    "```",
    "",
    "Die Zustände stammen aus packages/core/src/vertrag.ts. Ein STUB bedeutet:",
    "gelaufen, aber nicht maschinell entscheidbar. Ein NOT_VERIFIED bedeutet:",
    "behauptet, aber unbelegt. Ein NOT_IMPLEMENTED bedeutet: nicht gelaufen.",
    "",
  );
  for (const s of zustand.schritte) {
    zeilen.push(`## ${s.nr} ${s.label} (${s.status})`, "", `Beweist: ${s.beweist}`, `Beweist nicht: ${s.beweistNicht}`, "");
    if (s.ausgabe) zeilen.push("```text", ende(s.ausgabe, ZEILEN_BERICHT), "```", "");
  }
  writeFileSync(join(laufOrdner, "bericht.md"), zeilen.join("\n"), "utf8");
}
