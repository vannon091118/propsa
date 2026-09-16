import { Command } from 'commander';
import { scanDirectory, LimitFehler } from './scanner';
import { formatContext } from './formatter';
import { resolveExcludes, resolveIncludes } from '@propsa/core';
import { ausschluesseMergen, PROPSAIGNORE_DATEI } from './propsaignore';
import { paketBauen, paketSchreiben } from './paket';
import { kontextAlsJson, zeitstempelJetzt } from '@propsa/core';
import { selektieren } from './slice';
import { laufVerarbeiten } from './history';
import { updateKommandoRegistrieren } from './updateKommando';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('propsa')
  .description('Erzeugt aus einem Projektverzeichnis ein Kontextpaket für LLMs')
  .argument('<pfad>', 'Projektverzeichnis zum Scannen')
  .option('-o, --output <ordner>', 'Zielordner des Kontextpakets', 'propsa-kontext')
  .option('--einzeln <datei>', 'statt eines Pakets eine einzelne Datei schreiben (.md oder .json)')
  .option('-e, --exclude <muster>', 'Ausschluss-Pattern (komma-getrennt, z.B. node_modules,*.test.ts)')
  .option('-i, --include <muster>', 'Nur diese Pattern einbeziehen (komma-getrennt)')
  .option('-m, --max-files <n>', 'Guardrail: hartes Limit Dateien (Abbruch, kein Teilergebnis)', parseInt)
  .option('-l, --max-lines <n>', 'Guardrail: hartes Limit Gesamtzeilen (Abbruch, kein Teilergebnis)', parseInt)
  .option('--no-limits', 'alle Guardrails abschalten (vollständiger Scan, OOM-Risiko bewusst übernommen)')
  .option('--entrypoint <datei>', 'Slice: Einstiegsdatei plus lokale Import-Kette')
  .option('--depth <n>', 'Slice: nur Dateien bis zu dieser Ordnertiefe', parseInt)
  .option('--top-files <n>', 'Slice: nur die n größten Dateien nach Zeilen', parseInt)
  .option('--delta', 'Delta zum letzten Lauf derselben Projekt-Identität melden (~/.propsa/history/)')
  .action(async (pfad: string, options: {
    output: string;
    einzeln: string | undefined;
    exclude: string | undefined;
    include: string | undefined;
    maxFiles: number | undefined;
    maxLines: number | undefined;
    limits: boolean; // commander speichert --no-limits als limits: false
    entrypoint: string | undefined;
    depth: number | undefined;
    topFiles: number | undefined;
    delta: boolean | undefined;
  }) => {
    const besuchterPfad = path.resolve(pfad);

    if (!fs.existsSync(besuchterPfad)) {
      console.error(`❌ Pfad nicht gefunden: ${besuchterPfad}`);
      process.exit(1);
    }

    if (!fs.statSync(besuchterPfad).isDirectory()) {
      console.error(`❌ Kein Verzeichnis: ${besuchterPfad}`);
      process.exit(1);
    }

    console.log(`🔍 Scanne: ${besuchterPfad}`);

    // Guardrails: Nur wirksam, wenn ein Limit gesetzt ist und nicht
    // gleichzeitig `--no-limits` gewählt wurde.
    const guardrails = options.limits;
    const maxFiles = guardrails ? options.maxFiles : undefined;
    const maxLines = guardrails ? options.maxLines : undefined;

    try {
      const gemerged = ausschluesseMergen(
        besuchterPfad,
        resolveExcludes(options.exclude),
        []
      );
      if (gemerged.propsaignoreAktiv) {
        console.log(`📜 ${PROPSAIGNORE_DATEI} eingelesen (projektspezifische Ausschlüsse)`);
      }

      const ergebnis = await scanDirectory({
        basisPfad: besuchterPfad,
        excludes: gemerged.excludes,
        includes: resolveIncludes(options.include),
        maxFiles,
        maxLines,
      });

      if (ergebnis.dateien.length === 0) {
        console.warn('⚠️  Keine Dateien gefunden (gefiltert oder leer).');
        process.exit(0);
      }

      console.log(`📄 ${ergebnis.dateien.length} Dateien gefunden`);

      if (ergebnis.uebersprungen > 0) {
        console.warn(
          `⚠️  ${ergebnis.uebersprungen} Datei(n) nicht lesbar oder binär und deshalb übersprungen`
        );
      }

      const auswahl = selektieren(ergebnis.dateien, {
        einstiegspunkt: options.entrypoint,
        tiefe: options.depth,
        topDateien: options.topFiles,
      });

      const geschnitten = auswahl.length !== ergebnis.dateien.length;
      if (geschnitten) {
        console.log(
          `✂️  Slice: ${auswahl.length} von ${ergebnis.dateien.length} Dateien ` +
            `(Eintrag ${options.entrypoint ?? '-'}, Tiefe ${options.depth ?? '-'}, ` +
            `Top ${options.topFiles ?? '-'})`
        );
      }

      // Ein Zeitstempel für alle Dateien eines Laufs.
      const meta = {
        titel: besuchterPfad,
        zeitstempel: zeitstempelJetzt(),
        uebersprungen: ergebnis.uebersprungen,
      };

      if (options.delta) {
        const verarbeitet = laufVerarbeiten(besuchterPfad, meta.zeitstempel, auswahl);
        if (verarbeitet.erstlauf) {
          console.log(
            `🆕 Erstlauf – History angelegt (${verarbeitet.herkunft === 'root-commit' ? 'Identität über Root-Commit ' + verarbeitet.identitaet.slice(0, 12) : 'Identität über Pfad'})`
          );
        } else if (verarbeitet.delta) {
          const d = verarbeitet.delta;
          console.log(
            `🔄 Delta: ${d.neu.length} neu · ${d.geaendert.length} geändert · ` +
              `${d.entfernt.length} entfernt · ${d.unverändert.length} unverändert`
          );
          for (const pfad of d.neu.slice(0, 20)) console.log(`   + ${pfad}`);
          for (const pfad of d.geaendert.slice(0, 20)) console.log(`   ~ ${pfad}`);
          for (const pfad of d.entfernt.slice(0, 20)) console.log(`   - ${pfad}`);
          const gesamt = d.neu.length + d.geaendert.length + d.entfernt.length;
          if (gesamt > 60) {
            console.log(`   … und ${gesamt - 60} weitere Änderungen`);
          }
        }
      }

      if (options.einzeln) {
        const alsJson = path.extname(options.einzeln).toLowerCase() === '.json';
        const inhalt = alsJson
          ? kontextAlsJson(meta, auswahl)
          : formatContext(auswahl, meta);
        fs.mkdirSync(path.dirname(path.resolve(options.einzeln)), { recursive: true });
        fs.writeFileSync(options.einzeln, inhalt, 'utf8');
        console.log(
          `✅ Einzeldatei geschrieben: ${path.resolve(options.einzeln)} (${inhalt.length} Zeichen)`
        );
        return;
      }

      const ordner = path.resolve(options.output);
      const pfade = paketSchreiben(ordner, paketBauen(meta, auswahl));
      console.log(`📦 Kontextpaket: ${pfade.length} Dateien in ${ordner}`);
      for (const paketPfad of pfade) {
        console.log(`   ${path.relative(ordner, paketPfad).replace(/\\\\/g, '/')}`);
      }
    } catch (fehler) {
      if (fehler instanceof LimitFehler) {
        // Fail Loud: kein Teilergebnis, klarer Exit-Code.
        console.error(`⛔ ${fehler.message}`);
        process.exit(2);
      }
      console.error(`❌ ${fehler instanceof Error ? fehler.message : String(fehler)}`);
      process.exit(1);
    }
  });

updateKommandoRegistrieren(program);

program.parse();
