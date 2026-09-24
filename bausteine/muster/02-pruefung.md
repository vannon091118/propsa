# Muster 02 – Prüfung

> **Kernsatz des Musters:** Unabhängigkeit ist *notwendig, nicht hinreichend*.
> Eine zweite Instanz mit demselben Modell, demselben Anbieter und demselben
> Kontext reproduziert dieselben blinden Flecken. Das ist korrelierter Ausfall,
> keine Kontrolle.

## Zweck

Eine Behauptung soll gegen die tatsächlichen Dateien geprüft werden, bevor
darauf geschrieben wird. Nicht: *die Behauptung ist richtig*. Sondern: *der
Versuch, sie kaputtzumachen, ist gescheitert*.

## Die vier Rollen

Das Muster trennt vier Rollen, und diese Trennung ist der eigentliche Inhalt.
Jede Rolle darf genau eine Sache:

| Rolle | Aufgabe | Darf **nicht** |
|---|---|---|
| **Denker** | Erzeugt ein Probe-Set aus den Anforderungen | Urteilen, ob die Prüfung reicht |
| **Validator** | Prüft Schema, Coverage, Existenz, Anti-Vakuum | Qualität bewerten |
| **Zweitinstanz** | Führt jede Probe aus, liefert Status je Probe | Andere entscheiden lassen |
| **Gate** | Entscheidet allein: freigeben oder nicht | Irgendetwas anderes |

Der Validator ist der häufigste Fehlerort. Er prüft **formal**: Hat jede
Anforderung mindestens eine Probe? Existiert das Ziel im Arbeitsverzeichnis?
Sind die IDs eindeutig? Das ist Strukturprüfung. Er **beweist keine
linguistische Qualität**. Ein Satz wie „der Code sollte besser sein" besteht
die Strukturprüfung und ist wertlos – deshalb gibt es das Anti-Vakuum-Minimum.

## Die drei Ebenen

### Entscheidung

Drei Fragen, in dieser Reihenfolge:

1. **Ist das Probe-Set formal gültig?** Nein → abgewiesen, ohne dass eine
   einzige Probe ausgeführt wird.
2. **Was sagt die Zweitinstanz zu jeder Probe?** Sie liefert je Probe
   `BESTAETIGT`, `WIDERSPRUCH` oder `UNKLAR` plus Beleg.
3. **Ist das Set vollständig bestätigt?** Nur dann freigeben.

### Mechanik

```text
Anforderungstext
   │
   ▼  splitRequirement → H1, H2, H3 … (Original-Spans, 1:1)
   │
   ▼
[Denker]   baut Probe-Set, jede Probe mit Rückreferenz auf eine H_i
   │
   ▼
[Validator] formal: Schema · Coverage (jede H_i ≥ 1 Probe) ·
   │          Ziel existiert und liegt im Arbeitsverzeichnis ·
   │          Anti-Vakuum-Minimum · keine Doppel-IDs · Enum
   │          → Nein: STOPP. Keine Probe wird ausgeführt.
   ▼
[Zweitinstanz]  führt JEDE Probe aus
   │            sieht nur: die Behauptungen des Erstprüfers,
   │            den Anforderungstext, den Plan, den Diff
   │            sieht NICHT: Gedankengang, Zwischenbefunde, Werkzeugspuren
   │            liefert: { probe_id, status, evidence }
   ▼
[Gate]    computeVerdict — verarbeitet nur Resultate
   │
   ├── Set formal ungültig ......... abgewiesen
   ├── ein WIDERSPRUCH ............ abgewiesen
   ├── ein UNKLAR ................. abgewiesen
   └── alles BESTAETIGT ........... freigegeben
```

**Warum die Zweitinstanz nur die Behauptungen sieht.** Wenn sie den
Gedankengang des Erstprüfers mitbekommt, übernimmt sie dessen Fehlannahmen und
bestätigt sie – nur mit anderen Worten. Der Abschnitt „Falsifikationsversuche"
wird deshalb per Regex aus der Antwort extrahiert und alles andere verworfen.
Kein Werkzeugaufruf, kein Protokoll, keine Begründungskette: nur die
Behauptungen.

**Anti-Vakuum-Minimum.** Eine Probe, die nichts prüft, ist schlimmer als keine
Probe, weil sie Coverage vortäuscht. Formal heisst das: das Ziel muss
existieren, und eine Probe ohne überprüfbaren Bezug wird abgewiesen. Das ist
kein Qualitätsbeweis – es ist nur die Ausschlussbedingung für offensichtliche
Leerläufe.

### Urteile und Austritt

```text
URTEIL        BEDEUTUNG                EXIT
BESTAETIGT    Probe hält               Teilmenge von 0
WIDERSPRUCH   Probe fällt              Teilmenge von 1
UNKLAR        nicht entscheidbar       Teilmenge von 1
UNBEKANNT     Parser fand kein Urteil  3
```

Die Austrittscodes sind die maschinenlesbare Fassung derselben Entscheidung. Ein
aufrufender Agent muss nicht den Text lesen, sondern nur den Code.

`PLAN` und `RESEARCH` führen zu Exit 1, `ASK` zu 5. **Exit 0 bedeutet
ausschliesslich:** formal gültiges Set, jede Probe bestätigt. Nichts anderes.

## Grenze

**Fail-closed heisst: im Zweifel abweisen.** Das ist unbequem, und genau
darum ist es richtig. Ein bestätigter Eindruck ohne Beleg geht nicht als
Freigabe durch.

**Was das Muster nicht leistet:**

- **Keine Vollständigkeit der Welt.** Eine Probe prüft das, was sie prüft.
  Was niemand als Probe formuliert hat, wird nicht geprüft. Das ist die
  eigentliche Lücke – und sie ist nicht durch ein Gate schliessbar, sondern nur
  durch die Person, die die Anforderungen schreibt.
- **Die Zweitinstanz ist nicht unfehlbar.** Sie sieht weniger als der
  Erstprüfer. Das ist gewollt, aber es heisst auch: sie übersieht
  Kontextabhängigkeiten, die nur im Gedankengang stehen.
- **Keine Ersatzbestätigung bei `UNKLAR`.** Der Zweitversuch mit demselben
  Modell ergäbe dasselbe `UNKLAR` mit hoher Wahrscheinlichkeit. Das Muster
  sagt: abweisen und den Menschen fragen.

**Strukturprüfung ist keine Qualitätsprüfung.** Der Validator kann nicht
unterscheiden zwischen „die Probe prüft die richtige Sache" und „die Probe hat
die richtige Form". Diese Grenze ist nicht überwindbar und wird hier
ausdrücklich benannt, damit sie niemand versehentlich überschreitet.

## Anbindung an PROPAKT

PROPAKT erzeugt heute `Kritik.md` über Schwellwerte – Dateigrösse, Logikmischung.
Das ist eine Mustererkennung nach festen Grenzwerten. Sie sagt: *diese Datei
ist auffällig*. Sie sagt nicht: *diese Aussage über den Code ist falsch*.

Das Muster ersetzt die Schwellwerte nicht, es legt eine zweite Ebene darüber.
`kritik_regeln.rs` bleibt, weil es ohne Modell läuft und sofort antwortet. Die
Prüfung kommt als zusätzliche Instanz.

**Die Bedingung:** PROPAKT hat zwei Implementierungen. Die Auswertung eines
Urteils muss in `packages/core/src/` **und** in
`tauri-app/src-tauri/src/` stehen, sonst antworten CLI und App
verschieden. `npm run pruefen` vergleicht die Kataloge – dieser Mechanismus wird
benutzt, nicht neu erfunden.

## Vertrag

Siehe `bausteine/vertrage/02-pruefung.contract.json`. Jede Gate-Regel trägt die
sieben Punkte: `POSITIVE`, `FORBIDDEN`, `FALLBACK`, `ERROR`, `TRACE`, `REPLAY`,
`INVARIANT`. Eine Regel ohne alle sieben ist nicht implementiert, sondern behauptet.

## Siehe auch

- [Muster 01 – Vermittlung](01-vermittlung.md) · der Router darf nichts entscheiden
- [Muster 03 – Beobachtung](03-beobachtung.md) · wer zuschaut, ändert nichts
