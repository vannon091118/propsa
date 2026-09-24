# Bausteine

> **Kernsatz:** Bausteine geben Verträge heraus, keinen Code. Wer einen Vertrag
> liest, muss die Implementierung nicht kennen.

Einstiegspunkt in die sieben Bausteine. Jeder Baustein hat genau eine Aufgabe,
und diese Aufgabe besteht darin, eine Frage beantwortbar zu machen — nicht
darin, eine Funktion zu liefern.

## Die sieben

| Baustein | Position | Kernsatz | Muster |
|---|---|---|---|
| **Vermittlung** | 3 | Ein Fehlerzustand ist ein Zustandswechsel eines Schlüssels, kein Sprung nach oben. | [01](../../bausteine/muster/01-vermittlung.md) |
| **Prüfung** | 2 | Unabhängigkeit ist notwendig, nicht hinreichend. | [02](../../bausteine/muster/02-pruefung.md) |
| **Beobachtung** | 2 | Abgeleitetes Wissen wird nie zur Autorität. | [03](../../bausteine/muster/03-beobachtung.md) |
| **Prompts** | 1 | Ein Satz ohne Herkunft ist keine Information, sondern ein Geräusch. | [04](../../bausteine/muster/04-prompts.md) |
| **Laufzeit** | 2 | Was passiert ist, ist passiert. | [05](../../bausteine/muster/05-laufzeit.md) |
| **Übersicht** | 0 | Ein Format, das niemand liest, ist kein Format. | [06](../../bausteine/muster/06-uebersicht.md) |
| **Integration** | 3 | Bausteine geben Verträge heraus, keinen Code. | [07](../../bausteine/muster/07-integration.md) |

## Warum Muster, nicht Code

Der Neuaufbau folgt einer Regel: **Muster statt Zeilen.** Der Code der
Bausteine wurde nicht übernommen, weil er die Regeln dieses Repos verletzt, an
denen er gemessen wurde:

| Kennzahl | PROPAKT | Bausteine (schlechtester Wert) |
|---|---|---|
| LOC-Grenze | 299 (Grenze 300, maschinell geprüft) | 1301, 1245, 1284 Zeilen in je einer Datei |
| Datei-Zuordnung | 242 Dateien, alle in `INDEX.json` | 0 `INDEX.json` in allen sieben Bausteinen |
| Changelog | gespiegelt, 2 deckungsgleiche Kopien | 5 von 7 ohne Changelog |
| Eine Wahrheit je Regel | erzwungen über `npm run pruefen` | zwei Falsifikations-Gates parallel, beide produktiv |
| Harte Pfade | keine | 3 Dateien, bei behaupteter Portabilität |

Dazu kam: die Verträge der Vorlage verwiesen selbst auf nicht existierende
Dateien, und sie waren untereinander uneinheitlich — einer führte zwei
Gate-Felder, die anderen je ein eigenes, anders benanntes. Ein Verbraucher,
der zwei Bausteine prüfen wollte, musste für jeden eine andere Struktur lesen.

## Die drei Ebenen jedes Musters

Jedes Muster steht auf drei Ebenen, und die dritte ist so ausführlich wie die
erste:

1. **Entscheidung** — was wird getroffen
2. **Mechanik** — wie
3. **Grenze** — wann es nicht gilt

Die Grenze steht nicht hinten, weil sie unwichtig wäre. Sie steht dort, weil
ein Muster ohne Grenze eine Zusage ist, und eine Zusage ohne Grenze ist
Werbung.

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
Absichtserklärungen gefüllt sind.

### Die vier Zustände

```text
IMPLEMENTED      gebaut und durch die sieben Punkte belegt
STUB             Signatur steht, Logik fehlt – bewusst offen
NOT_IMPLEMENTED  nicht angefangen
NOT_VERIFIED     gebaut, aber die Belege fehlen
```

Der Unterschied zwischen `STUB` und `NOT_VERIFIED` ist der wichtigste im
Schema. `STUB` heisst: **die Entscheidung, es nicht zu bauen, ist getroffen.**
`NOT_VERIFIED` heisst: **es wurde gebaut und niemand hat es geprüft.** Beides
ist ehrlich, aber es führt zu verschiedenen Entscheidungen — ein `STUB` ist eine
Aufgabe, ein `NOT_VERIFIED` ein offener Prüfposten.

## Die Schichtenlage

```text
  0  PRÄSENTATION      Zustände darstellen, nichts speichern
  1  PROMPTS           Absicht → prüfbare Aufgabe → Beleg
  2  ORCHESTRIERUNG    Ablauf, Zustand, Wer-macht-was
  3  INFRASTRUKTUR    Vermittlung, Speicher, Ausführung
```

Übergaben laufen ausschliesslich **nach unten**. Ein Aufwärtsaufruf erzeugt
einen Zyklus, und ein Zyklus erzeugt Reihenfolgeabhängigkeit. Ohne
Aufwärtsaufruf ist die Reihenfolge eindeutig, und eine Schicht ist isoliert
prüfbar.

## Der Stand: nichts ist gebaut

**Kein einziger Baustein läuft.** `bausteine/geraest/` enthält sieben leere
Module, die das ausdrücklich sind.

Was in PROPAKT wirklich existiert, ist gemessen:

| Baustein | Was echt ist | Status |
|---|---|---|
| Vermittlung | drei fest verdrahtete Anbieter in `tauri-app/src/llm.ts` | kein Routing, nur Direktzugriff |
| Prüfung | `kritik_regeln.rs`, `paketKritik.ts` — das sind **Erzeuger**, keine Prüfer | keine Prüfschicht |
| Beobachtung | `live_zyklus.rs` — aber ein geschlossener: Quelle und Speicher sind PROPAKT selbst | kein Fremdzugriff |
| Prompts | nichts Vergleichbares | — |
| Laufzeit | `live_store.rs` (SQLite-WAL, append-only), `get_history_metrics` | Protokoll und Wiedergabe echt, **eine** Regel, kein Lernen |
| Übersicht | `ErgebnisTabelle.tsx`, `StatistikKarten.tsx` — **eine** Quelle: das angegebene Verzeichnis | kein Leser-Register |
| Integration | einheitliches Gate-Schema für alle sieben Verträge | das ist der Teil, der neu ist |

Der ehrlichste Satz zu diesem Stand: **Von sieben Bausteinen ist einer
(`Integration`) umgesetzt, zwei haben echte Teilbestände, und vier sind leer.**

## Zwei Fail-Richtungen

Das ist die wichtigste Unterscheidung im ganzen Aufbau, und sie ist kein
Detail:

| Baustein | Richtung | Warum |
|---|---|---|
| **Prüfung** | **fail-closed** | Nur ein vollständig bestätigtes Probe-Set gibt frei. Im Zweifel wird zurückgehalten — ein zurückgehaltenes Paket kostet Zeit, ein durchgewunkenes kostet Vertrauen. |
| **Beobachtung** | **fail-open** | Ein Fehler darf den beobachteten Prozess **nie** blockieren, pausieren, ein Urteil ändern oder abbrechen. |

Falsch herum, und der Baustein arbeitet gegen seinen Zweck: Eine fail-open
Prüfung lässt alles durch, eine fail-closed Beobachtung wird selbst zum
Ausfallrisiko für den beobachteten Prozess.

## Verträge und Gerüst

| Ort | Inhalt |
|---|---|
| [`bausteine/vertrage/`](../../bausteine/vertrage/) | sieben Verträge, je vier Regeln mit allen sieben Punkten |
| [`bausteine/geraest/`](../../bausteine/geraest/) | sieben leere Module mit der Zusage des Bausteins |
| [`packages/core/src/vertrag.ts`](../../packages/core/src/vertrag.ts) | geteilter Typvertrag: `Vertrag`, `Regel`, `GATE_PUNKTE`, `STATUS_WERTE`, `EREIGNIS_TYPEN` |
| [`bausteine/AGENTS.md`](../../bausteine/AGENTS.md) | Regeln für alle Bausteine |

Der Typvertrag ist in `tauri-app/src-tauri/src/vertrag.rs` gespiegelt, und
`npm run pruefen` vergleicht die drei Kataloge als Regel 9. Ohne diese Prüfung
wäre die Spiegelung eine zweite Wahrheit statt einer.

## Regeln für Visualisierungen

- **ASCII in ```text-Fences**, nach dem Muster von `ARCHITECTURE.md`. Kein
  Mermaid: der Link-Check in `scripts/pruefen/pruefen.mjs` erkennt
  Markdown-Verweise per Regex und greift auch innerhalb von Code-Fences — eine
  Mermaid-Knotenverweisung bricht ihn.
- **Handgeschriebenes SVG und CSS** für die Oberfläche, nach dem Muster von
  `tauri-app/src/HistoryGraph.tsx` und `tauri-app/src/StatistikKarten.tsx`.
  Keine Chart-Bibliothek: die Laufzeitabhängigkeiten der App sind
  ausschliesslich `@propakt/core`, `@tauri-apps/api`, drei Tauri-Plugins, `react`
  und `react-dom`.

## Verwandte Dokumente

- [Vision](Vision.md) – Zielbild und Andockstellen
- [Kontextpaket](Kontextpaket.md) – Paketstruktur
- [Export-Schema](Export-Schema.md) – JSON-Vertrag v2
- [Changelog](Changelog.md) – Versionshistorie
