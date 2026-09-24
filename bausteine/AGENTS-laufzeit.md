# AGENTS.md — Baustein Laufzeit

Muster: `muster/05-laufzeit.md` · Vertrag: `vertrage/05-laufzeit.contract.json` · Gerüst: `geraest/laufzeit.ts`

## Zweck

Jedes Ereignis wird unveränderlich festgehalten, daraus wird eine Bewertung
abgeleitet, und aus der Bewertung lernt das System. Ändert sich die Regel,
lässt sich die Vergangenheit neu bewerten, **ohne sie zu wiederholen**.

Der Nutzen ist nicht „besser werden". Der Nutzen ist: die Frage beantworten
können, **warum** es so geworden ist.

## Die zwei Sichten

```text
Ereignis (roh, unveränderlich, append-only)
   │
   ├──► Wiedergabe mit der Regel von heute    (Ansicht A)
   ├──► Wiedergabe mit einer ANDEREN Regel    (Ansicht B)
   └──► Belohnung → Anpassung → Regel von morgen
```

A und B entstehen aus **demselben** Protokoll. Deshalb sind sie vergleichbar,
und deshalb ist „warum ist es besser geworden" überhaupt beantwortbar. Lägen sie
in verschiedenen Daten, wäre der Vergleich wertlos.

## Regeln

- **Unveränderlich heisst nicht änderbar und nicht löschbar.** Kein Update, kein
  Korrigieren. Ein Fehlauftrag wird durch ein Gegenereignis aufgehoben, damit
  die Kette lesbar bleibt.
- **Belohnung ist eine Interpretation, kein Speicherplatz.** Sie wird aus dem
  Ereignis berechnet, nicht neben ihm abgelegt. Wer dieselbe Regel auf dieselbe
  Historie anwendet, kommt auf dasselbe Ergebnis — das ist der eigentliche
  Test.
- **Wissen ohne Herkunft ist ungültig.** Jeder gelernte Zusammenhang führt auf
  Ereignisse zurück, aus denen er entstanden ist. Ohne Herleitung wird nicht
  gelernt: ein leeres Modell ist ehrlicher als ein unbegründetes.
- **Genau ein Gate.** Siehe `AGENTS-pruefung.md` — die Regel ist hier
  ausdrücklich wiederholt, weil die Vorlage zu diesem Muster zwei
  Falsification-Gates parallel führte (619 und 533 Zeilen, identische
  Beschreibung, keine Aussage darüber, welches gilt). Zwei Gates sind keine
  Ausstattung, sie sind eine offene Frage mit Failure-Exit.

## Was existiert, was nicht

Dies ist der einzige Baustein mit echtem teilweisem Bestand:

| Abschnitt | Status | In PROPAKT |
|---|---|---|
| `protokoll` | `IMPLEMENTED` | SQLite-WAL, append-only (`live_store.rs`) |
| `wiedergabe` | `IMPLEMENTED` | `get_history_metrics`, Vergleich in `HistoryGraph.tsx` |
| `lernen` | `STUB` | nichts |
| `genau_ein_gate` | `STUB` | PROPAKT hat kein solches Gate |

Die Einschränkung bei `wiedergabe` ist wichtig: **es gibt nur eine Regel.** Die
zweite Sicht ist ungebaut. Dass die erste funktioniert, ist kein Beweis, dass
die zweite unter einer anderen Regel auch funktionieren würde.

Ebenso: die Live-Zeitreihe ist nach **Zeitstempel** sortiert, nicht nach
monotoner Reihenfolge. Ein Zeitsprung rückwärts ist damit nicht abgesichert.

## Prüfregeln

1. Ein Ereignis, das nachträglich verändert wurde, macht die Kette ungültig.
   Die Suche nach Update- und Delete-Pfaden ist der Test.
2. Zwei Sichten derselben Historie unterscheiden sich **nur** in der
   Regelversion. Unterscheiden sie sich im Inhalt, stimmt eine der beiden
   nicht.
3. Ein gelernter Zusammenhang ohne auffindbare Herleitung wird verworfen, nicht
   geraten.
