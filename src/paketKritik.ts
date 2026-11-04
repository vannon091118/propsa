/**
 * Kritik-Linse für das Paket: Godfiles, Logikmischung, Artefakte, Doku-Lügen.
 *
 * Gegenstück: `tauri-app/src-tauri/src/paketkritik.rs`. Zahlen ohne
 * Tausendertrenner, damit beide Oberflächen dieselbe Datei erzeugen.
 * Nur LOC + Regex + Pfadlisten – kein AST.
 */
import { GescannteDatei } from './scanner';
import { SchemaMeta } from '@propakt/core';
import { kopf } from './paketBasis';

const GOD_GRENZE = 300;

// Conventional source containers are roots, not project-specific domain names.
// The actual domains are inferred from the first module directory below them.
const QUELLWURZELN = new Set([
  'src', 'app', 'lib', 'source', 'modules', 'packages', 'server', 'client',
]);
const NICHT_QUELLSPRACHEN = new Set([
  'Markdown', 'JSON', 'YAML', 'TOML', 'Text', 'XML', 'HTML', 'CSV', 'INI',
]);

const ARTEFAKTE: Array<{ muster: string; test: (p: string) => boolean }> = [
  { muster: 'context.md', test: p => p === 'context.md' || p.endsWith('/context.md') },
  { muster: 'context.json', test: p => p === 'context.json' || p.endsWith('/context.json') },
  { muster: 'package-lock.json', test: p => p.endsWith('package-lock.json') },
  { muster: '*.tsbuildinfo', test: p => p.endsWith('.tsbuildinfo') },
  { muster: '*.bak', test: p => p.endsWith('.bak') },
  { muster: 'playwright-report/**', test: p => p.includes('playwright-report/') },
  { muster: 'test-results/**', test: p => p.includes('test-results/') },
  { muster: 'git-noir/.tmp/**', test: p => p.includes('git-noir/.tmp/') || p.includes('.tmp/') },
  { muster: '.tmp/**', test: p => /(^|\/)\.tmp\//.test(p) },
];

function pfadSegmente(pfad: string): string[] {
  return pfad.replace(/\\/g, '/').split('/').filter(Boolean);
}

/** Infers a module boundary from a source file path; non-source documents are not domains. */
function dateiDomain(pfad: string, sprache: string): string | null {
  if (NICHT_QUELLSPRACHEN.has(sprache)) return null;
  const teile = pfadSegmente(pfad);
  if (teile.length < 2) return null;
  if (QUELLWURZELN.has(teile[0].toLowerCase())) {
    return teile.length >= 3 ? `${teile[0]}/${teile[1]}` : teile[0];
  }
  if (teile.length >= 3 && QUELLWURZELN.has(teile[1].toLowerCase())) {
    return `${teile[0]}/${teile[1]}`;
  }
  return teile[0];
}

function domainFuerPfad(pfad: string, domaenen: string[]): string | null {
  const treffer = domaenen
    .filter(d => pfad === d || pfad.startsWith(d + '/'))
    .sort((a, b) => b.length - a.length);
  if (treffer.length === 0) return null;
  if (treffer.length > 1 && treffer[0].length === treffer[1].length) return null;
  return treffer[0];
}

function relativenImportAufloesen(importer: string, spec: string): string {
  const teile = pfadSegmente(importer);
  teile.pop();
  for (const teil of pfadSegmente(spec)) {
    if (teil === '.') continue;
    if (teil === '..') teile.pop();
    else teile.push(teil);
  }
  return teile.join('/');
}

/** Resolves only explicit local paths and common @/ or ~/ aliases; ambiguous imports stay unclassified. */
function importDomain(spec: string, importer: string, domaenen: string[]): string | null {
  const muster = spec.replace(/\\/g, '/');
  if (muster.startsWith('./') || muster.startsWith('../')) {
    return domainFuerPfad(relativenImportAufloesen(importer, muster), domaenen);
  }
  const alias = muster.startsWith('@/') || muster.startsWith('~/');
  if (alias) {
    const rest = muster.slice(2);
    const treffer = [...new Set([...QUELLWURZELN]
      .map(wurzel => domainFuerPfad(`${wurzel}/${rest}`, domaenen))
      .filter((wert): wert is string => wert !== null))];
    return treffer.length === 1 ? treffer[0] : null;
  }
  if (muster.startsWith('/')) return domainFuerPfad(muster.slice(1), domaenen);
  if ([...QUELLWURZELN].some(wurzel => muster.startsWith(wurzel + '/'))) {
    return domainFuerPfad(muster, domaenen);
  }
  return null;
}

function istLokalerImport(spec: string): boolean {
  const muster = spec.replace(/\\/g, '/');
  return muster.startsWith('./') || muster.startsWith('../') ||
    muster.startsWith('@/') || muster.startsWith('~/') || muster.startsWith('/') ||
    [...QUELLWURZELN].some(wurzel => muster.startsWith(wurzel + '/'));
}

function prozent(teil: number, gesamt: number): string {
  const b = gesamt > 0 ? gesamt : 1;
  return `${Math.round((teil / b) * 100)} %`;
}

/** Expands shell-style comma lists such as {one,two}.ts into literal paths. */
function klammerPfadeErweitern(pfad: string): string[] {
  const start = pfad.indexOf('{');
  if (start < 0) return [pfad];
  const ende = pfad.indexOf('}', start + 1);
  if (ende < 0) return [pfad];
  const varianten = pfad.slice(start + 1, ende).split(',');
  if (varianten.length < 2) return [pfad];
  return varianten.flatMap(variante =>
    klammerPfadeErweitern(pfad.slice(0, start) + variante + pfad.slice(ende + 1))
  );
}

export function kritik(meta: SchemaMeta, dateien: GescannteDatei[]): string {
  const gesamtZeilen = dateien.reduce((s, d) => s + d.zeilen, 0);
  const vorhanden = new Set(dateien.map(d => d.relativerPfad));

  let text = kopf('Kritik', meta, [
    '**Hinweis:** Diese Linse bewertet Struktur, nicht Funktionalität.',
  ]);

  // --- 1. Godfiles
  text += '\n## Godfiles (> 300 Zeilen)\n\n';
  const godfiles = [...dateien].filter(d => d.zeilen > GOD_GRENZE).sort((a, b) => b.zeilen - a.zeilen);
  if (godfiles.length === 0) {
    text += 'Keine Datei über 300 Zeilen – kompakte Module.\n';
  } else {
    text += '| Datei | Sprache | Zeilen | Anteil |\n|---|---|---|---|\n';
    for (const d of godfiles) {
      text += `| \`${d.relativerPfad}\` | ${d.sprache} | ${d.zeilen} | ${prozent(d.zeilen, gesamtZeilen)} |\n`;
    }
    text += `\n${godfiles.length} Datei(en) über 300 Zeilen – Kandidaten für Schnitte.\n`;
  }

  // --- 2. Logikmischung
  text += '\n## Logikmischung (≥ 3 fremde Domänen)\n\n';
  const domaenen = [...new Set(dateien
    .map(d => dateiDomain(d.relativerPfad, d.sprache))
    .filter((wert): wert is string => wert !== null))].sort();
  text += '**Erkannte Domänen (Pfadheuristik):** ' + (domaenen.length ? domaenen.join(', ') : 'keine') + '\n\n';
  text += '**Grenze:** Statische ES-Importe sowie relative Pfade und eindeutige @/~/ Aliase; kein AST und kein vollständiger Laufzeit-Abhängigkeitsgraph.\n\n';

  const mischungen: Array<{ pfad: string; eigen: string; fremde: string[] }> = [];
  let nichtZuordenbareLokaleImports = 0;
  const importRe = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  for (const d of dateien) {
    const eigen = dateiDomain(d.relativerPfad, d.sprache);
    if (!eigen) continue;
    const fremde = new Set<string>();
    let m: RegExpExecArray | null;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(d.inhalt)) !== null) {
      const dom = importDomain(m[1], d.relativerPfad, domaenen);
      if (dom && dom !== eigen) fremde.add(dom);
      else if (!dom && istLokalerImport(m[1])) nichtZuordenbareLokaleImports += 1;
    }
    if (fremde.size >= 3) mischungen.push({ pfad: d.relativerPfad, eigen, fremde: [...fremde].sort() });
  }
  if (domaenen.length === 0) {
    text += 'Keine Quell-Domänen erkannt – Logikmischung nicht bewertet.\n';
  } else if (mischungen.length === 0) {
    text += 'Keine Datei importiert aus ≥ 3 erkannten fremden Domänen.\n';
  } else {
    text += '| Datei | Eigen | Fremde Domänen |\n|---|---|---|\n';
    for (const r of mischungen.sort((a, b) => a.pfad.localeCompare(b.pfad))) {
      text += '| ' + r.pfad + ' | ' + r.eigen + ' | ' + r.fremde.join(', ') + ' |\n';
    }
    text += '\nEmpfehlung: Domänengrenzen schärfen oder Fassade einziehen.\n';
  }
  if (nichtZuordenbareLokaleImports > 0) {
    text += '\nNicht eindeutig zuordenbare lokale Imports: ' + nichtZuordenbareLokaleImports + ' (nicht als Entwarnung gewertet).\n';
  }

  // --- 3. Repo-Sauberkeit
  text += '\n## Repo-Sauberkeit (Artefakte im Paket)\n\n';
  const artefakte = dateien.filter(d => ARTEFAKTE.some(a => a.test(d.relativerPfad)));
  if (artefakte.length === 0) {
    text += 'Keine Artefakte im Paket.\n';
  } else {
    const artefaktZeilen = artefakte.reduce((s, d) => s + d.zeilen, 0);
    text += `**${artefakte.length} Datei(en), ${artefaktZeilen} Zeilen (${prozent(artefaktZeilen, gesamtZeilen)}) sind Artefakte.**\n\n`;
    text += '| Datei | Zeilen | Muster |\n|---|---|---|\n';
    for (const d of [...artefakte].sort((a, b) => b.zeilen - a.zeilen)) {
      const muster = ARTEFAKTE.find(a => a.test(d.relativerPfad))!.muster;
      text += `| \`${d.relativerPfad}\` | ${d.zeilen} | \`${muster}\` |\n`;
    }
    text += '\nEmpfehlung: Muster in `IGNORIERTE_VERZEICHNISSE` / `STANDARD_AUSSCHLUESSE` aufnehmen oder via `-e` ausschließen.\n';
    if (artefakte.some(d => d.relativerPfad.endsWith('context.md') || d.relativerPfad.endsWith('context.json'))) {
      text += 'Hinweis: Das Paket enthält sein eigenes Ergebnis (`context.md`/`context.json`) – Selbstreferenz.\n';
    }
  }

  // --- 4. Doku-Wahrheit
  //
  // Diese Linse prüft konkrete Datei-Referenzen mit Endung.
  // Ordnerpfade, Platzhalter und Pseudoreferenzen werden nicht als
  // Existenznachweis ausgegeben.
  text += '\n## Doku-Wahrheit (Pfad-Referenzen in docs/**/*.md)\n\n';
  const docs = dateien.filter(d => d.relativerPfad.startsWith('docs/') && d.relativerPfad.endsWith('.md'));
  const pfadRe = /\b(src\/[^\s\"'`\)\]]+)/g;
  const erwaehnt = new Set<string>();
  for (const d of docs) {
    let m: RegExpExecArray | null;
    pfadRe.lastIndex = 0;
    while ((m = pfadRe.exec(d.inhalt)) !== null) {
      erwaehnt.add(m[1].replace(/[.,;:]$/, ''));
    }
  }
  // Referenz ist erfüllt, wenn ein echter Paket-Eintrag exakt passt oder
  // als Verzeichnis den referenzierten Pfad abdeckt.
  // This branch handles file references only; a prefix is not file identity.
  const referenzErfuellt = (p: string): boolean => vorhanden.has(p);
  const istDateireferenz = (p: string): boolean =>
    /\.[A-Za-z0-9]+$/.test(p) && !p.includes('*');
  const dateireferenzen = [...new Set([...erwaehnt]
    .filter(istDateireferenz)
    .flatMap(klammerPfadeErweitern))].sort();
  const fehlend: string[] = [];
  for (const p of dateireferenzen) {
    if (!referenzErfuellt(p)) fehlend.push(p);
  }
  if (docs.length === 0) {
    text += 'Keine `docs/**/*.md` im Paket – nichts zu prüfen.\n';
  } else if (dateireferenzen.length === 0) {
    text += `${docs.length} Doku-Datei(en) ohne konkrete Datei-Referenz – nichts zu prüfen.\n`;
  } else if (fehlend.length === 0) {
    text += `Alle ${dateireferenzen.length} Datei-Referenzen existieren im Paket.\n`;
  } else {
    text += `**${fehlend.length} von ${dateireferenzen.length} Referenzen fehlen im Paket:**\n\n`;
    for (const p of fehlend.slice(0, 30)) text += `- \`${p}\`\n`;
    if (fehlend.length > 30) text += `- … und ${fehlend.length - 30} weitere\n`;
  }

  return text;
}
