/**
 * Baustein-Gates: die sieben Verträge gegen die sieben Punkte prüfen.
 *
 * Gegenstück zur Pflichtprüfung in `scripts/pruefen/vertragsGates.mjs`: dort
 * läuft dieselbe Regel als Textvergleich über die Dateien, hier über
 * `regelVollstaendig()` und `statusBekannt()` aus `@propakt/core` – also über
 * die Funktionen, die die TypeScript-Seite ausliefert. Ein Aufruf, der fehlt
 * oder eine leere Liste zurückgibt, fällt hier auf.
 *
 * Der zweite Teil prüft, wo die Grenze der Funktion liegt. Sie erkennt
 * mechanische Leere, keine inhaltliche: ein Punkt, der mit einer Absicht
 * gefüllt ist, gilt als belegt. Genau das gibt der Vertrag 07 in
 * `nicht_zugesagt` zu – hier festgehalten, damit die Grenze nicht
 * versehentlich als Prüftiefe missverstanden wird.
 *
 * Aufruf: npx ts-node tests/vertrag.test.ts
 * Braucht den gebauten Core (`packages/core/dist`), wie zwischenspeicher.test.ts.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { GATE_PUNKTE, STATUS_WERTE, Regel, regelVollstaendig, statusBekannt } from '@propakt/core';

const ORDNER = join(__dirname, '..', 'bausteine', 'vertrage');

function pruefe(name: string, bedingung: boolean): void {
  console.log(`${bedingung ? 'PASS' : 'FAIL'} ${name}`);
  if (!bedingung) process.exitCode = 1;
}

const vollstaendig = Object.fromEntries(
  Object.keys(GATE_PUNKTE).map(punkt => [punkt, 'belegt']),
) as unknown as Regel;

// Fixture 1: Der siebte Punkt fehlt – die Regel ist unvollständig.
const ohnePunkt = { ...vollstaendig } as Record<string, unknown>;
delete ohnePunkt.INVARIANT;
pruefe('vollständige Regel erkannt', regelVollstaendig(vollstaendig));
pruefe('Regel ohne INVARIANT abgewiesen', !regelVollstaendig(ohnePunkt as unknown as Regel));

// Fixture 2: Leere und Absicht. Leere ist erkennbar, Absicht nicht.
const mitLeerwert = { ...vollstaendig, FALLBACK: '   ' };
const mitAbsicht = { ...vollstaendig, FALLBACK: 'wird später ergänzt' };
pruefe('Punkt ohne Inhalt gilt nicht als belegt', !regelVollstaendig(mitLeerwert as Regel));
pruefe('Absichtserklärung gilt als belegt – die Grenze der Funktion', regelVollstaendig(mitAbsicht as Regel));

// Fixture 3: Zustandswerte. STUB und NOT_VERIFIED sind verschieden, ein
// erfundener Wert ist keiner von beiden.
pruefe('Gate-Katalog trägt sieben Punkte', Object.keys(GATE_PUNKTE).length === 7);
pruefe('Status-Katalog trägt vier Zustände', Object.keys(STATUS_WERTE).length === 4);
pruefe('IMPLEMENTED und STUB bekannt', statusBekannt('IMPLEMENTED') && statusBekannt('STUB'));
pruefe('unbekannter Zustand abgewiesen', !statusBekannt('HALB_FERTIG'));

// Die sieben Verträge selbst: jede Regel vollständig, jeder Zustand bekannt.
const dateien = readdirSync(ORDNER)
  .filter(name => name.endsWith('.contract.json'))
  .sort();
const unvollstaendig: string[] = [];
const unbekannt: string[] = [];
let regeln = 0;

for (const datei of dateien) {
  const vertrag = JSON.parse(readFileSync(join(ORDNER, datei), 'utf8'));
  for (const regel of vertrag.contract_gates?.regeln ?? []) {
    regeln++;
    if (!regelVollstaendig(regel as Regel)) unvollstaendig.push(`${datei}: ${regel.gate}`);
  }
  const bereich = vertrag.implementation_status;
  if (bereich?.overall && !statusBekannt(bereich.overall)) unbekannt.push(`${datei}: overall`);
  for (const wert of Object.values(bereich?.sections ?? {})) {
    const zustand = String(wert).trim().split(/\s+/)[0];
    if (!statusBekannt(zustand)) unbekannt.push(`${datei}: Abschnitt nennt ${zustand}`);
  }
}
if (unvollstaendig.length > 0) console.log(`  ${unvollstaendig.join('\n  ')}`);
if (unbekannt.length > 0) console.log(`  ${unbekannt.join('\n  ')}`);

pruefe('sieben Verträge gefunden', dateien.length === 7);
pruefe('28 Regeln geprüft', regeln === 28);
pruefe('jede Regel trägt alle sieben Punkte', unvollstaendig.length === 0);
pruefe('jede Statusangabe ist ein bekannter Zustand', unbekannt.length === 0);
