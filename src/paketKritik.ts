/**
 * Kritik-Linse für das Paket: Godfiles, Logikmischung, Artefakte, Doku-Lügen.
 *
 * Gegenstück: `tauri-app/src-tauri/src/paketkritik.rs`. Zahlen ohne
 * Tausendertrenner, damit beide Oberflächen dieselbe Datei erzeugen.
 * Nur LOC + Regex + Pfadlisten – kein AST.
 */
import { GescannteDatei } from './scanner';
import { SchemaMeta } from '@propsa/core';
import { kopf } from './paketBasis';

const GOD_GRENZE = 300;

const DOMAENEN = [
  'src/components',
  'src/simulation',
  'src/render',
  'src/bus',
  'src/persistence',
] as const;

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

function dateiDomain(pfad: string): string | null {
  for (const d of DOMAENEN) if (pfad.startsWith(d + '/') || pfad === d) return d;
  return null;
}

function importDomain(spec: string): string | null {
  for (const d of DOMAENEN) {
    const kurz = d.split('/').pop()!;
    if (spec.includes(d) || spec.includes('/' + kurz + '/') || spec.includes(kurz + '/')) return d;
  }
  return null;
}

function prozent(teil: number, gesamt: number): string {
  const b = gesamt > 0 ? gesamt : 1;
  return `${Math.round((teil / b) * 100)} %`;
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
  const mischungen: Array<{ pfad: string; eigen: string; fremde: string[] }> = [];
  const importRe = /import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]/g;
  for (const d of dateien) {
    const eigen = dateiDomain(d.relativerPfad);
    if (!eigen) continue;
    const fremde = new Set<string>();
    let m: RegExpExecArray | null;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(d.inhalt)) !== null) {
      const dom = importDomain(m[1]);
      if (dom && dom !== eigen) fremde.add(dom);
    }
    if (fremde.size >= 3) mischungen.push({ pfad: d.relativerPfad, eigen, fremde: [...fremde].sort() });
  }
  if (mischungen.length === 0) {
    text += 'Keine Datei importiert aus ≥ 3 fremden Domänen.\n';
  } else {
    text += '| Datei | Eigen | Fremde Domänen |\n|---|---|---|\n';
    for (const r of mischungen.sort((a, b) => a.pfad.localeCompare(b.pfad))) {
      text += `| \`${r.pfad}\` | \`${r.eigen}\` | ${r.fremde.map(f => `\`${f}\``).join(', ')} |\n`;
    }
    text += `\nEmpfehlung: Domänengrenzen schärfen oder Fassade einziehen.\n`;
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
  // Eine Referenz zählt nur als „fehlend“, wenn sie wie eine echte Datei
  // aussieht (mit Endung) und kein Eintrag im `dateien`-Array passt – nicht
  // schon, wenn sie nicht wörtlich im Paket steht. Verzeichnis- und
  // Pseudo-Referenzen (`src/…`, Wildcards, Endpunkte ohne Endung) sind
  // keine Behauptung über eine Datei.
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
  const referenzErfuellt = (p: string): boolean =>
    [...vorhanden].some(v => v === p || v.startsWith(p + '/') || p.startsWith(v + '/'));
  const istDateireferenz = (p: string): boolean =>
    /\.[A-Za-z0-9]+$/.test(p) && !p.includes('*');
  const fehlend: string[] = [];
  for (const p of [...erwaehnt].sort()) {
    if (!istDateireferenz(p) || p.includes('*')) continue;
    if (!referenzErfuellt(p)) fehlend.push(p);
  }
  if (docs.length === 0) {
    text += 'Keine `docs/**/*.md` im Paket – nichts zu prüfen.\n';
  } else if (erwaehnt.size === 0) {
    text += `${docs.length} Doku-Datei(en) ohne \`src/…\`-Pfadreferenz – nichts zu prüfen.\n`;
  } else if (fehlend.length === 0) {
    text += `Alle ${erwaehnt.size} Datei-Referenzen existieren im Paket.\n`;
  } else {
    text += `**${fehlend.length} von ${erwaehnt.size} Referenzen fehlen im Paket:**\n\n`;
    for (const p of fehlend.slice(0, 30)) text += `- \`${p}\`\n`;
    if (fehlend.length > 30) text += `- … und ${fehlend.length - 30} weitere\n`;
  }

  return text;
}
