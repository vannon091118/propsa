/**
 * Das Ausführen der Abnahmeschritte – wie, nicht was.
 *
 * `schritte.mjs` sagt, welche Schritte es gibt; dieses Modul führt sie aus.
 * Die Trennung ist nicht nur Ordnung: die Eigenheiten, die hier stehen, sind
 * die, die den Ablauf einer anderen Umgebung brechen. Das Windows-Zwangshemd
 * für npm, das Beenden ganzer Prozessbäume, das Warten auf einen Port, der
 * erst antwortet, wenn er fertig ist. Sie gehören an eine Stelle und nicht in
 * den Ablauf.
 *
 * Kein Schritt hier wirft. Ein Fehlschlag ist ein Ergebnis mit einem Zustand,
 * kein Abbruch: der Bericht soll den Fehlschlag nennen können, nicht nur,
 * dass irgendetwas schiefging.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/** Die Zustände aus packages/core/src/vertrag.ts; dieselben vier wie überall. */
export const BESTANDEN = "IMPLEMENTED";
export const OFFEN = "STUB";
export const NICHT_GELAUFEN = "NOT_IMPLEMENTED";
export const UNBELEGT = "NOT_VERIFIED";

/**
 * Wie ein Kommando aufgerufen wird.
 *
 * Unter Windows ist npm eine .cmd und ohne Shell nicht startbar. `shell: true`
 * zusammen mit Argumenten ist in Node ab 22 aber veraltet (DEP0190) und
 * schreibt bei jedem Lauf eine Warnung ins Protokoll. Der Weg daran vorbei
 * ist, die Shell selbst aufzurufen: cmd.exe bekommt die Argumente als Liste,
 * Node quotet sie, und ein Pfad mit Leerzeichen bleibt ganz. Unterhalb von
 * Windows braucht es keine Shell, dort ist npm ein Skript mit Shebang.
 */
function aufruf(kommando, argumente) {
  if (process.platform === "win32") {
    return {
      datei: process.env.ComSpec || "cmd.exe",
      argumente: ["/d", "/s", "/c", kommando, ...argumente],
    };
  }
  return { datei: kommando, argumente };
}

/**
 * HTTP-Status einer Adresse, oder 0 wenn niemand antwortet.
 *
 * Die Vorschau wird über `localhost` geprüft, nicht über 127.0.0.1. Vite lauscht
 * mit `host: false` auf localhost und bindet unter Windows die IPv6-Adresse –
 * eine Probe auf 127.0.0.1 bekommt dann keine Antwort, obwohl der Server läuft.
 * Es ist derselbe Name, den `devUrl` in der Tauri-Konfiguration trägt.
 */
export function status(url) {
  return new Promise((fertig) => {
    fetch(url, { signal: AbortSignal.timeout(1500) })
      .then((antwort) => fertig(antwort.status))
      .catch(() => fertig(0));
  });
}

/** Kommando ausführen; ein Fehlschlag ist ein Ergebnis, keine Ausnahme. */
export function lauf(kommando, argumente, cwd) {
  const { datei, argumente: voll } = aufruf(kommando, argumente);
  const r = spawnSync(datei, voll, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return { code: r.status ?? 1, ausgabe: `${r.stdout ?? ""}${r.stderr ?? ""}`.trimEnd() };
}

/** Die letzten n Zeilen – ein Build spricht sonst für sich allein. */
export const ende = (text, anzahl) => text.split("\n").slice(-anzahl).join("\n");

/** Läuft noch eine propakt.exe? Dann bricht der Build mit remove propakt.exe ab. */
export function exeLaeuft() {
  if (process.platform !== "win32") return false;
  const r = spawnSync("tasklist", [], { encoding: "utf8" });
  return (r.stdout ?? "").toLowerCase().includes("propakt.exe");
}

/** Einen Prozess samt Kindprozessen beenden; unter Windows über taskkill. */
export function beenden(kind) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(kind.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    kind.kill();
  }
}

/**
 * Dev-Server starten und auf eine Antwort warten, nicht auf eine Vermutung.
 *
 * Jeder Rückgabewert trägt `stoppen`, auch der Fehlerfall: ein gestarteter
 * Server, der die Antwort schuldig bleibt, wird sonst nach dem Lauf stehen
 * gelassen und blockiert den nächsten Start über `strictPort`.
 */
export async function vorschauStarten(cwd, port) {
  const adresse = `http://localhost:${port}`;
  if ((await status(adresse)) > 0) {
    return {
      status: OFFEN,
      ausgabe: `Port ${port} antwortet schon. Dort läuft noch ein Vite-Prozess; der Port ist mit strictPort belegt, ein zweiter Start schlägt fehl.`,
    };
  }
  const { datei, argumente } = aufruf("npm", ["run", "dev"]);
  const kind = spawn(datei, argumente, { cwd, stdio: "ignore" });
  const stoppen = () => beenden(kind);
  for (let versuch = 0; versuch < 60; versuch++) {
    await new Promise((warte) => setTimeout(warte, 1000));
    if ((await status(adresse)) === 200) {
      return { status: BESTANDEN, ausgabe: `Der Dev-Server antwortet auf ${adresse}.`, stoppen };
    }
    if (kind.exitCode !== null) {
      return { status: OFFEN, ausgabe: "Der Dev-Server ist beim Start gestorben.", stoppen };
    }
  }
  return { status: OFFEN, ausgabe: `Keine Antwort auf ${adresse} nach 60 Sekunden.`, stoppen };
}

/** Die TypeScript-Tests einzeln, damit der Bericht den Fund benennt. */
export function testsLaufen(cwd, tests) {
  for (const test of tests) {
    const r = lauf("npx", ["ts-node", test], cwd);
    if (r.code !== 0) return { status: OFFEN, ausgabe: `${test} endete mit Code ${r.code}.\n${r.ausgabe}` };
    if (/^FAIL/m.test(r.ausgabe)) return { status: OFFEN, ausgabe: `${test} meldet FAIL.\n${r.ausgabe}` };
  }
  return { status: BESTANDEN, ausgabe: `${tests.length} Tests, alle PASS.` };
}

/** Liegt ein Beleg vor, und hat er Inhalt? */
function liegt(pfad) {
  return existsSync(pfad) && statSync(pfad).size > 0;
}

/**
 * Auf die Belege warten, solange der Dev-Server noch läuft.
 *
 * Die Reihenfolge ist die ganze Schwierigkeit: die Aufnahmen kann nur ein
 * Mensch machen, und er kann sie nur machen, solange die Vorschau läuft. Der
 * Lauf darf den Server deshalb nicht vorher beenden, sondern wartet hier – und
 * sagt, worauf gewartet wird, damit die Wartezeit keine tote Zeit ist.
 *
 * Nach Ablauf ohne Belege: NOT_VERIFIED und nicht OFFEN. Nichts ist
 * gescheitert, es fehlt nur der Nachweis. Genau das ist der Unterschied, den
 * eine Abnahme von einem grünen Test unterscheidet.
 */
export async function belegeWarten(laufOrdner, belege, sekunden, adresse) {
  const fehlend = () => belege.filter((beleg) => !liegt(join(laufOrdner, beleg.datei)));
  for (let sek = 0; sek < sekunden; sek += 2) {
    if (fehlend().length === 0) {
      return { status: BESTANDEN, ausgabe: `${belege.length} Belege vorhanden.` };
    }
    await new Promise((warte) => setTimeout(warte, 2000));
  }
  const offen = fehlend();
  if (offen.length === 0) return { status: BESTANDEN, ausgabe: `${belege.length} Belege vorhanden.` };
  return {
    status: UNBELEGT,
    ausgabe: [
      `fehlend nach ${sekunden} Sekunden Wartezeit: ${offen.map((b) => b.datei).join(", ")}.`,
      `Aufnahme im Browser unter ${adresse}: Hauptfenster auf /, Overlay auf /?fenster=overlay.`,
      `Ablage: im Laufordner abnahme/<Zeitstempel>/ dieses Laufs.`,
      "Mit --kein-warten prüft der Lauf die Belege ohne zu warten.",
    ].join("\n"),
  };
}
