/**
 * Commit-Gate – prüft den Commit-Text gegen die Regeln aus AGENTS.md.
 *
 * Fünf Regeln, jede für sich maschinell prüfbar:
 *
 *  1. PROPAKT-Bildsprache: keine englischen Flusswörter, keine ASCII-
 *     Umschreibungen deutscher Umlaute
 *  2. Erklärung im Body: der Betreff allein zählt nicht als Begründung
 *  3. jede gestagte Datei namentlich genannt
 *  4. LOC-Zähler im Wortlaut der einen Quelle (loc.mjs)
 *  5. keine Aufzählungszeichen
 *
 * Aufruf: `node scripts/pruefen/commit_gate.mjs <datei-des-commit-textes>`
 * ohne Argument wird der Text von stdin gelesen. Der Haken .githooks/
 * commit-msg ruft genau so auf.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { locMessen, locZeile } from "./loc.mjs";

/** Englische Füllwörter – sie stehen in keinem deutschen Satz. */
const FLUSSWOERTER = [
  "the", "and", "with", "without", "from", "into", "this", "that", "was",
  "were", "has", "have", "had", "not", "but", "for", "are", "its", "it",
  "they", "them", "their", "will", "would", "should", "can", "than", "then",
];

/**
 * ASCII-Umschreibungen. Kein Deutsch des Projekts schreibt ue statt ü –
 * die Form kommt nur daher, dass Umlaute durch Werkzeuge ersetzt wurden.
 *
 * Bewusst eine Liste von Stämmen, keine vollständige Sprachprüfung: wer
 * "pruefen" verbietet, verbietet den Namen des Prüfskripts selbst. Wer
 * "heiss" oder "gross" verbietet, verbietet gültiges Deutsch. Deshalb
 * stehen hier nur Formen, die im Deutschen des Projekts nie vorkommen.
 */
const ASCII_UMSCHLAG = [
  "fuer", "ueber", "ueberpruef", "koenn", "waere", "wuerde", "groesste",
  "zurueck", "rueck", "schluessel", "aendern", "geaendert", "loesch",
  "moeglich", "naechst", "hoechst", "verstaend", "ergaenz", "zulaessig",
  "unmoeglich", "maessig", "fuell", "hoeher", "spaet", "staend", "traeg",
  "nuetzlich", "muess", "gedaempf", "entschaed", "geloest", "anhaeng",
  "empfaeng", "vergaeng", "gueltig", "haeufig", "zueg", "laeuft", "kaeuft",
];

/** Zeilen, die keine Aufzählung sind, obwohl sie Sonderzeichen führen. */
const TRAILER = /^(Co-Authored-By|Reviewed-by|Signed-off-by|LOC):/;

const fehler = [];

/**
 * Zitate und Code-Fences sind Werkzeugausgabe, keine Prosa-Wahl.
 *
 * Das Zitat darf über Zeilenumbrüche laufen: Git wickelt den Commit-Body
 * bei etwa 72 Zeichen hart, eine zitierte Werkzeugmeldung landet also
 * fast immer über zwei Zeilen. Die Obergrenze von 300 Zeichen verhindert,
 * dass zwei unzugehörige Anführungszeichen einen ganzen Absatz fressen.
 */
function ohneZitate(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/"[^"]{4,300}"/g, " ");
}

function pruefeSprache(text) {
  const nackt = ohneZitate(text);
  for (const wort of FLUSSWOERTER) {
    const treffer = nackt.match(new RegExp(`\\b${wort}\\b`, "gi"));
    if (treffer) fehler.push(`Bildsprache: englisches Flusswort "${treffer[0]}" – ist es ein Zitat? Dann in Anführungszeichen setzen.`);
  }
  const klein = nackt.toLowerCase();
  for (const teil of ASCII_UMSCHLAG) {
    if (klein.includes(teil)) fehler.push(`Bildsprache: ASCII-Umschreibung "${teil}" – Umlaute ausschreiben (ü, ö, ä, ß).`);
  }
}

function pruefeBody(text) {
  const teile = text.split(/\r?\n\r?\n/);
  const betreff = (teile[0] ?? "").trim();
  const body = teile.slice(1).join("\n").trim();
  if (!betreff) fehler.push("Kein Betreff.");
  if (body.length < 120) fehler.push(`Body zu kurz (${body.length} Zeichen): erklären, warum – mindestens 120 Zeichen.`);
  return body;
}

function pruefeAufzaehlung(text) {
  for (const zeile of text.split(/\r?\n/)) {
    if (TRAILER.test(zeile.trim())) continue;
    if (/^\s*([-*•‣+]|\d+[.)])\s+/.test(zeile)) {
      fehler.push(`Aufzählungszeichen in "${zeile.trim().slice(0, 40)}" – Fließtext ohne Aufzählung.`);
      return;
    }
  }
}

function pruefeLoc(text) {
  const soll = locZeile(locMessen());
  if (!text.includes(soll)) fehler.push(`LOC-Zähler fehlt oder weicht ab. Erwartet wörtlich:\n    ${soll}`);
}

/** Gestagte Dateien; bei Umbenennungen zählen alte und neue Pfade. */
function gestagteDateien() {
  const roh = execFileSync("git", ["diff", "--cached", "--name-status", "-M"], {
    encoding: "utf8", cwd: process.cwd(),
  });
  const pfade = new Set();
  for (const zeile of roh.split("\n").filter(Boolean)) {
    const teile = zeile.split("\t");
    if (teile[0].startsWith("R")) { pfade.add(teile[1]); pfade.add(teile[2]); }
    else pfade.add(teile[1]);
  }
  return [...pfade].filter(Boolean).sort();
}

function pruefeDateinamen(text, pfade) {
  if (pfade.length === 0) return;
  const fehlend = pfade.filter(pfad => !text.includes(pfad));
  if (fehlend.length > 0) {
    fehler.push(`${fehlend.length} von ${pfade.length} Dateien nicht namentlich erwähnt:\n    ${fehlend.join("\n    ")}`);
  }
}

const quelle = process.argv[2];
const text = quelle ? readFileSync(quelle, "utf8") : readFileSync(0, "utf8");

pruefeSprache(text);
const body = pruefeBody(text);
pruefeAufzaehlung(text);
pruefeLoc(text);
const pfade = gestagteDateien();
pruefeDateinamen(text, pfade);

if (fehler.length > 0) {
  console.error("✗ Commit-Gate\n");
  for (const eintrag of fehler) console.error(`  ${eintrag}\n`);
  console.error("Regelwerk: AGENTS.md, Abschnitt „Commit-Gate“.");
  process.exit(1);
}
console.log(`✓ Commit-Gate: ${pfade.length} Dateien benannt, LOC und Bildsprache geprüft.`);
