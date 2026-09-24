/**
 * Gerüst: Übersicht (Position 0, Präsentation).
 *
 * Muster: `bausteine/muster/06-uebersicht.md`
 * Vertrag: `bausteine/vertrage/06-uebersicht.contract.json`
 *
 * **Dieses Modul ist leer und weiss es.** Von den drei Teilen existiert einer
 * in PROPAKT: die Darstellung (`ErgebnisTabelle.tsx`, `StatistikKarten.tsx`,
 * `Hotspots.tsx`, handgeschriebenes SVG und CSS, keine fremde Bibliothek).
 *
 * Die Leser-Liste wäre Vorbereitung auf etwas, das nicht existiert: PROPAKT
 * liest genau eine Quelle, das angegebene Verzeichnis. Ein Leser-Register für
 * Fremdformate jetzt anzulegen hiesse, eine Wartungsverpflichtung ohne
 * Nutzen zu erzeugen.
 *
 * Über die Form des Musters hinaus wird hier nichts übernommen. Die Vorlage zu
 * diesem Muster unterstützte über 30 Fremdformate – das ist kein Feature,
 * sondern eine offene Wartungsverpflichtung mit 30 Einträgen.
 */
import type { Vertrag } from '@propakt/core';

/** Der Baustein und das, was er nach aussen zusagt. */
export const VERTRAG: Vertrag = {
  name: 'Übersicht',
  position: 0,
  zugesagt: [
    'Ein Leser je Plattform, ausdrücklich kein Sammel-Leser.',
    'Ein Leser, der nichts findet, meldet das – das ist ein Ergebnis, kein Fehler.',
    'Doppelte Datensätze werden verknüpft, nie überschrieben.',
  ],
  nicht_zugesagt: [
    'Keine Aussage über Verhalten. Ein fehlerhaftes Protokoll wird hier sauber dargestellt.',
    'Keine Schreibfähigkeit: Übersicht liest und ändert nichts.',
  ],
  regeln: [],
};
