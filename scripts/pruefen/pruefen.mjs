/**
 * Konsistenzprüfung des Repos – prüft die Regeln aus AGENTS.md:
 *
 *  1. Zeilenbegrenzung (300 LOC) für alle Quelldateien
 *  2. eine Version in package.json, Cargo.toml und tauri.conf.json
 *  3. keine alten Produktnamen in Quelltext, Dokumenten und Lockfiles
 *  4. Ignorier-Katalog in Core, Rust und Frontend inhaltsgleich
 * 5. alle relativen Links in den Dokumenten zeigen auf vorhandene Dateien
 * 6. Sprachkataloge (Endungen und Fences) in Core und Rust deckungsgleich
 *  7. Live-Kataloge (Schwere, Beschreibungen, Schwellen) Core ↔ Rust deckungsgleich
 *  8. Zwischenspeicher-Konstanten (Version, Schema) Core ↔ Rust deckungsgleich
 *  9. Baustein-Kataloge (Gate-Punkte, Status-Werte, Ereignistypen) Core ↔ Rust
 *
 * Aufruf: `npm run pruefen`
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { changelogKopie } from "../changelog/changelog_kopie.mjs";
import { WURZEL, dateienSammeln, locMessen, relativ } from "./loc.mjs";

const fehler = [];

// 1. LOC – Zählung und Grenze kommen aus loc.mjs, dieselbe Quelle wie im
//     Commit-Gate. Sonst hätte das Gate eine eigene Wahrheit über die Zahl.
const mess = locMessen();
for (const eintrag of mess.ueber) {
  fehler.push(`${eintrag.pfad}: ${eintrag.zeilen} Zeilen (Grenze ${mess.grenze})`);
}
console.log(`✓ Zeilenbegrenzung: ${mess.dateien} Dateien geprüft, größte ${mess.groesste} Zeilen (Grenze ${mess.grenze})`);

// 1b. Changelog-Spiegel: Die Kopie der Desktop-App muss der transformierten
//     Quelle entsprechen. Gelesen wird genau eine Datei: tauri.conf.json
//     bündelt "Changelog.md" aus dem src-tauri-Wurzelverzeichnis, und
//     `fetch_changelog` löst genau diesen Namen als Resource auf. Eine alte
//     Kopie zeigte im Changelog-Tab alte Versionen.
const changelogQuelle = readFileSync(join(WURZEL, "docs", "wiki", "Changelog.md"), "utf8");
const changelogSoll = changelogKopie(changelogQuelle);
const changelogKopien = ["tauri-app/src-tauri/Changelog.md"];
for (const kopie of changelogKopien) {
  const inhalt = readFileSync(join(WURZEL, kopie), "utf8");
  if (inhalt !== changelogSoll) {
    fehler.push(`${kopie}: weicht von docs/wiki/Changelog.md ab – npm run changelog:spiegeln ausführen`);
  }
}
console.log(`✓ Changelog-Spiegel: ${changelogKopien.length} Kopie${changelogKopien.length === 1 ? "" : "n"} deckungsgleich mit der Quelle`);

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
const NAME_AUSNAHMEN = new Set(["scripts/pruefen/pruefen.mjs", "wiki/Changelog.md", "kontext.md"]);
// kontext.md ist eine **generierte** Ausgabe des Scanners (Kontextpaket des
// eigenen Repos): Quelltext-Zitate darin (alte Namen, dokumentrelative
// Links) sind Zitate, keine Quellen – darum von Namen-/Link-Prüfung
// ausgenommen.
const textdateien = dateienSammeln(WURZEL, [".ts", ".tsx", ".rs", ".mjs", ".js", ".json", ".md", ".html", ".svg"])
  .filter(pfad => !pfad.endsWith("Cargo.lock") && !NAME_AUSNAHMEN.has(relativ(pfad)));
for (const pfad of textdateien) {
  const inhalt = readFileSync(pfad, "utf8");
  for (const name of ALTE_NAMEN) if (inhalt.includes(name)) fehler.push(`${relativ(pfad)}: alter Name "${name}"`);
}
console.log(`✓ Namen: ${textdateien.length} Dateien (inklusive package-lock.json) auf alte Namen geprüft`);

// 4. Kataloge
function katalogLesen(pfad, blockMuster) {
  const block = readFileSync(pfad, "utf8").match(blockMuster);
  return block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map(t => t[1]) : null;
}
const coreKatalog = katalogLesen(join(WURZEL, "packages/core/src/filters.ts"), /export const IGNORIERTE_VERZEICHNISSE = \[([\s\S]*?)\r?\n\];/);
const coreDateien = katalogLesen(join(WURZEL, "packages/core/src/filters.ts"), /export const AUSGESCHLOSSENE_DATEIEN = \[([\s\S]*?)\r?\n\];/);
const rustKatalog = katalogLesen(join(WURZEL, "tauri-app/src-tauri/src/filter.rs"), /const IGNORIERTE_VERZEICHNISSE: &\[&str\] = &\[([\s\S]*?)\r?\n\];/);
const rustDateien = katalogLesen(join(WURZEL, "tauri-app/src-tauri/src/filter.rs"), /const AUSGESCHLOSSENE_DATEIEN: &\[&str\] = &\[([\s\S]*?)\r?\n\];/);
if (!coreKatalog || !rustKatalog || !coreDateien || !rustDateien) fehler.push("Ausschlusskatalog nicht gefunden (Core oder Rust)");
else {
  if (coreKatalog.join(",") !== rustKatalog.join(",")) fehler.push(`Verzeichnis-Katalog Core ↔ Rust weicht ab (Core ${coreKatalog.length}, Rust ${rustKatalog.length} Einträge)`);
  if (coreDateien.join(",") !== rustDateien.join(",")) fehler.push(`Datei-Katalog Core ↔ Rust weicht ab (Core ${coreDateien.length}, Rust ${rustDateien.length} Einträge)`);
  const typen = readFileSync(join(WURZEL, "tauri-app/src/typen.ts"), "utf8");
  if (!/@propsa\/core/.test(typen) || !/STANDARD_AUSSCHLUESSE/.test(typen)) {
    fehler.push("Frontend (tauri-app/src/typen.ts) bezieht STANDARD_AUSSCHLUESSE nicht aus @propsa/core");
  }
  console.log(`✓ Ausschlusskatalog: Core und Rust je ${coreKatalog.length} Verzeichnisse und ${coreDateien.length} Dateien; Frontend bezieht STANDARD_AUSSCHLUESSE aus @propsa/core`);
}

// 5. Links – kontext.md bleibt außen vor (generierte Zitate, siehe oben).
const dokumente = dateienSammeln(WURZEL, [".md"]).filter(pfad => relativ(pfad) !== "kontext.md");
let linkAnzahl = 0;
for (const pfad of dokumente) {
  for (const treffer of readFileSync(pfad, "utf8").matchAll(/\]\(([^)]+)\)/g)) {
    const ziel = treffer[1].split("#")[0].trim();
    if (ziel === "" || /^(https?:|mailto:)/.test(ziel)) continue;
    linkAnzahl++;
    if (!existsSync(resolve(dirname(pfad), ziel))) fehler.push(`${relativ(pfad)}: Link ins Leere → ${ziel}`);
  }
}
console.log(`✓ Links: ${linkAnzahl} relative Verweise in ${dokumente.length} Dokumenten geprüft`);

// 6. Sprachkataloge – Endungs-Tabelle und Fence-Tabelle müssen zwischen
//    @propsa/core (TypeScript) und sprache.rs (Rust) deckungsgleich sein.
function tsKatalogAusBlock(text, blockMuster) {
  const block = text.match(blockMuster);
  if (!block) return null;
  const katalog = {};
  for (const zeile of block[1].split(/\r?\n/)) {
    // Key wie im Quelltext: quoted oder bare (`ts: 'TypeScript'`).
    const treffer = zeile.match(
      /^\s*(?:['"]([^'"]+)['"]|([A-Za-z0-9_.$]+))\s*:\s*['"]([^'"]+)['"],?\s*$/
    );
    if (treffer) katalog[treffer[1] ?? treffer[2]] = treffer[3];
  }
  return katalog;
}

function rustKatalogAusFunktion(text, funktionsName) {
  return rustKatalogAusFunktionMit(text, funktionsName, /^\s*[^=]+=>\s*"([^"]+)"/);
}

/** Wie oben, aber die match-Arme liefern Zahlen (z. B. Schwere, Schwellen). */
function rustZahlenKatalogAusFunktion(text, funktionsName) {
  return rustKatalogAusFunktionMit(text, funktionsName, /^\s*[^=]+=>\s*(\d+)/);
}

function rustKatalogAusFunktionMit(text, funktionsName, armmuster) {
  const start = text.indexOf(`pub fn ${funktionsName}`);
  const naechster = text.indexOf("pub fn ", start + 1);
  if (start === -1) return null;
  const block = text.slice(start, naechster === -1 ? text.length : naechster);
  const katalog = {};
  for (const zeile of block.split(/\r?\n/)) {
    const treffer = zeile.match(armmuster);
    if (!treffer) continue;
    for (
      const schluessel of [...zeile.slice(0, zeile.indexOf("=>")).matchAll(/"([^"]+)"/g)].map(t => t[1])
    ) {
      katalog[schluessel] = treffer[1];
    }
  }
  return katalog;
}

function katalogeVergleichen(tsKatalog, rustKatalog, bezeichnung) {
  if (!tsKatalog || !rustKatalog) {
    fehler.push(`${bezeichnung}: Katalog nicht gefunden (Core oder Rust)`);
    return;
  }
  const tsSchluessel = Object.keys(tsKatalog).sort();
  const rustSchluessel = Object.keys(rustKatalog).sort();
  if (tsSchluessel.join(",") !== rustSchluessel.join(",")) {
    const nurTs = tsSchluessel.filter(s => !(s in rustKatalog));
    const nurRust = rustSchluessel.filter(s => !(s in tsKatalog));
    fehler.push(
      `${bezeichnung}: Schlüssel weichen ab` +
        (nurTs.length ? ` (nur Core: ${nurTs.join(", ")})` : "") +
        (nurRust.length ? ` (nur Rust: ${nurRust.join(", ")})` : "")
    );
    return;
  }
  const abweichend = tsSchluessel.filter(s => tsKatalog[s] !== rustKatalog[s]);
  if (abweichend.length > 0) {
    fehler.push(
      `${bezeichnung}: Werte weichen ab: ` +
        abweichend.map(s => `${s} (Core ${tsKatalog[s]} ↔ Rust ${rustKatalog[s]})`).join(", ")
    );
    return;
  }
  console.log(`✓ ${bezeichnung}: ${tsSchluessel.length} Einträge deckungsgleich (Core ↔ Rust)`);
}

const spracheTs = readFileSync(join(WURZEL, "packages/core/src/sprache.ts"), "utf8");
const spracheRust = readFileSync(join(WURZEL, "tauri-app/src-tauri/src/sprache.rs"), "utf8");
const endungenTs = tsKatalogAusBlock(spracheTs, /const SPRACHE_NACH_ENDUNG: Record<string, string> = \{([\s\S]*?)\r?\n\};/);
const fenceTs = tsKatalogAusBlock(spracheTs, /const FENCE_NACH_SPRACHE: Record<string, string> = \{([\s\S]*?)\r?\n\};/);
const endungenRust = rustKatalogAusFunktion(spracheRust, "sprache_fuer_endung");
const fenceRust = rustKatalogAusFunktion(spracheRust, "code_block_sprache");
katalogeVergleichen(endungenTs, endungenRust, "Sprachkatalog (Endungen)");
katalogeVergleichen(fenceTs, fenceRust, "Fence-Katalog");

// 7. Live-Kataloge – Anomalie-Schwere, -Beschreibungen und -Schwellen müssen
//    zwischen @propsa/core (TypeScript) und live_anomalie.rs deckungsgleich sein.
const liveTs = readFileSync(join(WURZEL, "packages/core/src/live.ts"), "utf8");
const liveRust = readFileSync(join(WURZEL, "tauri-app/src-tauri/src/live_anomalie.rs"), "utf8");
const schwereTs = tsKatalogAusBlock(liveTs, /export const ANOMALIE_SCHWERE: Record<[^>]*> = \{([\s\S]*?)\r?\n\};/);
const beschreibungenTs = tsKatalogAusBlock(liveTs, /export const ANOMALIE_BESCHREIBUNGEN: Record<[^>]*> = \{([\s\S]*?)\r?\n\};/);
const schwellenTs = tsKatalogAusBlock(liveTs, /export const ANOMALIE_SCHWELLEN: Record<string, string> = \{([\s\S]*?)\r?\n\};/);
const schwereRust = rustZahlenKatalogAusFunktion(liveRust, "schwere_fuer");
const beschreibungenRust = rustKatalogAusFunktion(liveRust, "beschreibung_fuer");
const schwellenRust = rustZahlenKatalogAusFunktion(liveRust, "schwellwert");
katalogeVergleichen(schwereTs, schwereRust, "Live-Katalog (Schwere)");
katalogeVergleichen(beschreibungenTs, beschreibungenRust, "Live-Katalog (Beschreibungen)");
katalogeVergleichen(schwellenTs, schwellenRust, "Live-Katalog (Schwellen)");

// 8. Zwischenspeicher-Konstanten – Formatversion und Schema-Kennung müssen
//    zwischen @propsa/core und zwischenspeicher.rs deckungsgleich sein.
const zwischenspeicherRust = readFileSync(join(WURZEL, "tauri-app/src-tauri/src/zwischenspeicher.rs"), "utf8");
const zwischenspeicherTs = readFileSync(join(WURZEL, "packages/core/src/zwischenspeicher.ts"), "utf8");
const versionTs = zwischenspeicherTs.match(/export const ZWISCHENSPEICHER_VERSION = (\d+);/)?.[1];
const schemaTs = zwischenspeicherTs.match(/export const ZWISCHENSPEICHER_SCHEMA = '([^']+)';/)?.[1];
const versionRust = zwischenspeicherRust.match(/ZWISCHENSPEICHER_VERSION: u64 = (\d+);/)?.[1];
const schemaRust = zwischenspeicherRust.match(/ZWISCHENSPEICHER_SCHEMA: &str = "([^"]+)";/)?.[1];
if (!versionTs || !schemaTs || !versionRust || !schemaRust) {
  fehler.push("Zwischenspeicher: Konstanten nicht gefunden (Core oder Rust)");
} else {
  if (versionTs !== versionRust) fehler.push(`Zwischenspeicher-Version weicht ab (Core ${versionTs} ↔ Rust ${versionRust})`);
  if (schemaTs !== schemaRust) fehler.push(`Zwischenspeicher-Schema weicht ab (Core ${schemaTs} ↔ Rust ${schemaRust})`);
  if (versionTs === versionRust && schemaTs === schemaRust) {
    console.log(`✓ Zwischenspeicher: Version ${versionTs} und Schema deckungsgleich (Core ↔ Rust)`);
  }
}

// 9. Baustein-Kataloge – Gate-Punkte, Status-Werte und Ereignistypen müssen
//    zwischen @propsa/core (vertrag.ts) und vertrag.rs deckungsgleich sein.
const vertragTs = readFileSync(join(WURZEL, "packages/core/src/vertrag.ts"), "utf8");
const vertragRust = readFileSync(join(WURZEL, "tauri-app/src-tauri/src/vertrag.rs"), "utf8");
const gatePunkteTs = tsKatalogAusBlock(vertragTs, /export const GATE_PUNKTE: Record<string, string> = \{([\s\S]*?)\r?\n\};/);
const statusWerteTs = tsKatalogAusBlock(vertragTs, /export const STATUS_WERTE: Record<string, string> = \{([\s\S]*?)\r?\n\};/);
const ereignisTypenTs = tsKatalogAusBlock(vertragTs, /export const EREIGNIS_TYPEN: Record<string, string> = \{([\s\S]*?)\r?\n\};/);
katalogeVergleichen(gatePunkteTs, rustKatalogAusFunktion(vertragRust, "gate_punkte"), "Baustein-Katalog (Gate-Punkte)");
katalogeVergleichen(statusWerteTs, rustKatalogAusFunktion(vertragRust, "status_werte"), "Baustein-Katalog (Status-Werte)");
katalogeVergleichen(ereignisTypenTs, rustKatalogAusFunktion(vertragRust, "ereignis_typen"), "Baustein-Katalog (Ereignistypen)");

// Ergebnis
if (fehler.length > 0) {
  console.error(`\n✗ ${fehler.length} Verstoß/Verstöße:`);
  for (const eintrag of fehler) console.error(`  - ${eintrag}`);
  process.exit(1);
}
console.log("\n✓ Keine Verstöße.");
