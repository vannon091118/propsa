# Muster 04 – Prompts

> **Kernsatz des Musters:** Ein Satz ohne Herkunft ist keine Information,
> sondern ein Geräusch. Jede Aussage führt ihren Beleg – oder sie wird
> nicht weitergegeben.

## Zweck

Rohe Absicht in eine Form bringen, die eine Instanz bearbeiten kann, und
jederzeit nachvollziehbar halten, woher jede Aussage stammt und ob sie hält.

## Die Kette

```text
Absicht (freier Text)
   │
   ▼  Research
   │  offen fragen, Material sammeln, Lücken benennen
   ▼
Befund (mit Herkunft, Status ungeprüft)
   │
   ▼  Zerlegung
   │  in atomare Aufgaben: eine Aufgabe, ein überprüfbares Ergebnis
   ▼
Aufgabe (mit Anforderungs-ID und Prüfmittel)
   │
   ▼  Ausführung → Beleg
   │  was tatsächlich getan wurde, mit Fundstelle
   ▼
Prüfung → Status
   ungeprüft  →  bestätigt  |  widerlegt
```

## Die drei Ebenen

### Entscheidung

Drei Entscheidungen, die jemand treffen muss:

1. **Ist das eine Aufgabe oder ein Satz?** Sätze mit eingebautem Verb und
   prüfbarem Ergebnis sind Aufgaben. „Verbessere die Lesbarkeit" ist keines
   davon – es hat kein überprüfbares Ende.
2. **Woher kommt diese Aussage?** Aus eigenem Material, aus fremdem Material
   mit Fundstelle, oder aus dem Modell. Der dritte Fall ist der teuerste und
   braucht ausdrückliche Kennzeichnung.
3. **Bleibt sie?** Drei Ausgänge: ungeprüft, bestätigt, widerlegt. Ein Beleg
   wird nicht gelöscht, sondern herabgestuft – Widerlegung ist ein Ergebnis.

### Mechanik

**Atomare Aufgabe.** Der Test ist einfach: kann man an einem einzigen, benannten
Punkt sagen, ob es erledigt ist? Wenn nicht, ist es keine Aufgabe, sondern ein
Thema. Themen werden zerlegt, Aufgaben nicht zusammengefasst.

**Beleg-Status.** Jeder Beleg trägt Status und Herkunft:

```text
  UNGEPRÜFT          BESTÄTIGT           WIDERLEGT
  ─────────          ──────────          ──────────
  frisch, unbelegt   gegen Beleg         gegen Beleg
  Standardzustand    geprüft             geprüft und
                                          gescheitert
```

Wichtig: **widerlegt ist nicht wertlos.** Es ist die Information, dass eine
Annahme nicht trägt. Löschen wäre Verschwendung – der Fehlversuch ist genau das
Signal, das beim nächsten Mal hilft.

**Zustandsübergänge sind einseitig.** Ungeprüft → bestätigt oder widerlegt.
Bestätigt → widerlegt ist erlaubt (neue Evidenz). Widerlegt → bestätigt
ebenfalls, wenn neue Evidenz vorliegt, aber mit Begründungspflicht. Ohne
Begründung bleibt ein Beleg liegen, wo er liegt.

**Übergabe zwischen Instanzen.** Eine Übergabe nennt Absender, Empfänger, den
Stand der Belege und was der Empfänger tun soll. Sie enthält keine
Bewertung – „ich finde das riskant" ist keine Übergabe, "dieser Pfad ist
ungetestet" ist eine.

### Der Unterschied zwischen Vorgabe und Erwartung

| Vorgabe | Erwartung |
|---|---|
| „Füge einen Zeitstempel hinzu" | „Der Zeitstempel muss ISO 8601 sein" |
| „Mache es schneller" | „Der Scan darf bei 1000 Dateien nicht länger als 3 s brauchen" |
| „Schreibe Tests" | „Jeder Zweig der Schleife braucht einen Fall" |

Eine Vorgabe ohne überprüfbares Ende erzeugt Arbeit, die nicht beurteilbar ist.
Das Muster zwingt zur zweiten Spalte – und wenn die nicht ausformuliert
werden kann, ist die Aufgabe noch nicht fertig gedacht.

## Grenze

**Das Muster ist textbasiert, nicht ausführbar.** Es liefert Markdown-Dokumente
mit Struktur, keine lauffähigen Typen. Das ist eine bewusste Grenze und kein
Mangel: der Wert liegt in der Struktur, nicht im Programm.

**Was das Muster nicht leistet:**

- **Keine Garantie, dass Belege stimmen.** Ein Beleg mit Status „bestätigt"
  heisst: wurde gegen etwas geprüft. Er heisst nicht: ist richtig. Wer
  Bestätigung mit Wahrheit verwechselt, benutzt das Muster falsch.
- **Kein Ersatz für die Formulierung der Aufgabe.** Die Zerlegung ist
  aufwendig. Wer sie überspringt, bekommt schlechte Aufgaben – das Muster
  verhindert das nicht, es macht es nur sichtbar.
- **Keine Drift-Erkennung.** Ob sich ein Ton über viele Aufgaben verschiebt,
  ist nicht Teil dieses Musters. Wer das braucht, braucht [Muster 05](05-laufzeit.md).
- **Kein Verwerfen.** Alles bleibt. Das ist gewollt und kostet Speicher.

## Anbindung an PROPAKT

PROPAKT erzeugt Kontextpakete: Zusammenfassung, Architektur, Kritik,
Dokumentation, Quellen. Das Muster fragt vor jeder Aussage: woher kommt sie?

Bei den Pakettexten ist das konkret: eine Aussage über den Code sollte auf
gelesenen Dateien beruhen, nicht auf dem Dateinamen. Die Quellen-Domänen im
Paket liefern die Herkunft; `Kritik.md` liefert die Statusmarkierung
(auffällig, nicht falsch).

**Was PROPAKT nicht braucht.** Der Baustein ersetzt nicht das Schreiben von
Dateien. Er ist eine Vorstufe: aus Absicht wird eine prüfbare Aufgabe, aus der
Aufgabe wird ein Beleg, aus dem Beleg wird ein Status.

## Vertrag

Siehe `bausteine/vertrage/04-prompts.contract.json`. Der Vertrag beschreibt
Dokumente und Übergaben, **keine Programmiersprache** – das Muster hat keinen
ausführbaren Teil. Ein Vertrag, der hier eine Sprache nennt, beschreibt etwas,
das es nicht gibt.

## Siehe auch

- [Muster 02 – Prüfung](02-pruefung.md) · wie ein Beleg geprüft wird
- [Muster 05 – Laufzeit](05-laufzeit.md) · was aus vielen Belegen wird
