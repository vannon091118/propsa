/**
 * Gerüst: Laufzeit (Position 2, Orchestrierung).
 *
 * Muster: `bausteine/muster/05-laufzeit.md`
 * Vertrag: `bausteine/vertrage/05-laufzeit.contract.json`
 *
 * **Dieses Modul ist leer und weiss es.** Von den drei Teilen des Musters
 * existiert einer in PROPAKT wirklich: der unveränderliche Ereignisstrom
 * (`tauri-app/src-tauri/src/live_store.rs`, SQLite im WAL-Modus). Was fehlt,
 * ist die Ableitung. Sie ist `STUB`, und zwar bewusst – ein selbstlernendes
 * System ohne gemessenen Nutzen wäre eine Zusage ohne Beleg.
 *
 * Der dritte Teil – die Wiedergabe derselben Historie unter zwei Regeln –
 * funktioniert teilweise: `get_history_metrics` liefert die Kette, und
 * `HistoryGraph.tsx` vergleicht. Aber es gibt nur eine Regel. Die zweite
 * Sicht ist ungebaut, und „es geht“ ist kein Beweis dafür, dass es unter einer
 * anderen Regel auch geht.
 */
import type { Vertrag } from '@propakt/core';

/** Der Baustein und das, was er nach aussen zusagt. */
export const VERTRAG: Vertrag = {
  name: 'Laufzeit',
  position: 2,
  zugesagt: [
    'Ein Ereignis wird genau einmal angehängt und danach nie geändert.',
    'Jede Sicht nennt ihre Regelversion.',
    'Die Differenz zweier Sichten ist immer eine Regel-Differenz.',
  ],
  nicht_zugesagt: [
    'Keine Vorhersage. Gelerntes beschreibt, was war.',
    'Kein Zurückrollen: eine geänderte Regel erzeugt eine neue Sicht, keine neue Wirklichkeit.',
  ],
  regeln: [],
};
