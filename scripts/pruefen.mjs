/**
 * Konsistenzprüfung des Repos – prüft die Regeln aus AGENTS.md:
 *
 *  1. Zeilenbegrenzung (200 LOC) für alle Quelldateien
 *  2. eine Version in package.json, Cargo.toml und tauri.conf.json
 *  3. keine alten Produktnamen in Quelltext, Dokumenten und Lockfiles
 *  4. Ignorier-Katalog in CLI, Rust und Frontend inhaltsgleich
 *  5. alle relativen Links in den Dokumenten zeigen auf vorhandene Dateien
 *
 * Aufruf: `npm run pruefen`
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const WURZEL = resolve(import.meta.dirname, "..");
const LOC_GRENZE = 200;
const UEBERSPRUNGEN = new Set(["node_modules", "dist", "target", "gen", ".freebuff", ".agents", "test-output", "snapshots"]);

const fehler = [];

function dateienSammeln(ordner, endungen, treffer = []) {
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    if (UEBERSPRUNGEN.has(eintrag.name)) continue;
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) dateienSammeln(pfad, endungen, treffer);
    else if (endungen.some(endung => eintrag.name.endsWith(endung))) treffer.push(pfad);
  }
  return treffer;
}

const relativer = pfad => relative(WURZEL, pfad).split(sep).join("/");

// 1. LOC
let groesste = 0;
const quelldateien = dateienSammeln(WURZEL, [".ts", ".tsx", ".rs", ".mjs", ".js", ".css"]);
for (const pfad of quelldateien) {
  const zeilen = readFileSync(pfad, "utf8").split("\n").length;
  groesste = Math.max(groesste, zeilen);
  if (zeilen > LOC_GRENZE) fehler.push(`${relativer(pfad)}: ${zeilen} Zeilen (Grenze ${LOC_GRENZE})`);
}
console.log(`✓ Zeilenbegrenzung: ${quelldateien.length} Dateien geprüft, größte ${groesste} Zeilen (Grenze ${LOC_GRENZE})`);

// 2. Version
const versionen = {
  "package.json": JSON.parse(readFileSync(join(WURZEL, "package.json"), "utf8")).version,
  "tauri-app/package.json": JSON.parse(readFileSync(join(WURZEL, "tauri-app/package.json"), "utf8")).version,
  "tauri-app/src-tauri/Cargo.toml": readFileSync(join(WURZEL, "tauri-app/src-tauri/Cargo.toml"), "utf8").match(/^version = "([^"]+)"/m)?.[1],
  "tauri-app/src-tauri/tauri.conf.json": JSON.parse(readFileSync(join(WURZEL, "tauri-app/src-tauri/tauri.conf.json"), "utf8")).version,
};
const versionSoll = versionen["package.json"];
for (const [datei, version] of Object.entries(versionen)) {
  if (version !== versionSoll) fehler.push(`Version ${versionSoll} erwartet, ${datei} nennt ${version}`);
}
console.log(`✓ Version: ${versionSoll} in allen ${Object.keys(versionen).length} Dateien`);

// 3. Namen – jetzt auch package-lock.json, damit keine alten Bin-/Paketnamen
//    im Lockfile überleben.
const ALTE_NAMEN = ["files-to-prompt", "files_to_prompt", "repomix-parser-llm", "repomix-parser"];
const NAME_AUSNAHMEN = new Set(["scripts/pruefen.mjs", "wiki/Changelog.md"]);
const textdateien = dateienSammeln(WURZEL, [".ts", ".tsx", ".rs", ".mjs", ".js", ".json", ".md", ".html", ".svg"])
  .filter(pfad => !pfad.endsWith("Cargo.lock") && !NAME_AUSNAHMEN.has(relativer(pfad)));
for (const pfad of textdateien) {
  const inhalt = readFileSync(pfad, "utf8");
  for (const name of ALTE_NAMEN) if (inhalt.includes(name)) fehler.push(`${relativer(pfad)}: alter Name "${name}"`);
}
console.log(`✓ Namen: ${textdateien.length} Dateien (inklusive package-lock.json) auf alte Namen geprüft`);

// 4. Kataloge
function katalogLesen(pfad, blockMuster) {
  const block = readFileSync(pfad, "utf8").match(blockMuster);
  return block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map(t => t[1]) : null;
}
const cliKatalog = katalogLesen(join(WURZEL, "src/filters.ts"), /export const IGNORIERTE_VERZEICHNISSE = \[([\s\S]*?)\r?\n\];/);
const rustKatalog = katalogLesen(join(WURZEL, "tauri-app/src-tauri/src/filter.rs"), /const IGNORIERTE_VERZEICHNISSE: &\[&str\] = &\[([\s\S]*?)\r?\n\];/);
const frontendKatalog = katalogLesen(join(WURZEL, "tauri-app/src/typen.ts"), /export const STANDARD_AUSSCHLUESSE = \[([\s\S]*?)\]\.join/);
if (!cliKatalog || !rustKatalog || !frontendKatalog) fehler.push("Ausschlusskatalog nicht gefunden (CLI, Rust oder Frontend)");
else {
  if (cliKatalog.join(",") !== rustKatalog.join(",")) fehler.push(`Katalog CLI ↔ Rust weicht ab (CLI ${cliKatalog.length}, Rust ${rustKatalog.length} Einträge)`);
  const fehlend = cliKatalog.filter(name => !frontendKatalog.includes(name));
  if (fehlend.length > 0) fehler.push(`Katalog Frontend fehlt: ${fehlend.join(", ")}`);
  console.log(`✓ Ausschlusskatalog: CLI und Rust je ${cliKatalog.length} Einträge, Frontend ${frontendKatalog.length}`);
}

// 5. Links
const dokumente = dateienSammeln(WURZEL, [".md"]);
let linkAnzahl = 0;
for (const pfad of dokumente) {
  for (const treffer of readFileSync(pfad, "utf8").matchAll(/\]\(([^)]+)\)/g)) {
    const ziel = treffer[1].split("#")[0].trim();
    if (ziel === "" || /^(https?:|mailto:)/.test(ziel)) continue;
    linkAnzahl++;
    if (!existsSync(resolve(dirname(pfad), ziel))) fehler.push(`${relativer(pfad)}: Link ins Leere → ${ziel}`);
  }
}
console.log(`✓ Links: ${linkAnzahl} relative Verweise in ${dokumente.length} Dokumenten geprüft`);

// Ergebnis
if (fehler.length > 0) {
  console.error(`\n✗ ${fehler.length} Verstoß/Verstöße:`);
  for (const eintrag of fehler) console.error(`  - ${eintrag}`);
  process.exit(1);
}
console.log("\n✓ Keine Verstöße.");
