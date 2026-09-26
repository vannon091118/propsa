/**
 * Commit-Text vorbereiten – die mechanischen Blöcke ausfüllen.
 *
 * Das Gate verlangt in jedem Committext zwei Dinge, die niemand schreiben
 * sollte: die LOC-Zeile im Wortlaut und jede gestagte Datei namentlich. Beides
 * erzeugt dieses Skript, und beide Zahlen und Pfade kommen aus derselben
 * Quelle, gegen die das Gate später prüft – `loc.mjs` für die Zeilenzahl,
 * `dateien.mjs` für die gestagten Pfade. Der Mensch tippt nur noch Betreff
 * und Begründung.
 *
 * Das ist kein Bypass. Das Gate prüft den Text, nicht das Tippen, und prüft
 * ihn unverändert weiter: stimmt eine Zahl nicht, fällt der Commit durch. Was
 * sich ändert, ist die Frage – von „habe ich daran gedacht" zu „widerspreche
 * ich dem Werkzeug". Dass die Begründung echt ist, prüft weiterhin Regel 2,
 * und die misst ab der Anhangsmarke, also genau den Teil, der diesem Skript
 * nicht gehört.
 *
 * Aufruf:
 *   node scripts/pruefen/commit_text.mjs            > .git/COMMIT_EDITMSG.propakt
 *   node scripts/pruefen/commit_text.mjs datei.txt
 *
 * Danach Betreff und Begründung ersetzen, dann `git commit -F <datei>`.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gestagteDateien } from "../dateien.mjs";
import { anhangBlock } from "./commit_anhang.mjs";
import { locMessen, locZeile } from "./loc.mjs";

/**
 * Der vorbereitete Text.
 *
 * Der Kopf bleibt leer und kurz, damit der Lauf scheitert, solange niemand
 * geschrieben hat. Zwei Leerzeilen am Anfang sind Absicht: nur so ist die erste
 * Zeile wirklich leer und nicht die Hinweiszeile darüber. Dann meldet das Gate
 * „kein Betreff" und „Begründung zu kurz" – zwei Meldungen an den beiden
 * Stellen, die noch offen sind, statt einer Vorlage, die sich als Begründung
 * tarnt.
 */
function vorbereiten() {
  return [
    "",
    "",
    "Betreff und Begruendung hier ersetzen – der Rest ist erzeugt.",
    "",
    anhangBlock(gestagteDateien(), locZeile(locMessen())),
  ].join("\n");
}

const text = vorbereiten();
const ziel = process.argv[2];
if (ziel) {
  // `resolve` statt der Rohangabe: unter Windows deutet Node einen Pfad wie
  // `/tmp/mitte.txt` nicht als das, was eine Bash-Shell darunter versteht. Ein
  // aufgelöster Pfad ist eindeutig, gleichgültig aus welchem Verzeichnis der
  // Aufruf kommt.
  const pfad = resolve(ziel);
  writeFileSync(pfad, text, "utf8");
  console.error(`Vorbereitet: ${pfad} – Betreff und Begruendung ersetzen, dann git commit -F ${pfad}`);
} else {
  process.stdout.write(text);
}
