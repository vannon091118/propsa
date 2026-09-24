# AGENTS.md — Baustein Prüfung

Muster: `muster/02-pruefung.md` · Vertrag: `vertrage/02-pruefung.contract.json` · Gerüst: `geraest/pruefung.ts`

## Zweck

Aus einer Anforderung wird ein Probe-Set, jede Probe wird von einer getrennten
Instanz ausgeführt, und **genau ein Gate** entscheidet über die Freigabe.

Fail-closed: Nur ein vollständig bestätigtes Probe-Set gibt frei. Das ist die
Voreinstellung, weil Prüfen im Zweifel für lossgeht — ein zurückgehaltenes
Paket kostet Zeit, ein durchgewunkenes kostet Vertrauen.

## Die vier Rollen

| Rolle | Aufgabe | Darf **nicht** |
|---|---|---|
| **Denker** | Erzeugt ein Probe-Set mit Rückreferenzen auf die Anforderungs-IDs | Urteilen, ob die Prüfung reicht |
| **Validator** | Prüft Schema, Coverage, Existenz des Ziels, Anti-Vakuum-Minimum | Qualität bewerten |
| **Zweitinstanz** | Führt jede Probe aus, liefert `{probe_id, status, evidence}` | Andere entscheiden lassen |
| **Gate** | Entscheidet allein: freigeben oder nicht | Irgendetwas anderes |

## Regeln

- **Formal ist nicht semantisch.** Ein formal gültiges Probe-Set kann
  inhaltlich falsch sein. Der Validator beweist Form, nicht Richtigkeit — und
  das gehört in jeden Bericht darüber, was geprüft wurde.
- **Die Zweitinstanz sieht nur die Behauptungen**, nicht die Herleitung. Sie
  bekommt ausschliesslich den Abschnitt der Falsifikationsversuche. Wer ihr
  den Denkweg mitgibt, prüft nicht mehr, sondern bestätigt.
- **`UNKLAR` ist kein `BESTAETIGT`.** Eine Probe ohne Ergebnis gilt als
  ungeklärt. Der Aufrufer sieht nie ein Teilergebnis als Erfolg.
- **`UNBEKANNT` ist ein eigener Ausgang**, keine Form der Ablehnung. Er
  unterscheidet "wir haben es geprüft und es stimmt nicht" von "wir konnten
  es nicht prüfen". Beides zu vermischen ist die häufigste Form einer
  Scheinsicherheit.

## Was nicht gebaut ist

Alles. `implementation_status.overall` ist `STUB`.

**Wichtig für die Abgrenzung:** `tauri-app/src-tauri/src/kritik_regeln.rs` und
`packages/core/src/paketKritik.ts` sind **Erzeuger**, keine Prüfer. Sie
bewerten ein gescanntes Paket und schreiben `Kritik.md`. Der Baustein wäre eine
Ebene **darüber** — und sie ist weder gebaut noch eingeplant.

## Prüfregeln

1. Es existiert genau **eine** Implementierung des Entscheidungspunkts. Zwei
   Gates sind keine Ausstattung, sie sind eine offene Frage mit Failure-Exit.
2. Die Mindestabdeckung liegt bei 1.0. Eine Lücke ist eine Probe, die fehlt.
3. Ein Tester, der das Ergebnis seiner eigenen Probe ändern kann, hat keinen
   Test gebaut.
4. Jeder Bericht nennt, **was nicht** geprüft wurde. Ein Bericht ohne diese
   Angabe ist unvollständig, nicht knapp.
