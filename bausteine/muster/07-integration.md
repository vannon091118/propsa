# Muster 07 – Integration

> **Kernsatz des Musters:** Bausteine geben Verträge heraus, keinen Code. Wer
> einen Vertrag liest, muss die Implementierung nicht kennen.

## Zweck

Mehrere Bausteine so anordnen, dass sie sich nicht verschränken, und die
Übergaben zwischen ihnen so beschreiben, dass jede Seite nur ihre eigene
Zusage halten muss.

## Die Schichten

Vier Positionen, aufsteigend. Jeder Baustein gehört genau einer Position an und
darf nur **nach unten** übergeben, nie nach oben.

```text
  ┌─────────────────────────────────────────────────────────┐
  │ 0  PRÄSENTATION                                        │
  │    Was der Mensch sieht. Kein Zustand, keine Regeln.  │
  └──────────────────────┬──────────────────────────────────┘
                         │  Vertrag: Zustände, keine Befehle
  ┌──────────────────────▼──────────────────────────────────┐
  │ 1  PROMPTS                                             │
  │    Absicht → prüfbare Aufgabe → Beleg mit Herkunft      │
  └──────────────────────┬──────────────────────────────────┘
                         │  Vertrag: Aufgaben und Belege
  ┌──────────────────────▼──────────────────────────────────┐
  │ 2  ORCHESTRIERUNG                                       │
  │    Ablauf, Zustand, Wer-macht-was                        │
  └──────────────────────┬──────────────────────────────────┘
                         │  Vertrag: Aufrufe, Ergebnisse
  ┌──────────────────────▼──────────────────────────────────┐
  │ 3  INFRASTRUKTUR                                       │
  │    Vermittlung, Speicher, Ausführung                     │
  └─────────────────────────────────────────────────────────┘
```

**Warum nur nach unten.** Ein Aufwärtsaufruf erzeugt einen Zyklus, und ein
Zyklus erzeugt Reihenfolgeabhängigkeit: Dann hängt das Ergebnis davon ab, wer
zuerst kommt. Ohne Aufwärtsaufruf ist die Reihenfolge der Schichten eindeutig,
und ein Test kann eine Schicht isoliert prüfen.

## Wo die sieben Bausteine einzuordnen sind

```text
  PRÄSENTATION
      └─ Übersicht          Zustände darstellen, nichts speichern
      └─ Beobachtung        Ereignisstrom und Ableitungen anzeigen
         ↑
  PROMPTS
      └─ Prompts             Absicht → Aufgabe → Beleg
         ↑
  ORCHESTRIERUNG
      └─ Prüfung            Anforderung → Probe-Set → Urteil
      └─ Laufzeit            Ereignis → Bewertung → Anpassung
         ↑
  INFRASTRUKTUR
      └─ Vermittlung        Anfrage → Anbieter
      └─ Integration        die Querverträge selbst
```

Vermittlung und Prüfung ziehen je einen Pfeil nach oben: die Vermittlung wird
gerufen, die Prüfung entscheidet. Beides ist Aufruf, keine Abhängigkeit von der
Präsentation nach unten.

## Das Vertragsschema

**Ein Schema für alle Bausteine.** Die Vorlage zu diesem Muster hatte fünf
Verträge, aber kein gemeinsames Gate-Schema: einer führte zwei Gate-Felder,
die anderen je ein eigenes, anders benanntes. Ein Verbraucher, der zwei
Bausteine prüfen wollte, musste für jeden eine andere Struktur lesen.

Hier ist es umgekehrt. Jeder Vertrag hat dieselben Felder, und jede Regel trägt
dieselben sieben Punkte:

```text
POSITIVE   der Fall, in dem die Regel gilt
FORBIDDEN  der Fall, der abgewiesen wird
FALLBACK   was bei Nichterfüllung passiert
ERROR      maschinenlesbarer Fehlerstatus
TRACE      Herkunfts-/Provenienzkette
REPLAY     Replay-Verhalten (deterministisch vs. semantisch)
INVARIANT  testbare Zusicherung
```

**Eine Regel ohne alle sieben Punkte ist nicht implementiert, sondern behauptet.**
Der Satz ist die Regel. Er beendet eine Diskussion, die sonst jede Prüfung
beginnt: „ist das jetzt fertig?" – Ja, wenn ein Test die Zusicherung belegt. Nein,
wenn sieben Felder mit Absichtserklärungen gefüllt sind.

### Die Zustandswerte

```text
IMPLEMENTED      gebaut und durch die sieben Punkte belegt
STUB             Signatur steht, Logik fehlt – bewusst offen
NOT_IMPLEMENTED  nicht angefangen
NOT_VERIFIED     gebaut, aber die Belege fehlen
```

Der Unterschied zwischen `STUB` und `NOT_VERIFIED` ist der wichtigste in diesem
Schema. `STUB` heisst: **die Entscheidung, es nicht zu bauen, ist getroffen.**
`NOT_VERIFIED` heisst: **es wurde gebaut und niemand hat es geprüft.** Beides ist
ehrlich, aber es führt zu verschiedenen Entscheidungen – ein `STUB` ist eine
Aufgabe, ein `NOT_VERIFIED` ist ein offener Prüfposten.

### Selbstverifikation

Jeder Vertrag trägt, was tatsächlich geprüft wurde:

```text
overall                  Gesamtstatus
sections                 je Abschnitt ein Zustand
last_verified_against_code   Datum der letzten Prüfung am Code
known_gaps               was fehlt
```

**Die Vorlage hat das richtig gemacht** und ist der Grund, warum dieses Schema
übernommen wird. Ihre Verträge sagten Dinge wie „Null Claims haben die Grenze je
überschritten" und „Null Läufe wurden je vollständig abgeschlossen". Das ist
unangenehm präzise und genau richtig: es trennt „wir haben das gebaut" von
„wir wissen, ob es funktioniert".

## Grenze

**Ein Vertrag ist eine Zusage, keine Garantie.** Dass ein Baustein seinen
Vertrag einhält, heisst nicht, dass das Ergebnis nützlich ist. Die Gates halten
Formen ein, keine Wahrheiten.

**Was das Muster nicht leistet:**

- **Keine Garantie über Versionsstände.** Verträge sagen nichts darüber, ob
  gegen die neueste Implementierung geprüft wurde. Dafür gibt es
  `last_verified_against_code`.
- **Keine automatische Prüfung der Gates.** Das Schema macht Lücken sichtbar,
  es schliesst sie nicht. Eine Regel mit sieben ausgefüllten Feldern und einem
  leeren `INVARIANT` sieht vollständig aus und ist es nicht.
- **Keine Aufwärtskopplung.** Wer von der Präsentation aus direkt in die
  Infrastruktur greift, umgeht den Vertrag – und merkt es nicht, weil es
  funktioniert.
- **Keine Auflösung von Mehrdeutigkeit.** Ein Vertrag, der zwei Leser
  unterschiedlich auslegt, ist ungültig – aber keiner der beiden wird es merken.

**Zur einen Wahrheit je Regel.** Zwei Bausteine dürfen dieselbe Frage nicht
getrennt beantworten. Wer das braucht, hat entweder die Frage falsch geschnitten
oder zwei Bausteine gebaut, wo einer hingehört.

## Anbindung an PROPAKT

**PROPAKT hat die Schichtenliste nicht – es hat zwei Oberflächen und einen
Kern.**

```text
  CLI  (src/)                    Desktop-App  (tauri-app/)
       │                                  │
       │            @propakt/core          │
       └──────────────┬───────────────────┘
                      │
              Rust-Backend  (src-tauri/)
```

Was PROPAKT bereits macht und was dieses Muster bestätigt:

- **Katalog in beiden Sprachen.** `filters.ts` und `filter.rs` führen denselben
  Katalog. `npm run pruefen` vergleicht sie. Das ist Position 3, sauber
  gespiegelt.
- **Übergabe über Vertrag, nicht über Aufruf.** Der Rust-Code liefert Daten,
  die TypeScript über `invoke` bekommt. Beide Seiten kennen nicht die
  Implementierung der anderen.
- **Zwei Oberflächen, ein Vertrag.** CLI und App lesen dieselbe Definition des
  Kontextpakets. `Export-Schema.md` ist der Vertrag, beide Erzeuger halten
  sich daran.

**Was PROPAKT fehlt und dieses Muster liefert:** einen Vertrag *für den
Austausch zwischen Bausteinen*. Heute ist `@propakt/core` die Wahrheit für
Kataloge, aber es gibt keine Verträge für das, was ein Prüfer zurückgibt oder
was eine Beobachtung beobachtet. Genau dafür sind die sieben Verträge in
`bausteine/vertrage/` gedacht.

**Was nicht daraus folgt:** PROPAKT muss diese Schichten nicht übernehmen. Es
hat keine Orchestrierungsschicht und braucht keine. Die Positionen beschreiben,
wo ein Baustein einzuordnen ist – nicht, dass PROPAKT eine Positionsnummer
bekommt.

## Siehe auch

- [Muster 01 – Vermittlung](01-vermittlung.md) · Position 3
- [Muster 02 – Prüfung](02-pruefung.md) · Position 2
- [Muster 06 – Übersicht](06-uebersicht.md) · Position 0
