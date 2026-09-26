/**
 * Abnahme – baut, prüft, startet, belegt und sagt, was fehlt.
 *
 * Aufruf: `npm run abnehmen` (oder `node scripts/abnahme/abnahme.mjs`)
 *
 * Schalter:
 *   `--nur`              nur der erste Schritt, die Regeln
 *   `--starten`          startet nach dem Bau die ausführbare Datei
 *   `--kein-warten`      prüft die Belege ohne zu warten
 *   `--fortsetzen <Lauf>` prüft die Belege eines früheren Laufs nach
 *
 * Der Rückgabewert ist die eigentliche Ausgabe des Laufs:
 *
 *   0  alle Schritte gelaufen, bestanden und bezeugt – abnahmefähig
 *   1  mindestens ein Schritt fehlgeschlagen
 *   2  nichts fehlgeschlagen, aber etwas unvollständig – Belege fehlen oder
 *      Schritte wurden auf Wunsch ausgelassen
 *
 * Der Unterschied zwischen 0 und 2 ist der ganze Zweck. Ein Lauf, dem der
 * Screenshot fehlt, ist nicht halb gelaufen, sondern unvollständig belegt –
 * und das darf nicht wie ein bestandener Test aussehen.
 *
 * `--fortsetzen` schließt die Lücke, die sonst bleibt: die Aufnahmen kann nur
 * ein Mensch machen, und wer das Wartefenster verpasst hat, holt sie nach,
 * ohne den Lauf zu wiederholen.
 *
 * Was hier steht, ist der Ablauf: Reihenfolge, Sammeln, Urteil, Rückgabe.
 * Was ein Schritt genau tut, steht in `ausfuehren.mjs`, welche Schritte es
 * gibt in `schritte.mjs`, der Zustand und der Bericht in `bericht.mjs`.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { WURZEL } from "../dateien.mjs";
import {
  OFFEN, belegeWarten, ende, exeLaeuft, lauf, testsLaufen, vorschauStarten,
} from "./ausfuehren.mjs";
import { beurteil, ladeLauf, schreibeBericht, sichereLauf } from "./bericht.mjs";
import { BELEGE, PORT, SCHRITTE, TESTS } from "./schritte.mjs";

const ORDNER = {
  wurzel: WURZEL,
  app: join(WURZEL, "tauri-app"),
  rust: join(WURZEL, "tauri-app", "src-tauri"),
};

/** Zeilen, die die Konsole je Schritt zeigt; der Bericht behält mehr. */
const ZEILEN_KONSOLE = 6;

/** Wie lange auf die Aufnahmen gewartet wird, solange die Vorschau läuft. */
const WARTEZEIT = 180;

const argumente = process.argv.slice(2);
const nurRegeln = argumente.includes("--nur");
const exeStarten = argumente.includes("--starten");
const keinWarten = argumente.includes("--kein-warten");
const setzenIndex = argumente.indexOf("--fortsetzen");
const setzenName = setzenIndex === -1 ? null : argumente[setzenIndex + 1];

/** Zeitstempel für den Laufordner; lokal, damit er zum Lauf passt. */
function stempel() {
  const jetzt = new Date();
  const teil = (zahl) => String(zahl).padStart(2, "0");
  const datum = `${jetzt.getFullYear()}-${teil(jetzt.getMonth() + 1)}-${teil(jetzt.getDate())}`;
  return `${datum}-${teil(jetzt.getHours())}${teil(jetzt.getMinutes())}`;
}

/** Einen Schritt ausführen und auf einen der vier Zustände abbilden. */
async function schrittAusfuehren(schritt, laufOrdner) {
  if (schritt.art === "tests") return testsLaufen(ORDNER.wurzel, TESTS);
  if (schritt.art === "vorschau") return vorschauStarten(ORDNER.app, PORT);
  if (schritt.art === "belege") {
    return belegeWarten(laufOrdner, BELEGE, keinWarten ? 0 : WARTEZEIT, `http://localhost:${PORT}`);
  }
  if (schritt.nr === 7 && exeLaeuft()) {
    return {
      status: OFFEN,
      ausgabe: "propakt.exe läuft noch. Sie muss beendet werden, sonst scheitert der Build mit failed to remove propakt.exe.",
    };
  }
  const r = lauf(schritt.kommando, schritt.argumente, ORDNER[schritt.ordner]);
  return { status: r.code === 0 ? "IMPLEMENTED" : OFFEN, ausgabe: r.ausgabe };
}

/** Die Belege eines früheren Laufs nachprüfen und dessen Bericht erneuern. */
async function fortsetzen(name) {
  const laufOrdner = join(WURZEL, "abnahme", name);
  const zustand = ladeLauf(laufOrdner);
  if (!zustand) {
    console.error(`Kein Lauf unter abnahme/${name}. Dort liegt keine lauf.json.`);
    process.exitCode = 1;
    return;
  }
  const schritt = SCHRITTE.find((s) => s.art === "belege");
  console.log(`▸ Belege nachprüfen für Lauf ${name} …`);
  const ergebnis = await schrittAusfuehren(schritt, laufOrdner);
  zustand.schritte = zustand.schritte.map((s) => (s.nr === schritt.nr ? { ...s, ...ergebnis } : s));
  const urteil = beurteil(zustand.schritte);
  schreibeBericht(laufOrdner, zustand, urteil.befund);
  console.log(ergebnis.status);
  if (ergebnis.ausgabe) console.log(ende(ergebnis.ausgabe, ZEILEN_KONSOLE).split("\n").map((z) => `    ${z}`).join("\n"));
  console.log(`\nBefund: ${urteil.befund}`);
  console.log(`Bericht: abnahme/${name}/bericht.md`);
  process.exitCode = urteil.code;
}

const laufName = setzenName ?? stempel();
const laufOrdner = join(WURZEL, "abnahme", laufName);

if (setzenName) {
  await fortsetzen(setzenName);
} else {
  mkdirSync(laufOrdner, { recursive: true });
  const auswahl = nurRegeln ? SCHRITTE.filter((s) => s.nr === 1) : SCHRITTE;
  const ergebnisse = [];
  let stoppen = null;

  for (const schritt of auswahl) {
    process.stdout.write(`▸ ${schritt.nr} ${schritt.label} … `);
    if (schritt.art === "belege" && !keinWarten) {
      console.log(`warte bis zu ${WARTEZEIT} Sekunden auf die Aufnahmen im Browser …`);
    }
    const ergebnis = await schrittAusfuehren(schritt, laufOrdner);
    if (ergebnis.stoppen) stoppen = ergebnis.stoppen;
    ergebnisse.push({ ...schritt, ...ergebnis });
    console.log(ergebnis.status);
    if (ergebnis.ausgabe) {
      console.log(ende(ergebnis.ausgabe, ZEILEN_KONSOLE).split("\n").map((z) => `    ${z}`).join("\n"));
    }
    if (ergebnis.status === OFFEN) break;
  }

  if (stoppen) stoppen();

  // Was nicht lief, wird ausgewiesen – auch das. Ein verschwiegener Schritt
  // sieht sonst wie ein geprüfter aus.
  for (const schritt of SCHRITTE) {
    if (ergebnisse.some((e) => e.nr === schritt.nr)) continue;
    ergebnisse.push({
      ...schritt,
      status: "NOT_IMPLEMENTED",
      ausgabe: nurRegeln ? "auf Wunsch ausgelassen (--nur)" : "nicht gelaufen: ein früherer Schritt ist fehlgeschlagen",
    });
  }

  const urteil = beurteil(ergebnisse);
  const zustand = sichereLauf(laufOrdner, laufName, ergebnisse);
  schreibeBericht(laufOrdner, zustand, urteil.befund);
  console.log(`\nBefund: ${urteil.befund}`);
  console.log(`Bericht: abnahme/${laufName}/bericht.md`);
  process.exitCode = urteil.code;

  if (exeStarten && urteil.code !== 1) {
    const exe = join(ORDNER.rust, "target", "release", `propakt${process.platform === "win32" ? ".exe" : ""}`);
    if (!existsSync(exe)) {
      console.log(`\nNicht startbar: ${exe} fehlt.`);
      process.exitCode = 1;
    } else {
      const kind = spawn(exe, [], { detached: true, stdio: "ignore" });
      kind.unref();
      console.log(`\nGestartet: ${exe} (PID ${kind.pid}). Vor dem nächsten Bau beenden.`);
    }
  }
}
