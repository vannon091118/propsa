# AGENTS.md — Bausteine

## Was dieses Modul ist

Sieben Bausteine, dokumentiert als **Muster**, festgeschrieben in
**Verträgen**, abgesteckt als leeres **Gerüst**. Jeder Baustein hat genau eine
Aufgabe, und diese Aufgabe besteht darin, eine Frage beantwortbar zu machen —
nicht darin, eine Funktion zu liefern.

| Baustein | Position | Kernsatz | Vertrag |
|---|---|---|---|
| Vermittlung | 3 | Ein Fehlerzustand ist ein Zustandswechsel, kein Sprung nach oben. | `vertrage/01-vermittlung.contract.json` |
| Prüfung | 2 | Unabhängigkeit ist notwendig, nicht hinreichend. | `vertrage/02-pruefung.contract.json` |
| Beobachtung | 2 | Abgeleitetes Wissen wird nie zur Autorität. | `vertrage/03-beobachtung.contract.json` |
| Prompts | 1 | Ein Satz ohne Herkunft ist keine Information. | `vertrage/04-prompts.contract.json` |
| Laufzeit | 2 | Was passiert ist, ist passiert. | `vertrage/05-laufzeit.contract.json` |
| Übersicht | 0 | Ein Format, das niemand liest, ist kein Format. | `vertrage/06-uebersicht.contract.json` |
| Integration | 3 | Bausteine geben Verträge heraus, keinen Code. | `vertrage/07-integration.contract.json` |

## Was dieses Modul nicht ist

- **Kein laufender Code.** `geraest/*.ts` enthalten eine Zusage und sonst
  nichts. Keine Funktion, kein Test, keine Behauptung, es gäbe sie.
- **Keine Kopie einer Vorlage.** Die Muster sind neu beschrieben. Was hier
  steht, ist an PROPAKT gemessen oder aus der Vorlage als *Form* übernommen —
  nie als Zeilen Code.
- **Keine Roadmap.** `STUB` bedeutet: die Entscheidung, es nicht zu bauen, ist
  getroffen. Das ist keine offene Aufgabe, die jemand auf nimmt.

## Regeln für dieses Modul

- **Dokumentation folgt dem Code.** Jeder Satz über PROPAKT ist am Code
  geprüft. Behauptungen über andere Systeme sind als Muster-Aussage zu
  kennzeichnen, nicht als PROPAKT-Zustand.
- **`STUB` und `NOT_VERIFIED` sind nicht dasselbe.** `STUB` = nicht gebaut, bewusst.
  `NOT_VERIFIED` = gebaut, ungeprüft. Ein `STUB` ist eine Aufgabe, ein
  `NOT_VERIFIED` ein offener Prüfposten. Beides zusammenfassen heisst, die
  eine Information wegzuwerfen, für die es dieses Feld gibt.
- **Kein Baustein baut einen anderen auf.** Übergaben laufen über Verträge.
  Wer zwei Bausteine verkoppelt, verletzt die Schichtenlage aus
  `muster/07-integration.md`.
- **Die Oberfläche zeigt Zustände, keine Logik.** Was in `tauri-app/src/`
  erscheint, ist ein Wert aus einem Vertrag — nie eine Entscheidung, die dort
  getroffen wird.
- **Keine neuen Abhängigkeiten.** Die Visualisierungen sind handgeschriebenes
  SVG und CSS, nach dem Muster von `tauri-app/src/HistoryGraph.tsx` und
  `tauri-app/src/StatistikKarten.tsx`. Kein Chart-Bibliothek-Eintrag.
- **Kein Mermaid.** Die Doku nutzt ASCII in ```text-Fences, nach
  `ARCHITECTURE.md`. Grund ist konkret: Der Link-Check in
  `scripts/pruefen/pruefen.mjs` erkennt Markdown-Verweise per Regex und
  greift dabei **auch innerhalb von Code-Fences**. Eine Mermaid-Knotenverweisung
  in der Form `Label(Ziel)` bricht den Check. Dasselbe gilt für dieses
  Dokument: eine wörtliche Nennung des Verweismusters würde als toter Link
  gemeldet.

## Das Gate-Schema

Jede Regel trägt dieselben sieben Punkte, in allen sieben Verträgen:

```text
POSITIVE   der Fall, in dem die Regel gilt
FORBIDDEN  der Fall, der abgewiesen wird
FALLBACK   was bei Nichterfüllung passiert
ERROR      maschinenlesbarer Fehlerstatus
TRACE      Herkunfts-/Provenienzkette
REPLAY     Replay-Verhalten
INVARIANT  testbare Zusicherung
```

**Eine Regel ohne alle sieben Punkte ist nicht implementiert, sondern behauptet.**
Der Satz ist die Regel. Damit ist die Frage „ist das jetzt fertig?" beantwortbar:
ja, wenn eine Zusicherung belegt ist, nein, wenn sieben Felder mit
Absichtserklärungen gefüllt sind. `regelVollstaendig()` in
`packages/core/src/vertrag.ts` prüft das maschinell.

## Spiegel und Prüfung

- Kataloge in `packages/core/src/vertrag.ts` ↔ `tauri-app/src-tauri/src/vertrag.rs`:
  `GATE_PUNKTE`, `STATUS_WERTE`, `EREIGNIS_TYPEN`.
- `npm run pruefen` vergleicht dieses Paar als Regel 9. Die Deklarationsform
  und die `match`-Armform **nicht** umformatieren — der Prüfer liest beides per
  Regex.
- Typprüfung des Gerüsts: `tsc -p bausteine/tsconfig.json`, im Root-Build
  angehängt. Ohne diese Konfiguration erfasst kein `tsc`-Lauf `geraest/`, und
  die Module könnten still veralten.

## Dateien

| Datei | Inhalt |
|---|---|
| `INDEX.json` | Modulübersicht |
| `AGENTS-<baustein>.md` | Regeln je Baustein, sieben Stück |
| `muster/NN-*.md` | Das Muster, je drei Ebenen: Entscheidung, Mechanik, Grenze |
| `vertrage/*.contract.json` | Der Vertrag, sieben Punkte je Regel, Selbstverifikation |
| `geraest/*.ts` | Leeres Modul mit der Zusage des Bausteins |
| `tsconfig.json` | Typprüfung für `geraest/` |

## Wenn ein Baustein gebaut wird

1. `implementation_status.overall` im Vertrag von `STUB` auf `NOT_VERIFIED`
   setzen — **nicht** auf `IMPLEMENTED`.
2. Das Gerüst füllen und die LOC-Grenze von 300 Zeilen je Datei einhalten.
3. Für jede Regel die sieben Punkte mit dem belegen, was tatsächlich gebaut
   wurde. `TRACE` und `INVARIANT` sind die beiden, die Arbeit machen.
4. `last_verified_against_code` auf das Datum setzen, an dem gegen den Code
   geprüft wurde, und `known_gaps` schrumpfen lassen.
5. Erst wenn ein Test die `INVARIANT`-Zusage belegt: `IMPLEMENTED`.

Der Sprung von `STUB` direkt auf `IMPLEMENTED` ist der Fehler, den dieses
Modul verhindern soll. `NOT_VERIFIED` ist ein ausdrücklich zugelassener
Zwischenzustand — er bedeutet nicht, dass etwas falsch ist, sondern dass es
niemand nachgemessen hat.
