/**
 * Tests für den Scan-Zwischenspeicher.
 *
 * Gegenstück: `src/zwischenspeicher.ts` (Node) und `packages/core/src/`
 * `zwischenspeicher.ts` (Vertrag). Aufruf:
 * npx ts-node tests/zwischenspeicher.test.ts
 *
 * Regressionskern: Der frühere Stub `src/scan_metrics.ts` lieferte eine
 * leere Fingerabdruck-Map, sodass jeder Vergleich „unverändert“ ergab.
 * Diese Tests verlangen das Gegenteil: eine geänderte Datei im Baum muss
 * den Cache-Treffer verweigern.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  baumSignatur,
  cacheTreffer,
  gleicheSignatur,
  istCacheEintrag,
  ZWISCHENSPEICHER_SCHEMA,
  ZWISCHENSPEICHER_VERSION,
} from '@propsa/core';
import {
  baumEintraege,
  cachePfad,
  konfigurationsSchluessel,
  laufMitCache,
  ladeCache,
} from '../src/zwischenspeicher';

function pruefe(name: string, bedingung: boolean): void {
  console.log(`${bedingung ? 'PASS' : 'FAIL'} ${name}`);
  if (!bedingung) process.exitCode = 1;
}

// ── 1. Signatur: Reihenfolge egal, Inhalt zählt ────────────────────────────
const links = [
  { relativerPfad: 'b.ts', groesse: 2, mtime: 20 },
  { relativerPfad: 'a.ts', groesse: 1, mtime: 10 },
];
const rechts = [
  { relativerPfad: 'a.ts', groesse: 1, mtime: 10 },
  { relativerPfad: 'b.ts', groesse: 2, mtime: 20 },
];
pruefe('gleiche Signatur trotz anderer Reihenfolge', gleicheSignatur(links, rechts));
pruefe('abweichende Größe erkannt', !gleicheSignatur(links, [{ ...rechts[0] }, { ...rechts[1], groesse: 3 }]));
pruefe('abweichende mtime erkannt', !gleicheSignatur(links, [{ ...rechts[0] }, { ...rechts[1], mtime: 99 }]));
pruefe('abweichende Pfadmenge erkannt', !gleicheSignatur(links, [rechts[0]]));
pruefe(
  'baumSignatur sortiert ohne Eingabe zu verändern',
  baumSignatur(links)[0].relativerPfad === 'a.ts' && links[0].relativerPfad === 'b.ts'
);

// ── 2. Struktur-Prüfung des Cache-Formats ──────────────────────────────────
const gueltigerEintrag = {
  schema: ZWISCHENSPEICHER_SCHEMA,
  version: ZWISCHENSPEICHER_VERSION,
  zeitstempel: '2026-09-17 12:00:00',
  signatur: [{ relativerPfad: 'a.ts', groesse: 1, mtime: 10 }],
  ergebnis: { titel: 'x', zeitstempel: 'z', dateien: [], uebersprungen: 0 },
};
pruefe('gültiger Eintrag erkannt', istCacheEintrag(gueltigerEintrag));
pruefe('falsches Schema abgelehnt', !istCacheEintrag({ ...gueltigerEintrag, schema: 'etwas-anderes' }));
pruefe('fehlendes Ergebnis abgelehnt', !istCacheEintrag({ ...gueltigerEintrag, ergebnis: undefined }));
pruefe('kaputte Signatur abgelehnt', !istCacheEintrag({ ...gueltigerEintrag, signatur: [{ relativerPfad: 1 }] }));
pruefe('Müll abgelehnt', !istCacheEintrag('müll') && !istCacheEintrag(null));

// ── 3. Treffer-Entscheidung ────────────────────────────────────────────────
const baum = [{ relativerPfad: 'a.ts', groesse: 1, mtime: 10 }];
pruefe('Treffer liefert Ergebnis', cacheTreffer(gueltigerEintrag, baum) === gueltigerEintrag.ergebnis);
pruefe('Version-Abstoß liefert null', cacheTreffer({ ...gueltigerEintrag, version: 99 }, baum) === null);
pruefe(
  'Signatur-Abstoß liefert null',
  cacheTreffer(gueltigerEintrag, [{ relativerPfad: 'a.ts', groesse: 5, mtime: 10 }]) === null
);
pruefe(
  'Ergebnis-Prädikat wird befragt',
  cacheTreffer(gueltigerEintrag, baum, () => false) === null &&
    cacheTreffer(gueltigerEintrag, baum, () => true) === gueltigerEintrag.ergebnis
);

// ── 4. Ende-zu-Ende in einem Wegwerf-Projekt ───────────────────────────────
async function haupt(): Promise<void> {
  const projekt = fs.mkdtempSync(path.join(os.tmpdir(), 'propsa-cache-'));
  const basisOptionen = {
    basisPfad: projekt,
    excludes: [] as string[],
    includes: [] as string[],
    cache: true,
  };
  const cacheDatei = cachePfad(
    konfigurationsSchluessel(projekt, [], [], undefined, undefined)
  );

  try {
    fs.writeFileSync(path.join(projekt, 'a.ts'), 'export const a = 1;\n', 'utf8');
    fs.writeFileSync(path.join(projekt, 'b.ts'), 'export const b = 2;\n', 'utf8');

    // Erstlauf ohne Cache: nichts gespeichert, nichts getroffen.
    const erster = await laufMitCache({ ...basisOptionen, cache: false });
    pruefe('Lauf ohne Cache greift nicht in den Speicher', erster.ausZwischenspeicher === false);
    pruefe('ohne Cache wird nichts gespeichert', !fs.existsSync(cacheDatei));

    // Erster Cache-Lauf: speichert.
    const zweiter = await laufMitCache(basisOptionen);
    pruefe('erster Cache-Lauf ist ein Fehlgriff', zweiter.ausZwischenspeicher === false);
    pruefe('Cache-Datei angelegt', fs.existsSync(cacheDatei));

    // Unveränderter Baum: Treffer, gleiche Dateimenge.
    const dritter = await laufMitCache(basisOptionen);
    pruefe('unveränderter Baum ist ein Treffer', dritter.ausZwischenspeicher === true);
    pruefe('Treffer enthält dieselben Dateien', dritter.ergebnis.dateien.length === 2);

    // Der Regressionskern: Inhalt ändern ⇒ kein Treffer, neuer Inhalt sichtbar.
    fs.writeFileSync(
      path.join(projekt, 'a.ts'),
      'export const a = 1;\nexport const neu = true;\n',
      'utf8'
    );
    const vierter = await laufMitCache(basisOptionen);
    pruefe('geänderter Datei-Inhalt verweigert den Treffer', vierter.ausZwischenspeicher === false);
    pruefe(
      'geänderter Inhalt landet im neuen Ergebnis',
      vierter.ergebnis.dateien.some(d => d.relativerPfad === 'a.ts' && d.inhalt.includes('neu'))
    );

    // Neue Datei im Baum ⇒ ebenfalls kein Treffer.
    fs.writeFileSync(path.join(projekt, 'c.ts'), 'export const c = 3;\n', 'utf8');
    const fuenfter = await laufMitCache(basisOptionen);
    pruefe('neue Datei verweigert den Treffer', fuenfter.ausZwischenspeicher === false);
    pruefe('neue Datei im Ergebnis', fuenfter.ergebnis.dateien.length === 3);

    // Andere Konfiguration ⇒ anderer Schlüssel ⇒ Fehlgriff.
    const sechster = await laufMitCache({ ...basisOptionen, excludes: ['c.ts'] });
    pruefe('geänderte Konfiguration ist ein Fehlgriff', sechster.ausZwischenspeicher === false);
    pruefe(
      'Konfigurations-Schlüssel trennt Muster',
      konfigurationsSchluessel(projekt, [], [], undefined, undefined) !==
        konfigurationsSchluessel(projekt, ['c.ts'], [], undefined, undefined)
    );

    // Guardrail: Ein Abbruch durch ein Limit wird nie gespeichert und nie
    // durch einen Cache-Treffer ersetzt (Fail Loud).
    let abbruch = false;
    try {
      await laufMitCache({ ...basisOptionen, maxFiles: 1 });
    } catch {
      abbruch = true;
    }
    pruefe('Limit-Abbruch bleibt ein Abbruch', abbruch);
    const limitSchluessel = konfigurationsSchluessel(projekt, [], [], 1, undefined);
    pruefe('Abbruch-Lauf hinterlässt keinen Cache', !fs.existsSync(cachePfad(limitSchluessel)));

    // Metadaten-Defekt: baumEintraege wirft statt still zu signieren.
    let metadatenAbbruch = false;
    try {
      baumEintraege(projekt, ['fehlt.ts']);
    } catch {
      metadatenAbbruch = true;
    }
    pruefe('fehlende Metadaten werfen statt zu täuschen', metadatenAbbruch);

    // Geladener Cache ist struktur-geprüft: Fehlender Schlüssel ergibt null.
    pruefe('ladeCache für fehlenden Schlüssel ergibt null', ladeCache('gibt-es-nicht') === null);
  } finally {
    fs.rmSync(projekt, { recursive: true, force: true });
    for (const schluessel of [
      konfigurationsSchluessel(projekt, [], [], undefined, undefined),
      konfigurationsSchluessel(projekt, [], [], 1, undefined),
      konfigurationsSchluessel(projekt, ['c.ts'], [], undefined, undefined),
    ]) {
      fs.rmSync(cachePfad(schluessel), { force: true });
    }
  }
}

// fazit: haupt() setzt process.exitCode; die Zusammenfassung folgt asynchron.
haupt().then(() => {
  const fazit = process.exitCode === 1 ? 'FEHLER' : 'ALLE PASSED';
  console.log(`Zwischenspeicher-Tests: ${fazit}`);
  if (process.exitCode === 1) process.exit(1);
});
