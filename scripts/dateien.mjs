/**
 * Die Dateiliste des Repositories – einzige Fundstelle im Projekt.
 *
 * Drei Werkzeuge lesen hier: loc.mjs zählt Arbeitsbaum und Index,
 * architecture-check.mjs prüft Zonenzuordnung und Verweise. Sie fragen nicht
 * dasselbe – eine zählt Zeilen, das andere prüft Zusagen –, aber sie fragen
 * nach derselben Menge: den versionierten Dateien. Eine zweite
 * `git ls-files`-Abfrage wäre dieselbe Aussage ein zweites Mal, und genau
 * solche Doppelungen haben schon zweimal zu widersprüchlichen Zahlen geführt.
 *
 * Die Formen:
 *   versionierteDateienMitFlag(pfade) → [{ pfad, uebersprungen }, …]
 *   versionierteDateien(pfade)        → nur die Pfade, daraus abgeleitet
 *
 * Beide gehen auf denselben Aufruf. `-v` läuft immer, `pfade` ist nur ein
 * Zusatzargument, also ist die Pfadliste die Ableitung der Flagliste und nicht
 * eine zweite Frage an git.
 *
 * Das Flag unterscheidet die beiden Zustände, die das Dateisystem allein nicht
 * unterscheiden kann:
 *   H  und fehlt auf der Platte -> im Arbeitsbaum gelöscht -> Fehler
 *   S  und fehlt auf der Platte -> nie ausgecheckt      -> Zustand, kein Defekt
 * Nur git weiß das, also fragt nur git.
 *
 * Daneben steht die Projektwurzel, weil sie dieselbe Herkunft hat: sie ergibt
 * sich aus diesem Ort im Baum, nicht aus dem Aufrufer. Wer sie braucht, holt
 * sie hier – sonst steht sie ein zweites, drittes Mal im Projekt.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export const WURZEL = resolve(import.meta.dirname, "..");

/**
 * Die versionierten Dateien. Ohne `pfade` die ganze Liste, sonst nur die
 * angefragten – git beantwortet ein Pfadspec mit Verzeichnissen, deshalb
 * kommt mehr zurück als angefragt; wer nach Namen filtert, ist selbst
 * zuständig.
 */
export function versionierteDateienMitFlag(pfade) {
  if (pfade && pfade.length === 0) return [];
  const args = ["ls-files", "-v", "-z"];
  if (pfade) args.push("--", ...pfade);
  const roh = execFileSync("git", args, {
    cwd: WURZEL, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  return roh.split("\0").filter(Boolean)
    .map(z => ({ pfad: z.slice(2), uebersprungen: z[0] === "S" }));
}

/** Nur die Pfade, ohne Flag – für alles, was die Dateinamen genug braucht. */
export function versionierteDateien(pfade) {
  return versionierteDateienMitFlag(pfade).map(z => z.pfad);
}

/**
 * Die für den nächsten Commit vorgemerkten Dateien.
 *
 * Zwei Werkzeuge brauchen dieselbe Antwort: das Commit-Gate prüft, ob der
 * Commit-Text jede dieser Dateien nennt, und der Text-Vorbereiter schreibt sie
 * hinein. Beide fragen git, also fragen sie hier – sonst könnte der Vorbereiter
 * eine Datei nennen, die das Gate nicht verlangt, und umgekehrt.
 *
 * Der Aufruf läuft mit `cwd: WURZEL` statt mit dem Arbeitsverzeichnis des
 * Aufrufers. `git diff --cached` filtert zwar nicht nach dem Verzeichnis und
 * nennt Pfade ab der Wurzel – geprüft, nicht behauptet. Die Änderung ist
 * trotzdem richtig: eine Antwort, die davon abhängt, wo der Aufrufer steht,
 * gehört in ein Gate nicht, und stünde der Aufrufer außerhalb des Repos,
 * wäre die alte Form ins Leere gelaufen.
 *
 * Bei Umbenennungen zählen alter und neuer Pfad – so verlangt es das Gate, und
 * so nennt der Vorbereiter beide.
 */
export function gestagteDateien() {
  const roh = execFileSync("git", ["diff", "--cached", "--name-status", "-M"], {
    cwd: WURZEL, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  const pfade = new Set();
  for (const zeile of roh.split("\n").filter(Boolean)) {
    const teile = zeile.split("\t");
    if (teile[0].startsWith("R")) { pfade.add(teile[1]); pfade.add(teile[2]); }
    else pfade.add(teile[1]);
  }
  return [...pfade].filter(Boolean).sort();
}
