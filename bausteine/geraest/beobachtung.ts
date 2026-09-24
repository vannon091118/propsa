/**
 * Gerüst: Beobachtung (Position 2, Orchestrierung).
 *
 * Muster: `bausteine/muster/03-beobachtung.md`
 * Vertrag: `bausteine/vertrage/03-beobachtung.contract.json`
 *
 * **Dieses Modul ist leer und weiss es.** Die sieben Ereignistypen stehen in
 * `EREIGNIS_TYPEN` (`@propakt/core`); die Zuordnungstabelle, die fremde
 * Bezeichner darauf abbildet, ist leer. Fail-open: ein Fehler darf den
 * beobachteten Prozess nie blockieren.
 *
 * Was bereits existiert: `tauri-app/src-tauri/src/live_zyklus.rs` ist ein
 * Beobachter – aber ein geschlossener. Quelle und Speicher sind PROPAKT selbst.
 * Der Fall, für den dieses Muster eigentlich gedacht ist, ist ein Zustand
 * *ausserhalb* des eigenen Prozesses. Den gibt es hier nicht.
 */
import type { Vertrag } from '@propakt/core';

/** Der Baustein und das, was er nach aussen zusagt. */
export const VERTRAG: Vertrag = {
  name: 'Beobachtung',
  position: 2,
  zugesagt: [
    'Rohereignisse und Ableitungen liegen in getrennten Speichern.',
    'Ein Cursor ist je Quelle genau einmal in Gebrauch.',
    'Ein Sprung in der Ereignisnummer ist nie unbemerkt.',
  ],
  nicht_zugesagt: [
    'Kein Eingriff. Abgeleitetes Wissen wird nie zur Autorität.',
    'Keine Vollständigkeit über Quellen: es liest die aufgeführten, nicht alle.',
  ],
  regeln: [],
};
