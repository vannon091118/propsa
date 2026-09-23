/**
 * Spiegelt die Changelog-Quelle auf die Kopien der Desktop-App.
 *
 * Eine Wahrheit je Regel (AGENTS.md): `docs/wiki/Changelog.md` ist die
 * einzige gepflegte Quelle. Die App liest zur Laufzeit
 * `tauri-app/src-tauri/resources/Changelog.md` (bündelt als Resource);
 * die Zweitkopie `tauri-app/src-tauri/Changelog.md` bleibt deckungs-
 * gleich. Beide Kopien werden hier erzeugt – nie von Hand ändern.
 *
 * Die Link-Transformationen leben in `changelog_kopie.mjs` (geteilt mit
 * `npm run pruefen`, damit Prüfung und Erzeugung nicht auseinanderlaufen).
 *
 * Aufruf: `npm run changelog:spiegeln` – vor jedem Commit; der Release-
 * bzw. `tauri build`-Lauf bündelt die Kopie als Resource in die Exe.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { changelogKopie } from "./changelog_kopie.mjs";

const WURZEL = resolve(import.meta.dirname, "..", "..");
const QUELLE = join(WURZEL, "docs", "wiki", "Changelog.md");
const ZIELE = [
  join(WURZEL, "tauri-app", "src-tauri", "resources", "Changelog.md"),
  join(WURZEL, "tauri-app", "src-tauri", "Changelog.md"),
];

const gespiegelt = changelogKopie(readFileSync(QUELLE, "utf8"));
for (const ziel of ZIELE) {
  writeFileSync(ziel, gespiegelt);
}
console.log(`✓ Changelog gespiegelt: ${ZIELE.length} Kopien aus docs/wiki/Changelog.md erzeugt`);
