# AGENTS.md — Baustein Beobachtung

Muster: `muster/03-beobachtung.md` · Vertrag: `vertrage/03-beobachtung.contract.json` · Gerüst: `geraest/beobachtung.ts`

## Zweck

Zustand von aussen **sehen, ohne ihn zu verändern**. Nicht überwachen, nicht
bewerten, nicht eingreifen.

Fail-open — und das ist der ganze Unterschied zur Prüfung: ein Fehler hier darf
den beobachteten Prozess **nie** blockieren, pausieren, ein Urteil ändern oder
einen Abbruch auslösen.

## Die Trennung

```text
  ┌──────────────────┐          ┌──────────────────────────┐
  │  Quelle          │  lesen   │  Eigenes Gedächtnis     │
  │  read-only       │ ───────► │  Rohereignisse          │
  │  fremder Zustand │          │  ┌────────────────────┐  │
  │                  │          │  │ Ableitungen        │  │
  │  nie beschrieben │          │  │ (getrennt)         │  │
  └──────────────────┘          │  └────────────────────┘  │
                                └──────────────────────────┘
```

## Regeln

- **Zwei Speicher, nicht einer.** Rohereignisse und Ableitungen liegen
  getrennt. Ein Leser des Rohspeichers sieht nie eine Ableitung. Wer beides in
  eine Tabelle legt, kann die Trennung später nicht mehr herstellen.
- **Ein Mapping-Table, sonst ein Consumer pro Produzent.** Fremdbezeichner
  werden über eine Tabelle in die sieben eigenen Ereignistypen übersetzt
  (`EREIGNIS_TYPEN` in `packages/core/src/vertrag.ts`). Ein neuer Produzent
  braucht eine Zeile, keinen Code. Die Tabelle ist die einzige Stelle, die
  fremde Namen kennt.
- **Ein Cursor je Quelle.** Slot-Reservierung vor dem Schreiben, sonst
  kollidieren zwei Schreiber.
- **Lücken sind sichtbar.** Ein Sprung in der Ereignisnummer erzeugt ein
  Lückenereignis mit Quelle und Zeitbereich. Sie wird nie durch einen
  Schätzwert geschlossen.

## Die sechs verbotenen Aktionen

| Nicht | Warum |
|---|---|
| Den Produzenten blockieren | Fail-open, sonst wird Beobachtung zum Ausfallrisiko |
| Ein Urteil ändern | Beobachtung ist keine Instanz mit Veto |
| In die Quelle schreiben | Die Quelle ist fremder Zustand |
| Abgeleitetes als Autorität nutzen | Eine Ableitung ist eine Interpretation |
| Rohereignisse überschreiben | Unveränderlich, sonst ist die Kette nicht mehr lesbar |
| Lücken stillschliessend füllen | Ein fehlender Wert, der wie ein echter aussieht, ist schlimmer als eine Lücke |

## Was nicht gebaut ist

Alles. `implementation_status.overall` ist `STUB`. Die Zuordnungstabelle ist
leer; `EREIGNIS_TYPEN` benennt die sieben Zieltypen, sonst nichts.

**Abgrenzung zu PROPSA:** `tauri-app/src-tauri/src/live_zyklus.rs` ist ein
Beobachter — aber ein geschlossener. Quelle und Speicher sind PROPSA selbst.
Der Fall, für den dieses Muster gedacht ist, ist ein Zustand **ausserhalb** des
eigenen Prozesses. Den gibt es hier nicht, und der Bau einer Beobachtung dafür
wäre Arbeit auf Verdacht.

## Prüfregeln

1. Eine Quelle, die einen Fehler wirft, erscheint als `DIAGNOSTIC` im eigenen
   Gedächtnis. Sie darf **nirgends** sonst auftauchen — insbesondere nicht als
   Ausnahme beim Produzenten.
2. Ein Test, der die Beobachtung abschaltet, ändert nichts am beobachteten
   Ablauf. Läuft der Ablauf anders, ist das ein Fehler in der Beobachtung.
3. Jede Ableitung führt auf Ereignis-IDs zurück. Ohne Herleitung: nicht
   speichern.
