# Muster 06 – Übersicht

> **Kernsatz des Musters:** Ein Format, das niemand liest, ist kein Format.
> Jeder Leser, der keine Treffer liefert, sagt genau das.

## Zweck

Daten aus fremden Werkzeugen liegen an verstreuten Orten, in fremden Formaten.
Wer sie zusammenführen will, braucht einen Leser je Quelle – und einen Weg,
doppelte zu erkennen, ohne sie zu verschmelzen.

## Die drei Ebenen

### Entscheidung

1. **Welcher Leser?** Je Plattform einer. Kein Sammel-Leser mit
   Raten – das Muster hat keinen „generischen Fallback", und das ist Absicht.
2. **Ist das ein Treffer?** Ein Leser, der nichts findet, ist ein Ergebnis:
   „diese Plattform ist hier nicht installiert".
3. **Sind das zwei oder eines?** Zwei Datensätze mit gleichem Inhalt bleiben
   zwei. Sie werden zusammengeführt, nicht gelöscht.

### Mechanik

```text
Suchpfade
   │
   ▼  welche Plattformen sind überhaupt vorhanden?
   │
   ├──► [Leser A] eigenes Format ──┐
   ├──► [Leser B] eigenes Format ──┤
   ├──► [Leser C] eigenes Format ──┼──► normalisieren
   └──► [Leser D] eigenes Format ──┘            │
                                                ▼
                                        [Dedup]  gleicher Inhalt
                                          │           unter
                                          │           verschiedenem
                                          │           Schlüssel
                                          ▼
                                     [Kategorisierung] ──► Darstellung
```

**Ein Leser je Plattform, ausdrücklich kein Sammel-Leser.** Der verlockende
Sammel-Leser erkennt „irgendwas mit Schlüsseln" und wird dann falsch. Ein
Leser, der nur JSON liest, kann falsch werden, aber nicht *stumm* falsch
werden – er findet nichts, und das ist ein Unterschied, den man sehen kann.

**Normalisieren vor Dedup.** Erst auf gemeinsame Felder bringen, dann
vergleichen. Sonst vergleicht man Bytes und erkennt Dinge als verschieden, die
gleich sind.

**Dedup ist zweistufig.**

```text
  Stufe 1: Fingerabdruck        gleicher Inhalt → möglicherweise dasselbe
          (SimHash)             64 Bit, tolerant gegenüber Formatierung

  Stufe 2: Mengenvergleich      echte Übereinstimmung der Mengen
          (Jaccard)             erst danach gilt es als sicher
```

Die Reihenfolge ist nicht beliebig. SimHash allein erzeugt bei 64 Bit
Falschtreffer in der Grössenordnung von 1e-19 je Paar – bei Millionen Paaren
sind das einige hundert. Deshalb prüft die zweite Stufe nach.

**Was passiert bei einem Trefferpaar:** beide Datensätze bleiben. Einer bekommt
eine Verknüpfung. Es gibt keinen Zusammenführungsschritt, der den Originaleintrag
überschreibt – der Schritt, bei dem jemand irgendwann entscheidet, welcher der
beide „richtig" ist, ist der Schritt, bei dem Information verloren geht.

## Grenze

**Ein fremdes Format ist eine Verpflichtung.** Jeder Leser muss gepflegt
werden, wenn sich das Format der Quelle ändert. Das ist der eigentliche Preis
dieses Musters, und er ist nicht versteckbar: ein Leser, der still nichts
findet, ist schlimmer als ein fehlender Leser.

**Was das Muster nicht leistet:**

- **Keine Vollständigkeit über Quellen.** Es liest die aufgeführten Plattformen.
  Was nicht gelistet ist, wird nicht gesehen.
- **Keine Priorisierung.** Alles Gelesene landet gleichwertig. Was wichtig ist,
  entscheidet die Darstellung, nicht die Sammlung.
- **Keine Schreibfähigkeit.** Übersicht liest. Sie ändert nichts an den
  Werkzeugen, aus denen sie liest.
- **Keine Aussage über Verhalten.** Die Daten zeigen, was protokolliert wurde –
  nicht, was richtig lief. Ein Protokoll, das falsch ist, wird hier sauber
  dargestellt.

**Zur Grössenordnung.** Die Vorlage zu diesem Muster unterstützte über 30
Fremdformate. Das ist kein Feature, das man in PROPAKT übernehmen sollte –
es ist eine offene Wartungsverpflichtung mit 30 Einträgen. Was übernehmbar ist,
ist die *Form* des Musters: ein Leser je Quelle, kein Sammel-Leser, Dedup in
zwei Stufen.

## Anbindung an PROPAKT

PROPAKT hat bereits eine Ergebnis-Tabelle (`ErgebnisTabelle.tsx`) und ein
Ergebnis-Model mit Zählern, Sprachverteilung und Hotspots. Das ist eine
Darstellung – aber für genau **eine** Quelle: das gescannte Verzeichnis.

Das Muster ist relevant, sobald PROPAKT nicht mehr nur ein Verzeichnis liest.
Derzeit liest es eines. Ein Leser-Register für Fremdformate wäre Vorbereitung
auf etwas, das nicht existiert.

**Was stattdessen gilt:** PROPAKT hat bereits eine Form von Dedup – die
Delta-Erkennung über Baum-Signaturen im Zwischenspeicher. Sie beantwortet
„was hat sich geändert", nicht „ist das dasselbe". Zwei verschiedene Fragen, und
PROPAKT hat die erste beantwortet.

**Die Oberflächen-Lehre.** Was übernehmbar ist, liegt in `StatistikKarten.tsx`:
gestapelte Balken für Anteile, eine Rangliste mit Relativbalken. Keine fremde
Bibliothek, handgeschriebenes SVG und CSS. Diese Form ist wiederverwendbar, wenn
der Baustein später gebaut wird.

## Vertrag

Siehe `bausteine/vertrage/06-uebersicht.contract.json`. Der Abschnitt
`leser_je_quelle` ist als `STUB` geführt, `darstellung` trägt die sieben Punkte,
weil das Muster dort tatsächlich eine überprüfbare Aussage macht.

## Siehe auch

- [Muster 03 – Beobachtung](03-beobachtung.md) · Lesen ohne Eingriff
- [Muster 07 – Integration](07-integration.md) · wo dieser Baustein einzuordnen ist
