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
import { BESTANDEN, OFFEN } from "./ausfuehren.mjs";
import { ende } from "./ausfuehren.mjs";

/** Zeilen, die der Bericht je Schritt behält. */
const ZEILEN_BERICHT = 24;

/** Kurzform des aktuellen Commits, damit der Bericht einen Stand nennt. */
function kurzCommit() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: WURZEL, encoding: "utf8" });
  return (r.stdout ?? "").trim() || "unbekannt";
}

/**
 * Das Urteil über einen Lauf, aus seinen Schritten.
 *
 * Reihenfolge ist nicht beliebig: gescheitert schlägt unvollständig, weil ein
 * Fehlschlag die Aussage über den Stand aufhebt. Sonst wäre ein Lauf, bei dem
 * der Build scheiterte, „unvollständig" statt „gescheitert" – und das wäre die
 * harmlosere Lüge.
 */
export function beurteil(schritte) {
  if (schritte.some((s) => s.status === OFFEN)) {
    return { code: 1, befund: "ein Schritt ist gescheitert" };
  }
  if (schritte.every((s) => s.status === BESTANDEN)) {
    return { code: 0, befund: "vollständig – abnahmefähig" };
  }
  return { code: 2, befund: "unvollständig – Schritte bestanden, aber nicht alle belegt" };
}

/** Den Zustand eines Laufs sichern, damit er fortsetzbar bleibt. */
export function sichereLauf(laufOrdner, laufName, schritte) {
  const zustand = { laufName, commit: kurzCommit(), schritte };
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

/** Den Bericht aus dem Zustand erzeugen. */
export function schreibeBericht(laufOrdner, zustand, befund) {
  const zeilen = [
    "# Abnahmebereicht",
    "",
    `Lauf: ${zustand.laufName}`,
    `Commit: ${zustand.commit}`,
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
