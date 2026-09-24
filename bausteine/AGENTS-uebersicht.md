# AGENTS.md — Baustein Übersicht

Muster: `muster/06-uebersicht.md` · Vertrag: `vertrage/06-uebersicht.contract.json` · Gerüst: `geraest/uebersicht.ts`

## Zweck

Daten aus fremden Werkzeugen zusammenführen — und dabei doppelte erkennen,
ohne sie zu verschmelzen.

## Ein Leser je Plattform, kein Sammel-Leser

Das ist die eigentliche Regel, und sie wirkt gegen die Versuchung.

Ein Sammel-Leser erkennt „irgendwas mit Schlüsseln" und wird dann falsch. Ein
Leser, der nur ein Format liest, kann falsch werden — aber nicht **stumm**
falsch werden, weil er dann nichts findet und das auffällt. Diese
Unterscheidung ist der ganze Grund.

**Ein Leser, der nichts findet, ist ein Ergebnis:** „diese Plattform ist hier
nicht installiert". Kein Fehler, kein leerer Bildschirm.

## Dedup in zwei Stufen

```text
Stufe 1  Fingerabdruck (SimHash, 64 Bit)   gleicher Inhalt → möglicherweise dasselbe
Stufe 2  Mengenvergleich (Jaccard)          erst danach gilt es als sicher
```

Die Reihenfolge ist nicht beliebig. SimHash allein erzeugt bei 64 Bit
Falschtreffer in der Grössenordnung 1e-19 je Paar — bei Millionen Paaren sind
das einige hundert. Stufe zwei ist deshalb nicht optional, sondern die
Voraussetzung dafür, dass Stufe one's Treffer überhaupt etwas bedeuten.

**Normalisieren vor Dedup.** Erst auf gemeinsame Felder bringen, dann
vergleichen — sonst vergleicht man Bytes und erkennt Gleiches als verschieden.

## Nichts überschreiben

Ein Trefferpaar wird **verknüpft**. Beide Datensätze bleiben vollständig
erhalten. Es gibt keinen Zusammenführungsschritt, der entscheidet, welcher von
beiden der richtige ist — dieser Schritt wäre der, an dem Information verloren
geht, und zwar unbemerkt.

## Was nicht gebaut ist

Die Leser-Liste ist `STUB`, und zwar aus einem konkreten Grund: **PROPSA liest
genau eine Quelle**, das angegebene Verzeichnis. Ein Leser-Register für
Fremdformate jetzt anzulegen hiesse, eine Wartungsverpflichtung ohne Nutzen zu
erzeugen.

Die Vorlage zu diesem Muster unterstützte über 30 Fremdformate. Das ist **kein
Feature**, das man übernehmen sollte — es ist eine offene Wartungsverpflichtung
mit 30 Einträgen, und jede einzelne muss gepflegt werden, wenn sich das Format
der Quelle ändert. Übernehmbar ist nur die *Form* des Musters: ein Leser je
Quelle, kein Sammel-Leser, Dedup in zwei Stufen.

## Was schon existiert

Der Darstellungsteil ist echt und braucht keine Fremdformate:
`ErgebnisTabelle.tsx`, `StatistikKarten.tsx` (gestapelte Balken, Rangliste mit
Relativbalken), `Hotspots.tsx`. Handgeschriebenes SVG und CSS, keine
Bibliothek. Diese Form ist wiederverwendbar.

## Prüfregeln

1. Ein neuer Leser bekommt sein eigenes Format und einen eigenen Fallback auf
   „nicht installiert". Er wird **nicht** in einen bestehenden Leser hineingewachsen.
2. Ein Fingerabdruck allein begründet nie eine Verknüpfung.
3. Nach dem Dedup ist die Zahl der Datensätze unverändert. Sie steigt nie.
