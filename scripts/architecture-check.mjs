/**
 * Architecture-Check für das PROPAKT-Repository. Fünf Zusagen aus INDEX.json,
 * jede mit Exit-Code: Zonen-Index vorhanden · `umfang` existiert in der
 * deklarierten Art · jede versionierte Datei gehört genau einer Zone und liegt
 * vor · jeder Matrixknoten löst auf genau eine Zone auf · jeder Verweis in
 * jeder Index-Datei zeigt auf vorhandene Pfade (alle 34, keine Stichprobe).
 *
 * `umfang` aus INDEX.json ist die einzige Zonenquelle; die Matrix liefert nur
 * Knoten. Fehlt eine Datei im Checkout, unterscheidet `git ls-files -v` die
 * Fälle – das Skript rät nicht.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { WURZEL, versionierteDateien, versionierteDateienMitFlag } from "./dateien.mjs";

/**
 * Lädt eine JSON-Datei sicher.
 */
function loadJsonFile(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error(`Fehler beim Laden von ${filePath}: ${e.message}`);
    return null;
  }
}

/** `/foo/` = Verzeichnispräfix, sonst einzelne Datei. */
function trefferIn(pfad, zone) {
  return (zone.umfang || []).filter(eintrag =>
    eintrag.endsWith("/") ? pfad.startsWith(eintrag) : pfad === eintrag
  );
}

/** Zonenname oder Pfad mit Zonenpräfix; 0 oder >1 Treffer ist ein Fehler. */
function zonenVonKnoten(knoten, zones) {
  if (zones.some(z => z.name === knoten)) return [knoten];
  return zones
    .filter(z => z.umfang.some(e => e.endsWith("/") && knoten.startsWith(e)))
    .map(z => z.name);
}

/** Hinweis auf einen Zustand des Checkouts – bewusst kein Fehler. */
function hinweisCheckout(text, zeilen) {
  if (zeilen.length === 0) return;
  console.log(`ℹ️ ${text}`);
  meldeZeilen("nicht ausgecheckt", zeilen, 5, console.log);
}

/** Aufgelistete Meldung mit Kürzung: die ersten `grenze` Zeilen, dann die Zahl der übrigen. */
function meldeZeilen(titel, zeilen, grenze = 10, schreiber = console.error) {
  for (const zeile of zeilen.slice(0, grenze)) schreiber(`   ${titel}: ${zeile}`);
  if (zeilen.length > grenze) schreiber(`   ... und ${zeilen.length - grenze} weitere`);
}

/** Abbruch mit Fehlermeldung – spart den dreizeiligen Rumpf an jeder Stelle. */
function bricht(text) {
  console.error(`❌ ${text}`);
  process.exit(1);
}

function runArchitectureCheck() {
  // Die geflaggte Liste einmal holen. Ab hier beantwortet eine Menge die Frage
  // „nicht ausgecheckt“, statt sie je Element neu an git zu stellen – das war
  // ein git-Prozess pro Verzeichnisverweis.
  const dateien = versionierteDateienMitFlag();
  const versioniertePfade = dateien.map(z => z.pfad);
  const sPfade = new Set(dateien.filter(z => z.uebersprungen).map(z => z.pfad));

  /** Die Teilmenge, die der Checkout absichtlich nicht ausgelegt hat. */
  const nichtAusgecheckt = pfade => new Set(pfade.filter(p => sPfade.has(p)));

  /** Git kennt kein Verzeichnis-Flag: es zählt die Dateien darin. */
  const verzeichnisNichtAusgecheckt = pfad => {
    const praefix = pfad.endsWith("/") ? pfad : `${pfad}/`;
    const inhalt = versioniertePfade.filter(p => p.startsWith(praefix));
    return inhalt.length > 0 && inhalt.every(p => sPfade.has(p));
  };

  const rootIndex = loadJsonFile(join(WURZEL, "INDEX.json"));
  if (!rootIndex) bricht("Root-INDEX.json nicht gefunden oder ungültig.");
  console.log("✅ INDEX.json geladen.");

  const zones = rootIndex.modules || [];
  if (zones.length === 0) bricht("Keine Zonen im Root-INDEX gefunden.");
  const ohneUmfang = zones.filter(m => !Array.isArray(m.umfang) || m.umfang.length === 0);
  if (ohneUmfang.length > 0) bricht(`Zone ohne "umfang" deklariert: ${ohneUmfang.map(m => m.name).join(", ")}`);
  console.log(`✅ ${zones.length} Zonen deklariert: ${zones.map(m => m.name).join(", ")}`);

  // 1. Jede Zone mit `index` besitzt diese Datei.
  for (const zone of zones.filter(z => z.index)) { // repo_ebene hat keinen
    if (!existsSync(join(WURZEL, zone.index))) {
      bricht(`INDEX für Zone "${zone.name}" nicht gefunden unter ${zone.index}`);
    }
    if (!loadJsonFile(join(WURZEL, zone.index))) {
      bricht(`INDEX für Zone "${zone.name}" ist kein gültiges JSON.`);
    }
  }
  console.log("✅ Alle Zonen-INDEX-Dateien existieren und sind gültig.");

  // 2. `umfang` in der deklarierten Art; nicht ausgecheckte Einträge fragt git.
  const umfangTot = new Set();
  let umfangAnzahl = 0;
  const umfangFehlt = new Set();
  for (const zone of zones) {
    for (const eintrag of zone.umfang) {
      umfangAnzahl++;
      const voll = join(WURZEL, eintrag);
      const sollVerzeichnis = eintrag.endsWith("/");
      if (!existsSync(voll)) {
        (nichtAusgecheckt([eintrag]).has(eintrag) ? umfangFehlt : umfangTot).add(
          `${zone.name}: ${eintrag} existiert nicht`
        );
      } else if (statSync(voll).isDirectory() !== sollVerzeichnis) {
        umfangTot.add(
          `${zone.name}: ${eintrag} ist ${statSync(voll).isDirectory() ? "ein Verzeichnis" : "eine Datei"}, ` +
          `deklariert als ${sollVerzeichnis ? "Verzeichnispräfix" : "Datei"}`
        );
      }
    }
  }
  if (umfangTot.size > 0) {
    meldeZeilen("umfang ins Leere", [...umfangTot]);
    bricht(`Zonenumfang zeigt auf ${umfangTot.size} nicht vorhandene Pfade.`);
  }
  hinweisCheckout(
    `${umfangFehlt.size} umfang-Eintrag/Einträge sind nicht ausgecheckt (git-Flag S).`,
    [...umfangFehlt]
  );
  console.log(`✅ Alle ${umfangAnzahl} umfang-Einträge sind deklariert${umfangFehlt.size ? "" : " und existieren"}.`);

  // 3. Jede versionierte Datei gehört genau einer Zone. Ob sie zudem auf der
  // Platte liegt, ist eine zweite Frage mit zwei verschiedenen Antworten –
  const herrenlos = [];
  const doppelt = [];
  const geloescht = [];
  const fehltImCheckout = [];
  for (const { pfad, uebersprungen } of dateien) {
    const treffer = zones.filter(z => trefferIn(pfad, z).length > 0);
    if (treffer.length === 0) herrenlos.push(pfad);
    else if (treffer.length > 1) doppelt.push(`${pfad} → ${treffer.map(z => z.name).join(", ")}`);
    else if (!existsSync(join(WURZEL, pfad))) {
      (uebersprungen ? fehltImCheckout : geloescht).push(`${pfad} → ${treffer[0].name}`);
    }
  }

  if (herrenlos.length > 0 || doppelt.length > 0) {
    meldeZeilen("herrenlos", herrenlos);
    meldeZeilen("doppelt", doppelt);
    bricht(`Zonenzuordnung nicht exklusiv: ${herrenlos.length} herrenlos, ${doppelt.length} doppelt.`);
  }
  if (geloescht.length > 0) {
    meldeZeilen("im Arbeitsbaum geloescht", geloescht);
    bricht(
      `${geloescht.length} zugeordnete Datei(en) stehen im Index, fehlen aber im Arbeitsbaum. ` +
      `Quelle: git ls-files (Index), Dateisystem (Arbeitsbaum).`
    );
  }
  hinweisCheckout(
    `${fehltImCheckout.length} zugeordnete Datei(en) sind nicht ausgecheckt (git-Flag S). ` +
    `Checkout-Zustand, kein Fehler im Repository – die Zonenzuordnung oben gilt trotzdem.`,
    fehltImCheckout
  );
  console.log(
    `✅ Alle ${dateien.length} versionierten Dateien gehören genau einer Zone` +
    `${geloescht.length + fehltImCheckout.length === 0 ? " und liegen vor" : ""}.`
  );

  // 4. Jeder Knoten der Index-Matrix löst auf genau eine Zone auf. Die Matrix
  // liefert nur Knoten; die Zonen kommen aus INDEX.json.
  const matrix = loadJsonFile(join(WURZEL, "INDEX_MATRIX.json"));
  if (!matrix || !Array.isArray(matrix.relationships)) {
    bricht("INDEX_MATRIX.json nicht gefunden oder ohne relationships.");
  }
  const knoten = [...new Set(matrix.relationships.flatMap(r => [r.from, r.to]))];
  const undokumentiert = [];
  for (const knotenName of knoten) {
    const treffer = zonenVonKnoten(knotenName, zones);
    if (treffer.length === 0) {
      undokumentiert.push(`${knotenName} → keine Zone (weder Zonenname noch Pfad mit Zonenpräfix)`);
    } else if (treffer.length > 1) {
      undokumentiert.push(`${knotenName} → mehrdeutig: ${treffer.join(", ")}`);
    }
  }
  if (undokumentiert.length > 0) {
    for (const zeile of undokumentiert) console.error(`   Knoten ohne Zone: ${zeile}`);
    bricht(`${undokumentiert.length} von ${knoten.length} Matrix-Knoten lösen nicht auf genau eine Zone auf.`);
  }
  console.log(`✅ Alle ${knoten.length} Knoten der Index-Matrix lösen auf genau eine Zone auf.`);

  // 5. Alle versionierten Index-Dateien, keine Stichprobe. Zwei Schemata:
  // `contents[]` mit `path`/`type`, `dateien[]`/`muster[]` mit `pfad`.
  const indexDateien = versionierteDateien()
    .filter(p => p !== "INDEX.json" && p.endsWith("INDEX.json"));
  const toeteVerweise = [];
  const schemaFehler = [];
  const verweiseOhnePlatte = [];
  let verweise = 0;

  // Ein Durchgang: alle INDXe lesen, ihre Eintraege sammeln, dann git einmal
  // fragen, welche dieser Pfade der Checkout absichtlich nicht ausgelegt hat.
  const eintraegeProIndex = [];
  for (const indexPfad of indexDateien) {
    const inhalt = loadJsonFile(join(WURZEL, indexPfad));
    const eintraege = inhalt && (inhalt.contents || inhalt.dateien || inhalt.muster);
    eintraegeProIndex.push({ indexPfad, eintraege, feld: inhalt?.contents ? "path" : "pfad" });
  }
  const nichtAusgechecktZiele = nichtAusgecheckt([
    ...indexDateien,
    ...eintraegeProIndex.flatMap(({ indexPfad, eintraege, feld }) =>
      Array.isArray(eintraege)
        ? eintraege
            .filter(e => typeof e[feld] === "string")
            .map(e => join(dirname(indexPfad), e[feld]).split(sep).join("/"))
        : []
    ),
  ]);

  for (const { indexPfad, eintraege, feld } of eintraegeProIndex) {
    if (nichtAusgechecktZiele.has(indexPfad)) continue;
    if (!Array.isArray(eintraege)) {
      schemaFehler.push(`${indexPfad}: nicht lesbar oder ohne contents[], dateien[], muster[]`);
      continue;
    }
    for (const eintrag of eintraege) {
      const rel = eintrag[feld];
      if (typeof rel !== "string") {
        schemaFehler.push(`${indexPfad}: Eintrag ohne "${feld}"`);
        continue;
      }
      verweise++;
      const istVerzeichnis = eintrag.type === "directory";
      if (eintrag.type && !["file", "directory"].includes(eintrag.type)) {
        schemaFehler.push(`${indexPfad}: unbekannter type "${eintrag.type}" bei ${rel}`);
      } else if (rel.endsWith("/") !== istVerzeichnis) {
        schemaFehler.push(`${indexPfad}: ${rel} widerspricht der type-Angabe "${eintrag.type}"`);
      }
      const voll = join(WURZEL, dirname(indexPfad), rel);
      if (!existsSync(voll)) {
        // Fehlt das Ziel, fragen wir git, ob der Checkout es absichtlich
        // ausgelassen hat; ein Verzeichnis erbt den Zustand seiner Dateien.
        const relPfad = join(dirname(indexPfad), rel).split(sep).join("/");
        if (nichtAusgechecktZiele.has(relPfad) || (istVerzeichnis && verzeichnisNichtAusgecheckt(relPfad))) {
          verweiseOhnePlatte.push(`${indexPfad} → ${rel}`);
        } else {
          toeteVerweise.push(`${indexPfad} → ${rel} existiert nicht`);
        }
      } else if (statSync(voll).isDirectory() !== istVerzeichnis) {
        toeteVerweise.push(
          `${indexPfad} → ${rel} ist ${statSync(voll).isDirectory() ? "ein Verzeichnis" : "eine Datei"}, ` +
          `deklariert als ${istVerzeichnis ? "Verzeichnis" : "Datei"}`
        );
      }
    }
  }

  if (schemaFehler.length > 0) {
    for (const zeile of schemaFehler) console.error(`   Schema: ${zeile}`);
    bricht(`${schemaFehler.length} Index-Einträge folgen keinem bekannten Schema.`);
  }
  if (toeteVerweise.length > 0) {
    meldeZeilen("toter Verweis", toeteVerweise);
    bricht(`${toeteVerweise.length} von ${verweise} Verweisen zeigen ins Leere.`);
  }
  hinweisCheckout(
    `${verweiseOhnePlatte.length} Verweisziel(e) sind nicht ausgecheckt (git-Flag S); ` +
    `der Index-Eintrag ist geprueft, sein Ziel nicht.`,
    verweiseOhnePlatte
  );
  const indexGeprueft = indexDateien.filter(p => !nichtAusgechecktZiele.has(p)).length;
  const indexFehlt = indexDateien.length - indexGeprueft;
  console.log(
    `✅ Alle ${verweise} Verweise in ${indexGeprueft} Zonen-INDEx zeigen auf vorhandene Pfade` +
    `${indexFehlt ? ` (${indexFehlt} Index-Dateien im Checkout nicht ausgecheckt)` : ""}.`
  );

  console.log("\n=== Architecture-Check erfolgreich abgeschlossen ===\n");
  process.exit(0);
}

runArchitectureCheck();
