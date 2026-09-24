/**
 * Gerüst: Prüfung (Position 2, Orchestrierung).
 *
 * Muster: `bausteine/muster/02-pruefung.md`
 * Vertrag: `bausteine/vertrage/02-pruefung.contract.json`
 *
 * **Dieses Modul ist leer und weiss es.** Die Rollen sind beschrieben, keine
 * läuft. Fail-closed: nur ein vollständig bestätigtes Probe-Set gibt frei.
 *
 * Was bereits existiert: `tauri-app/src-tauri/src/kritik_regeln.rs` und
 * `packages/core/src/paketKritik.ts` sind **Erzeuger**, keine Prüfer. Die
 * Prüfschicht wäre eine Ebene darüber – und sie ist weder gebaut noch für die
 * nächste Ausbaustufe eingeplant.
 */
import type { Vertrag } from '@propakt/core';

/** Der Baustein und das, was er nach aussen zusagt. */
export const VERTRAG: Vertrag = {
  name: 'Prüfung',
  position: 2,
  zugesagt: [
    'Genau ein Gate entscheidet über Freigabe oder Abweisung.',
    'Eine Teilbestätigung gibt nicht frei.',
    'Der Erstprüfer kann sein eigenes Ergebnis nicht überschreiben.',
  ],
  nicht_zugesagt: [
    'Formal gültig heisst nicht semantisch richtig. Formal ist Form, nicht Wahrheit.',
    'Keine Qualitätsbewertung durch den Validator.',
  ],
  regeln: [],
};
