# Muster 03 – Beobachtung

> **Kernsatz des Musters:** Abgeleitetes Wissen wird nie zur Autorität, solange
> eine explizite Laufzeitregel es nicht erlaubt.

## Zweck

Ein Vorgang läuft und erzeugt Ereignisse. Ein Beobachter sieht sie, ordnet sie,
leitet daraus Schlüsse ab – und darf dabei **nichts** am Vorgang ändern.

## Die zwei Datenhaltungen

Das ist der entscheidende Punkt, und er wird oft falsch gebaut. Beobachter und
Vorgang teilen **keinen** Speicher:

```text
  VORGANG                          BEOBACHTER
  ┌──────────────────────┐         ┌──────────────────────┐
  │ eigene Datenhaltung  │  ◄──┐   │ eigene Datenhaltung  │
  │                      │    │   │                      │
  │  schreibt           │    │   │  schreibt NUR hier   │
  │  entscheidet         │    │   │  leitet ab           │
  │  blockiert           │    └───┤  empfiehlt optional  │
  └──────────────────────┘  read │  blockiert NIE       │
              ▲                  │  pausiert NIE         │
              │                  └──────────────────────┘
              └── nur lesend geöffnet, eigener Schreibpfad
```

**Warum getrennt.** Wenn beide in eine Datenbank schreiben, entstehen zwei
Schreiber auf denselben Zustand. Wer gewinnt? Die Frage darf nicht aufkommen.
Getrennte Speicher machen die Frage überflüssig – der Beobachter *kann*
strukturell nicht eingreifen, weil er den Pfad nicht hat.

Das ist der Unterschied zwischen einer Zusage („ich greife nicht ein") und
einer Eigenschaft („ich habe keine Möglichkeit"). Nur die zweite hält.

## Die drei Ebenen

### Entscheidung

1. **Darf ich mich einmischen?** Nein. Diese Frage wird nie gestellt, weil das
   Ergebnis feststeht.
2. **Was bedeutet das Ereignis?** Eine Mapping-Tabelle übersetzt fremde Namen
   in sieben eigene Typen.
3. **Was schliesse ich daraus?** Eine Ableitung, die als Vorschlag gespeichert
   wird – nie als Tatsache, nie als Anweisung.

### Mechanik

```text
Ereignisstrom des Vorgangs
   │
   ▼  ingest() — normalisieren, deduplizieren, ablegen
   │  Cursor-Sprünge sind transaktional: genau einmal je Ereignis.
   ▼
[Vokabular]   Fremdname → eigener Typ
   │          CLAIM · CHALLENGE · LIFECYCLE · VERDICT ·
   │          HANDOFF · COMPLETION · DIAGNOSTIC
   ▼
[Vergleich]   Beobachtung gegen den eigenen Verlauf
   │          nur aus dauerhaft abgelegten Beobachtungen,
   │          damit ein Neustart nichts verliert
   ▼
[Ableitung]   Korrelation · Muster · Schluss
   │          gespeichert als Vorschlag, mit Herkunft
   ▼
[eigene Datenhaltung]
```

**Die Mapping-Tabelle ist die einzige Stelle, die Fremdnamen kennt.** Neue
Ereignisnamen des Vorgangs brauchen eine Zeile in dieser Tabelle – kein
Consumer-Code wird angefasst. Das ist der Grund für diese Form: die
Übersetzung liegt an genau einem Ort.

**Zwei Cursor, getrennt.** Der Aufnahme-Cursor und der Wiedergabe-Cursor gehören
verschiedenen Aufgaben und beeinflussen sich nicht. Wer sie teilt, erzeugt
Zustände, in denen die Wiedergabe einem Aufnahme-Stand hinterherläuft, ohne
dass jemand es merkt.

**Slot-Reservierung in einer Transaktion.** Wenn der Beobachter einen
Arbeitsschritt anfängt, reserviert er seinen Platz mit `BEGIN IMMEDIATE` – nicht
„prüfen, dann belegen". Das dritte, doppelte Fenster zwischen zwei Läufen ist
genau die Lücke, in der zwei Instanzen denselben Schritt beginnen.

### Worum der Beobachter ausdrücklich nicht bitten darf

```text
Darf NICHT          Beispiel
──────────────────────────────────────────────────────
blockieren          "ich habe einen Fehler gefunden"
pausieren           "warte kurz, ich brauche Kontext"
Zustand ändern      "der Vorgang ist jetzt in Phase 2"
ein Urteil ändern   "die Prüfung hat sich geirrt"
einen Abbruch       "ich kann nicht mehr weiter"
  auslösen oder
  unterdrücken
eine Schreibfreigabe "du darfst jetzt schreiben"
  geben oder
  ausführen
```

Jede Zeile ist eine Grenze, nicht eine Absicht. Eine Ableitung, die darauf
baut, dass der Beobachter doch einmal eingreift, baut auf nichts.

## Grenze

**Fail-open ist die Verpflichtung, nicht die Ausnahme.** Jeder Fehlerpfad des
Beobachters endet darin, dass der Vorgang unverändert weiterläuft – sichtbar
als Fehlerzustand, nie als Eingriff.

**Was das Muster nicht leistet:**

- **Keine Vollständigkeit.** Sieht der Beobachter ein Ereignis nicht, ist es
  für ihn nicht passiert. Der Vokabular-Kanal muss jedes relevante Ereignis
  erreichen – und dafür gibt es keinen Test, der das beweisen kann.
- **Keine Echtzeitgarantie.** Der Beobachter ist so frisch wie sein Cursor. Bei
  einem Stillstand arbeitet er auf altem Stand – das ist im Vertrag festgehalten,
  damit niemand daraus eine Sicherheit ableitet.
- **Eine Ableitung ist kein Beweis.** Auch eine Korrelation über viele
  Ereignisse ist eine Vermutung mit Zahlen. Sie steht deshalb als Vorschlag in
  der eigenen Ablage und nicht im Vorgang.
- **Keine Rückwirkung auf Entscheidungen.** Auch nicht „nur ein kleiner Hinweis".
  Die Grenze gilt vollständig oder gar nicht.

## Anbindung an PROPSA

PROPSA hat bereits Live-Modus: ein SQLite-Journal in WAL, einen Taktgeber, eine
Anomalie-Erkennung mit Schwellen, ein Overlay-Fenster. Das ist eine
**Beobachtung ohne Beobachter** – das Muster geht einen Schritt weiter und
trennt den Journal-Leser vom Vorgang.

Der Live-Modus wird dadurch nicht ersetzt. Er bleibt die Quelle, aus der
Beobachtungen stammen; die Ableitung ist die neue Schicht darüber. Die
Trennung, die das Muster verlangt, gilt für den Live-Pfad ebenso: der
Live-Pfad liest, der Beobachterpfad schreibt in eine eigene Ablage.

Die Oberfläche zeigt den Ereignisstrom, nicht die Ableitung – nach dem Muster
der Sparkline in `tauri-app/src/LiveOverlay.tsx:190-192`. Eine Ableitung, die
als Wahrheit dargestellt würde, wäre ein Vertragsbruch mit Benutzeroberfläche.

## Vertrag

Siehe `bausteine/vertrage/03-beobachtung.contract.json`. Die Negativliste ist
dort als `FORBIDDEN` geführt – sie gehört in den Vertrag, nicht in einen
Kommentar, damit sie beim Ändern auffällt.

## Siehe auch

- [Muster 02 – Prüfung](02-pruefung.md) · der Prüfer entscheidet
- [Muster 05 – Laufzeit](05-laufzeit.md) · Ereignisse und ihre Auswertung
