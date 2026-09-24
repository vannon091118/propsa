/**
 * Gerüst: Prompts (Position 1).
 *
 * Muster: `bausteine/muster/04-prompts.md`
 * Vertrag: `bausteine/vertrage/04-prompts.contract.json`
 *
 * **Dieses Modul ist leer und weiss es.** Der Vertrag beschreibt Dokumente
 * und Übergaben, **keine Programmiersprache** – das Muster hat keinen
 * ausführbaren Teil. Ein Vertrag, der hier eine Sprache nennt, beschreibt
 * etwas, das es nicht gibt. Dieses Modul liefert deshalb nur die Zusage, die
 * eine spätere Umsetzung tragen müsste.
 *
 * Was bereits existiert: nichts Vergleichbares. Kontextpakete liefern Herkunft
 * über Quellen-Domänen, aber keinen Beleg mit Statuswechsel.
 */
import type { Vertrag } from '@propakt/core';

/** Der Baustein und das, was er nach aussen zusagt. */
export const VERTRAG: Vertrag = {
  name: 'Prompts',
  position: 1,
  zugesagt: [
    'Jeder Beleg führt Status und Herkunft.',
    'Eine Aufgabe hat genau ein überprüfbares Ende.',
    'Widerlegt ist ein Ergebnis: der Bestand wächst, er schrumpft nie.',
  ],
  nicht_zugesagt: [
    'Keine Garantie, dass Belege stimmen. Bestätigt heisst: geprüft, nicht: richtig.',
    'Kein Ersatz für die Formulierung der Aufgabe.',
  ],
  regeln: [],
};
