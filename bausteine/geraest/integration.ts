/**
 * Gerüst: Integration (Position 3, Infrastruktur).
 *
 * Muster: `bausteine/muster/07-integration.md`
 * Vertrag: `bausteine/vertrage/07-integration.contract.json`
 *
 * **Dieses Modul ist leer und weiss es.** Von den sieben Bausteinen ist
 * dieser der einzige, der `IMPLEMENTED` ist – aber nicht, weil er etwas
 * leistet, sondern weil das, was er zusagt, tatsächlich existiert: ein
 * einheitliches Gate-Schema für alle sieben Verträge, jede Regel mit den
 * sieben Punkten, jeder Vertrag mit Selbstverifikation.
 *
 * Vorher war das nicht so: die Verträge der Vorlage führten uneinheitliche
 * Felder – einer zwei Gate-Felder, die anderen je ein eigenes, anders
 * benanntes. Ein Verbraucher, der zwei Bausteine prüfen wollte, musste für
 * jeden eine andere Struktur lesen.
 *
 * PROPSA hat die Schichtenliste nicht, und braucht sie nicht. Es hat zwei
 * Oberflächen und einen Kern, und diese Lage bestätigt das Muster eher, als
 * dass es ihm folgt.
 */
import type { Vertrag } from '@propsa/core';

/** Der Baustein und das, was er nach aussen zusagt. */
export const VERTRAG: Vertrag = {
  name: 'Integration',
  position: 3,
  zugesagt: [
    'Jede Frage wird an genau einer Stelle beantwortet.',
    'Übergaben laufen nach unten, nie nach oben – ein Zyklus ist ausgeschlossen.',
    'Eine Regel ohne alle sieben Punkte ist nicht implementiert, sondern behauptet.',
  ],
  nicht_zugesagt: [
    'Keine automatische Prüfung der Gates. Das Schema macht Lücken sichtbar, es schliesst sie nicht.',
    'Keine Auflösung von Mehrdeutigkeit. Ein Vertrag, den zwei Leser unterschiedlich auslegen, ist ungültig – und keiner merkt es.',
  ],
  regeln: [],
};
