# AGENTS.md — Baustein Integration

Muster: `muster/07-integration.md` · Vertrag: `vertrage/07-integration.contract.json` · Gerüst: `geraest/integration.ts`

## Zweck

Bausteine so anordnen, dass sie sich nicht verschränken, und die Übergaben so
beschreiben, dass jede Seite nur ihre **eigene** Zusage halten muss.

Wer einen Vertrag liest, muss die Implementierung nicht kennen. Das ist der
Zweck.

## Die Schichtenlage

```text
  0  PRÄSENTATION      Zustände darstellen, nichts speichern
  1  PROMPTS           Absicht → prüfbare Aufgabe → Beleg
  2  ORCHESTRIERUNG    Ablauf, Zustand, Wer-macht-was
  3  INFRASTRUKTUR    Vermittlung, Speicher, Ausführung
```

**Übergaben laufen ausschliesslich nach unten.** Ein Aufwärtsaufruf erzeugt
einen Zyklus, und ein Zyklus erzeugt Reihenfolgeabhängigkeit: Dann hängt das
Ergebnis davon ab, wer zuerst kommt. Ohne Aufwärtsaufruf ist die Reihenfolge
eindeutig, und eine Schicht ist isoliert prüfbar.

Zuordnung: Übersicht und Beobachtung → 0 · Prompts → 1 · Prüfung, Beobachtung
und Laufzeit → 2 · Vermittlung und Integration → 3.

## Regeln

- **Eine Wahrheit je Regel.** Zwei Bausteine dürfen dieselbe Frage nicht
  getrennt beantworten. Wer das braucht, hat entweder die Frage falsch
  geschnitten oder zwei Bausteine gebaut, wo einer hingehört.
- **Ein Gate-Schema für alle.** Jede Regel trägt dieselben sieben Punkte. Das
  war vorher nicht so: die Verträge der Vorlage führten uneinheitliche Felder —
  einer zwei Gate-Felder, die anderen je ein eigenes, anders benanntes. Ein
  Verbraucher, der zwei Bausteine prüfen wollte, musste für jeden eine andere
  Struktur lesen. Das ist der Teil, der in PROPAKT tatsächlich neu ist.
- **`STUB` ≠ `NOT_VERIFIED`.** Siehe `AGENTS.md` im Wurzelverzeichnis. Der
  Unterschied ist der wichtigste im ganzen Schema.
- **Kein Aufwärtsgriff aus der Präsentation.** Wer von dort direkt in die
  Infrastruktur greift, umgeht den Vertrag — und merkt es nicht, weil es
  funktioniert.

## Der ungelöste Teil, und warum er wichtig ist

Das Schema macht Lücken sichtbar, es **schliesst** sie nicht. Eine Regel mit
sieben ausgefüllten Feldern und einem leeren `INVARIANT` sieht vollständig aus
und ist es nicht. Wer das Gate-Schema als Beweis nimmt, hat es als Abzeichen
genommen.

Ebenso wenig löst es Mehrdeutigkeit: ein Vertrag, den zwei Leser unterschiedlich
auslegen, ist ungültig — aber keiner der beiden wird es merken.

## Was PROPAKT schon bestätigt

PROPAKT hat die Schichtenliste nicht — es hat zwei Oberflächen und einen Kern.
Das bestätigt das Muster eher, als dass es ihm folgt:

- **Katalog in beiden Sprachen.** `filters.ts` und `filter.rs` führen denselben
  Katalog, `npm run pruefen` vergleicht sie. Position 3, sauber gespiegelt.
- **Übergabe über Vertrag, nicht über Aufruf.** Der Rust-Code liefert Daten,
  die TypeScript über `invoke` bekommt. Beide kennen die Implementierung der
  anderen nicht.
- **Zwei Oberflächen, ein Vertrag.** CLI und App lesen dieselbe Definition des
  Kontextpakets. `docs/wiki/Export-Schema.md` ist der Vertrag, beide Erzeuger
  halten sich daran.

**Was fehlt:** ein Vertrag *für den Austausch zwischen Bausteinen*. Heute ist
`@propakt/core` die Wahrheit für Kataloge, aber es gab keine Verträge für das,
was ein Prüfer zurückgibt oder was eine Beobachtung beobachtet. Dafür sind die
sieben Verträge gedacht.

**Was nicht daraus folgt:** PROPAKT muss diese Schichten nicht übernehmen. Es
hat keine Orchestrierungsschicht und braucht keine. Die Positionen beschreiben,
wo ein Baustein einzuordnen **wäre** — nicht, dass PROPAKT eine Position
bekommt.

## Prüfregeln

1. Ein neuer Baustein bringt sein Gate-Schema mit. Kein eigenes, kein
   abgekürztes, keine Umbenennung der sieben Punkte.
2. `npm run pruefen` liest die geprüften Deklarationen per Regex. `GATE_PUNKTE`,
   `STATUS_WERTE` und `EREIGNIS_TYPEN` in `packages/core/src/vertrag.ts` und
   ihre `match`-Arme in `vertrag.rs` nicht umformatieren und nicht umbenennen.
3. Ein Vertrag ohne `known_gaps` ist unvollständig. Auch wenn er keine Lücken
   hat: dann steht dort "keine", und das ist eine Aussage.
