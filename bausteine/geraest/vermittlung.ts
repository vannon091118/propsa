/**
 * Gerüst: Vermittlung (Position 3, Infrastruktur).
 *
 * Muster: `bausteine/muster/01-vermittlung.md`
 * Vertrag: `bausteine/vertrage/01-vermittlung.contract.json`
 *
 * **Dieses Modul ist leer und weiss es.** Es hält die Form fest, damit der
 * Baustein später ohne Umplanung implementiert werden kann. Jede Funktion
 * hier wäre eine Zusage ohne Beleg – der Vertrag führt diesen Abschnitt als
 * `STUB`, und `STUB` bedeutet: die Entscheidung, es nicht zu bauen, ist
 * getroffen.
 *
 * Was bereits existiert: `tauri-app/src/llm.ts` verdrahtet drei Anbieter
 * fest. Dieser Baustein würde sie ersetzen, nicht ergänzen.
 */
import type { Vertrag } from '@propakt/core';

/** Der Baustein und das, was er nach aussen zusagt. */
export const VERTRAG: Vertrag = {
  name: 'Vermittlung',
  position: 3,
  zugesagt: [
    'Jede Antwort trägt ein Deployment und eine Quelle.',
    'Ein Schlüssel ist nie gleichzeitig bereit und in Abkühlung.',
    'Cooldowns rechnen über eine monotone Uhr.',
  ],
  nicht_zugesagt: [
    'Kein routing des Inhalts – die Anfrage wird unverändert weitergereicht.',
    'Keine automatische Routing-Politik. Der Scanner darf messen, aber nicht entscheiden.',
  ],
  regeln: [],
};
