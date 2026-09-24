# Muster 05 – Laufzeit

> **Kernsatz des Musters:** Was passiert ist, ist passiert. Eine Bewertung ist
> eine Interpretation – sie ändert das Ereignis nicht.

## Zweck

Ein Laufzeitkern umgibt die Ausführung einer Instanz: jedes Ereignis wird
unveränderlich festgehalten, daraus wird eine Bewertung abgeleitet, und aus der
Bewertung lernt das System. Wenn sich die Bewertungsregel ändert, lässt sich die
gesamte Vergangenheit neu bewerten, ohne sie zu wiederholen.

Der Nutzen ist nicht „besser werden". Der Nutzen ist: **die Frage beantworten
können, warum es so geworden ist.**

## Die drei Ebenen

### Entscheidung

1. **Was ist passiert?** Das rohe Ereignis. Unveränderlich, vollständig,
   mit Zeitstempel und Herkunft.
2. **Wie war das?** Die Bewertung – abgeleitet, nie gespeichert als Wahrheit.
3. **Was hat sich daraus geändert?** Die Anpassung, mit Rückspur.

Das Muster beantwortet drei Fragen, die sonst unbeantwortbar bleiben:

- Wenn das Ergebnis falsch war: **wusste es das System?**
- Wenn es sich verbessert hat: **was hat es ausgelöst?**
- Wenn die Regel geändert wird: **wie sähe die Vergangenheit heute aus?**

### Mechanik

```text
Ereignis (roh, unveränderlich)
   │
   ▼  append-only
   │
   ├──► Wiedergabe mit der REGEL von heute   (Ansicht A)
   │
   ├──► Wiedergabe mit einer ANDEREN Regel   (Ansicht B)
   │
   └──► Belohnung ──► Anpassung ──► Regel von morgen
        (abgeleitet)   (mit Rückspur)

A und B entstehen aus DEMSELBEN Protokoll.
Deshalb sind sie vergleichbar. Deshalb ist die Frage
„warum ist es besser geworden" überhaupt zu beantworten.
```

**Unveränderlich heisst: nicht änderbar, nicht löschbar.** Kein Update, kein
Korrigieren. Ein Ereignis, das falsch aufgenommen wurde, wird durch ein
Gegenereignis aufgehoben – nicht durch Löschen. So bleibt die Kette lesbar.

**Belohnung ist eine Interpretation.** Sie wird aus dem Ereignis berechnet,
nicht neben ihm gespeichert. Wer dieselbe Regel auf dieselbe Historie anwendet,
kommt auf dasselbe Ergebnis. Das ist der eigentliche Test für die
Reproduzierbarkeit.

**Wissen ohne Herkunft ist ungültig.** Jeder gelernte Zusammenhang führt auf
Ereignisse zurück, aus denen er entstanden ist. Ein Zusammenhang ohne
Herleitung wird nicht gespeichert, weil er nicht überprüfbar ist.

### Das Gate – genau eines

```text
  Anforderung
   │
   ▼
  [Gate]  formal: Schema · Coverage · Ziel vorhanden
   │
   ├── ungültig ──────────────► abgewiesen
   │
   ▼ gültig
  [Zweitinstanz]  führt jede Probe aus
   │
   ▼
  [Gate]  entscheidet: freigegeben | abgewiesen
```

Es gibt **genau ein Gate** im Muster. Die Vorlage, aus der es stammt, hatte zwei
parallel – eines davon mit identischem Kopfkommentar, beide produktiv, keine
Aussage darüber, welches gilt. Das ist der Grund für diese Regel: zwei Gates
sind kein Feature, sie sind eine offene Frage mit Failure-Exit.

## Grenze

**Was das Muster nicht leistet:**

- **Keine Vorhersage.** Das Gelernte beschreibt, was passiert ist. Es sagt
  nichts über morgen voraus – und wer es dazu benutzt, verwechselt Statistik
  mit Vorhersage.
- **Kein Lernen aus dem Nichts.** Ohne Ereignisse gibt es nichts zu lernen. Ein
  frisches System mit guten Absichten ist kein trainiertes System.
- **Kein Zurückrollen in die Vergangenheit.** Die Historie bleibt, was sie war.
  Eine geänderte Regel erzeugt eine neue Sicht, keine neue Wirklichkeit.
- **Die Qualität der Belohnung ist die Qualität der Regel.** Eine schlechte
  Regel liefert selbstlernend schlechte Ergebnisse – mit dem Vorteil, dass es
  schnell geht.

**Zur Zwei-Gates-Frage.** Diese Vorlage hatte tatsächlich zwei
Falsifikations-Gate-Implementierungen nebeneinander, 619 und 533 Zeilen, beide
mit derselben Beschreibung. Welche gilt, war aus dem Code nicht zu
beantworten. Ein Muster, das eine solche Frage offen lässt, ist kein Muster.

## Anbindung an PROPSA

PROPSA hat keine Laufzeit im Sinne dieses Musters. Es hat einen Live-Modus mit
Journal, Takt und Anomalie-Schwellen.

Der Anschluss ist begrenzt und sollte begrenzt bleiben: Die Live-Zeitreihe ist
ein Ereignisstrom, aber ohne Ableitung. Ein Betrieb, der „wir wollen
selbstlernend besser werden" erwartet, baut etwas ein, das PROPSA nicht ist.

Was sich anbietet, ist bescheidener: die Live-Zeitreihe ist ein Rohprotokoll
nach dem Muster – unveränderlich, mit Zeitstempel, wieder ablesbar. Der
Wiedergabeteil (Ansicht A/B) funktioniert heute. Der Lernteil fehlt, und es ist
richtig, das zu benennen statt es zu übernehmen.

## Vertrag

Siehe `bausteine/vertrage/05-laufzeit.contract.json`. Der Abschnitt `lernen` ist
als `STUB` geführt. Der Abschnitt `wiedergabe` trägt die sieben Punkte, weil er
im Muster tatsächlich ausgeführt wird.

## Siehe auch

- [Muster 02 – Prüfung](02-pruefung.md) · das eine Gate im Detail
- [Muster 03 – Beobachtung](03-beobachtung.md) · Ereignisse lesen, nicht schreiben
- [Muster 06 – Übersicht](06-uebersicht.md) · Ereignisse darstellen
