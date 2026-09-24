# AGENTS.md — Baustein Prompts

Muster: `muster/04-prompts.md` · Vertrag: `vertrage/04-prompts.contract.json` · Gerüst: `geraest/prompts.ts`

## Zweck

Rohe Absicht in eine Form bringen, die eine Instanz bearbeiten kann — und
jederzeit nachvollziehbar halten, woher jede Aussage stammt und ob sie hält.

## Dieser Baustein ist textbasiert

Das ist keine Formulierungslücke, sondern die Aussage. Der Baustein liefert
Markdown-Dokumente mit Struktur, **keine lauffähigen Typen**. Ein Vertrag, der
hier eine Programmiersprache nennt, beschreibt etwas, das es nicht gibt.

`geraest/prompts.ts` enthält deshalb nur die Zusage, keine Zeichenhierarchie.

## Die Kette

```text
Absicht → Research → Befund → Zerlegung → Aufgabe → Beleg → Status
```

## Die drei Belegzustände

| Zustand | Bedeutung |
|---|---|
| `ungeprueft` | frisch, unbelegt. Der Standardzustand. |
| `bestaetigt` | gegen einen Beleg geprüft |
| `widerlegt` | gegen einen Beleg geprüft **und gescheitert** |

**Widerlegt ist kein Fehler, sondern ein Ergebnis.** Der Bestand wächst, er
schrumpft nie. Löschen wäre Verschwendung: der Fehlversuch ist genau das
Signal, das beim nächsten Mal hilft.

## Regeln

- **Eine Aufgabe hat genau ein überprüfbares Ende.** Der Test: kann man an
  einem einzigen benannten Punkt sagen, ob sie erledigt ist? Wenn nicht, ist
  es ein Thema. Themen werden zerlegt, Aufgaben nicht zusammengefasst.
- **Vorgabe und Erwartung sind zwei Spalten.** „Füge einen Zeitstempel hinzu"
  ist eine Vorgabe. „Der Zeitstempel muss ISO 8601 sein" ist eine Erwartung.
  Ohne die zweite Spalte entsteht Arbeit, die nicht beurteilbar ist.
- **Herkunft ist Teil des Belegs, nicht Teil der Bewertung.** Ein Beleg aus
  Modellmaterial ist als solcher gekennzeichnet und verschmilzt nie mit eigenem
  Material.
- **Übergaben tragen keinen Eindruck.** „Ich finde das riskant" ist keine
  Übergabe. „Dieser Pfad ist ungetestet" ist eine.

## Was nicht gebaut ist

Alles. `implementation_status.overall` ist `STUB`.

PROPAKT hat kein Äquivalent. Kontextpakete liefern Herkunft über
Quellen-Domänen — das ist etwas anderes als ein Beleg mit Statuswechsel, und
es wäre eine Übertreibung, das gleichzusetzen.

## Prüfregeln

1. Jede Aussage führt ihren Beleg, oder sie wird nicht weitergegeben.
2. Ein Wechsel `widerlegt` → `bestaetigt` braucht eine Begründung. Ohne sie
   bleibt der Beleg liegen, wo er liegt.
3. Ein Bericht, der sagt „bestätigt", muss sagen **woran** geprüft wurde.
   Bestätigung ist nicht Wahrheit, und wer sie so liest, benutzt das Muster
   falsch.
