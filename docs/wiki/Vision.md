# Vision

> **Regel für dieses Dokument:** Jede Aussage über PROPSA verweist auf eine
> geprüfte Datei im Repository. Was nicht gebaut ist, steht als **geplant** und
> nicht als Zusage. Aussagen über die Architektur darunter stehen in
> [`bausteine/muster/`](../../bausteine/muster/) und sind dort mit ihrer
> Herkunft belegt.

## Ziel

PROPSA ist der **Einstiegspunkt** in eine Plattform, die darunter aus mehreren
Bausteinen besteht. PROPSA liefert den Kontext; die Bausteine erzeugen, prüfen
und erklären ihn.

Die Vision ist damit keine Wunschliste, sondern ein Zielbild mit benannten
Lücken.

## Die sieben Bausteine

PROPSA steht nicht allein. Unter ihm liegen sieben Bausteine, jeder mit genau
einer Aufgabe. Sie sind nicht nach Namen, sondern nach **Funktion** benannt —
jeder Baustein tut etwas, und das lässt sich unabhängig von seinem Ursprung
beschreiben.

| Baustein | Position | Was er tut |
|---|---|---|
| **Vermittlung** | 3 | Wählt Anbieter und Schlüssel für eine Anfrage. |
| **Prüfung** | 2 | Erzeugt Proben zu einer Anforderung und entscheidet allein über die Freigabe. |
| **Beobachtung** | 2 | Sieht Zustand von aussen, ohne ihn zu verändern. |
| **Prompts** | 1 | Führt Absicht in eine prüfbare Aufgabe mit Herkunft. |
| **Laufzeit** | 2 | Hält Ereignisse unveränderlich fest und erlaubt Wiedergabe unter anderer Regel. |
| **Übersicht** | 0 | Führt Daten aus fremden Werkzeugen zusammen, ohne Duplikate zu verschmelzen. |
| **Integration** | 3 | Ordnet die Bausteine an und beschreibt ihre Übergaben. |

Jeder Baustein ist auf drei Ebenen dokumentiert — **Entscheidung** (was wird
getroffen), **Mechanik** (wie), **Grenze** (wann er nicht gilt). Die Trennung
ist Absicht: die Grenze steht genauso ausführlich wie die Fähigkeit.

→ [`bausteine/muster/`](../../bausteine/muster/) · sieben Muster mit ASCII-Diagrammen

## Warum Muster, nicht Code

Der Neuaufbau in PROPSA folgt einer Regel: **Muster statt Zeilen.** Der Code der
Bausteine wird nicht übernommen, weil er die Regeln dieses Repos verletzt, an
denen es gemessen wurde:

| Kennzahl | PROPSA | Bausteine (schlechtester Wert) |
|---|---|---|
| LOC-Grenze | 299 (Grenze 300, maschinell geprüft) | 1301, 1245, 1284 Zeilen in je einer Datei |
| Datei-Zuordnung | 242 Dateien, alle in `INDEX.json` | 0 `INDEX.json` in allen sieben Bausteinen |
| Changelog | gespiegelt, 2 deckungsgleiche Kopien | 5 von 7 ohne Changelog |
| Eine Wahrheit je Regel | erzwungen über `npm run pruefen` | zwei Falsifikations-Gates parallel, beide produktiv |
| Harte Pfade | keine | 3 Dateien, bei behaupteter Portabilität |

Dazu kam: die Verträge der Vorlage verwiesen selbst auf nicht existierende
Dateien, und sie waren untereinander uneinheitlich — einer führte zwei
Gate-Felder, die anderen je ein eigenes, anders benanntes.

Was daraus entstanden ist, steht unter [`bausteine/`](../../bausteine/):
Muster, sieben Verträge mit einheitlichem Gate-Schema, und ein leeres Gerüst.
**Leer ist ausdrücklich.** Kein Baustein ist gebaut.

## Das Gate-Schema

Eine Regel gilt erst als umgesetzt, wenn alle sieben Punkte belegt sind:

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
Der Satz ist die Regel. Damit ist die Frage „ist das jetzt fertig?" beantwortbar.

Dazu vier Zustandswerte, und der wichtigste Unterschied:

```text
STUB            die Entscheidung, es nicht zu bauen, ist getroffen
NOT_VERIFIED    es wurde gebaut und niemand hat es geprüft
```

Beides ist ehrlich, aber es führt zu verschiedenen Entscheidungen — ein `STUB`
ist eine Aufgabe, ein `NOT_VERIFIED` ein offener Prüfposten.

## Was in PROPSA steht

| Funktion | Stand | Beleg |
|---|---|---|
| Kontextpakete | **umgesetzt** | [Kontextpaket](Kontextpaket.md) |
| Live-Modus | **umgesetzt** | `live_store.rs`, `live_takt.rs` |
| Provider-Auswahl | **umgesetzt** | `tauri-app/src/llm.ts` — drei fest verdrahtete Anbieter |
| Falsifikation in `Kritik.md` | **geplant** | `kritik_regeln.rs` arbeitet rein schwellwertbasiert |
| Provider-Routing nach Leistung | **geplant** | der Scanner misst heute, entscheidet aber nicht |
| Session-Indizierung | **geplant** | der Live-Modus protokolliert Dateiänderungen, nicht LLM-Interaktionen |

## Drei Andockstellen

### 1. Vermittlung → `tauri-app/src/llm.ts`

`llm.ts` ist 141 Zeilen und hält einen `ANBIETER`-Katalog mit `basisUrl` und
`kopfart: "bearer" | "x-api-key"`. Der `AnbieterId`-Typ kennt drei IDs.

Ein Adapter auf einen lokalen, OpenAI-kompatiblen Vermittler ändert zwei
Felder: `basisUrl` und `kopfart`. Der bestehende Katalog bleibt als Fallback für
Direktzugriff erhalten, damit PROPSA ohne laufenden Vermittler weiter
funktioniert.

**Das ist der kleinstmögliche Eingriff mit der grössten Wirkung.**

### 2. Prüfung → `Kritik.md`

Die Prüflogik des Musters ist formal prüfbar und hat keine
Datenbankabhängigkeit — sie ist als reine Funktion extrahierbar.

**Die Bedingung:** PROPSA hat zwei Implementierungen, TypeScript-CLI und
Rust-Backend. Die Logik muss in **beide** gespiegelt werden, sonst erhalten CLI
und App verschiedene Kritik-Ergebnisse. Genau diesen Mechanismus erzwingt
`npm run pruefen` bereits für die Kataloge in `packages/core/src/` ↔
`tauri-app/src-tauri/src/`.

Der Aufwand dieser Schicht ist **nicht gemessen**. Vor einer Zusage wäre eine
Messung an echten Anforderungen nötig.

### 3. Integration → Architektur-Referenz

Die Bausteine veröffentlichen Schnittstellen, nicht Code. PROPSA sollte diese
Verträge referenzieren, statt eigene Annahmen über die Bausteine zu treffen.
→ [`bausteine/vertrage/`](../../bausteine/vertrage/)

## Reihenfolge

1. **Vermittlung anbinden** — ein Endpunkt, eine Datei.
2. **Prüfung für `Kritik.md`** — fail-closed, in TypeScript *und* Rust.
3. **Vertragsreferenz** — die Verträge als verbindliche Architekturquelle.

**Nicht in dieser Reihe:** Übersicht als Modul. Fremdformate in PROPSA zu ziehen
wäre ein eigener Vorschlag und braucht eine eigene Entscheidung.

## Zusammenspiel

```text
PROPSA (dieses Repo)
  Kontextpakete  ──────────────────────  Was die Instanz lesen soll
  Live-Modus     ──────────────────────  Was sich gerade ändert
        │
        │  Verträge, nicht Aufrufe
        ▼
  Vermittlung    ──  Anfrage → Anbieter
  Prüfung        ──  Anforderung → Urteil
        │  read-only
        ▼
  Beobachtung    ──  Ereignisstrom, ohne Eingriff
```

## Verwandte Dokumente

- [Muster und Verträge](../../bausteine/) — die sieben Bausteine im Detail
- [Changelog](Changelog.md) – Versionshistorie
- [Live-Modus](Live-Modus.md) – Echtzeit-Überwachung
- [Kontextpaket](Kontextpaket.md) – Paketstruktur
- [Export-Schema](Export-Schema.md) – JSON-Vertrag v2
