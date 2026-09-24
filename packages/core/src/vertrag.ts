/**
 * Baustein-Vertrag: gemeinsame Typen und Kataloge der sieben Bausteine.
 *
 * Die sieben Bausteine sind in `bausteine/muster/` als Muster beschrieben und
 * in `bausteine/vertrage/` als Komponentenverträge festgeschrieben. Dieses
 * Modul liefert die **Form**, die beide Sprachen gemeinsam brauchen – keine
 * Logik. Bausteine geben Verträge heraus, keinen Code.
 *
 * Wie bei `zwischenspeicher.ts` und `live.ts` ist dieses Modul pur: kein `fs`,
 * keine Prozesse. Es wird in `tauri-app/src-tauri/src/vertrag.rs` gespiegelt,
 * und `npm run pruefen` vergleicht die drei Kataloge (Regel 9).
 */

/** Schichtlage. Übergaben laufen ausschließlich nach unten. */
export type Position = 0 | 1 | 2 | 3;

/** Die sieben Punkte, die eine Regel tragen muss, um als umgesetzt zu gelten. */
export const GATE_PUNKTE: Record<string, string> = {
  POSITIVE: 'der Fall, in dem die Regel gilt',
  FORBIDDEN: 'der Fall, der abgewiesen wird',
  FALLBACK: 'was bei Nichterfüllung passiert',
  ERROR: 'maschinenlesbarer Fehlerstatus',
  TRACE: 'Herkunfts- und Provenienzkette',
  REPLAY: 'Replay-Verhalten',
  INVARIANT: 'testbare Zusicherung',
};

/**
 * Die vier Zustandswerte eines Vertragsabschnitts.
 *
 * `STUB` und `NOT_VERIFIED` sind nicht dasselbe: ein `STUB` bedeutet, dass die
 * Entscheidung **nicht zu bauen** getroffen wurde – er ist eine Aufgabe. Ein
 * `NOT_VERIFIED` bedeutet, dass **gebaut** wurde und niemand geprüft hat – er
 * ist ein offener Prüfposten. Beides ist ehrlich, aber es führt zu
 * verschiedenen Entscheidungen.
 */
export const STATUS_WERTE: Record<string, string> = {
  IMPLEMENTED: 'gebaut und durch die sieben Punkte belegt',
  STUB: 'Signatur steht, Logik fehlt – bewusst offen',
  NOT_IMPLEMENTED: 'nicht angefangen',
  NOT_VERIFIED: 'gebaut, aber die Belege fehlen',
};

/**
 * Die sieben Ereignistypen der Beobachtung.
 *
 * Fremde Bezeichner werden über eine Zuordnungstabelle in diese Typen
 * übersetzt. Ein neuer Produzent braucht eine Zeile in der Tabelle, keinen
 * Consumer-Code. Die Rohdaten bleiben dabei unverändert erhalten.
 */
export const EREIGNIS_TYPEN: Record<string, string> = {
  CLAIM: 'eine Aussage mit Herkunft',
  CHALLENGE: 'ein Widerspruch zu einer Aussage',
  LIFECYCLE: 'ein Zustandswechsel eines Bausteins',
  VERDICT: 'das Urteil eines Gates',
  HANDOFF: 'eine Übergabe zwischen zwei Instanzen',
  COMPLETION: 'der Abschluss einer Arbeitseinheit',
  DIAGNOSTIC: 'ein beobachteter Fehler ohne Eingriff',
};

/** Eine Regel im Gate-Schema. Alle sieben Punkte sind Pflicht. */
export interface Regel {
  gate: string;
  POSITIVE: string;
  FORBIDDEN: string;
  FALLBACK: string;
  ERROR: string;
  TRACE: string;
  REPLAY: string;
  INVARIANT: string;
}

/** Ein Baustein und das, was er nach außen zusagt. */
export interface Vertrag {
  name: string;
  position: Position;
  zugesagt: string[];
  /** Der wichtigere Teil: was ausdrücklich nicht zugesagt wird. */
  nicht_zugesagt: string[];
  regeln: Regel[];
}

/** Selbstverifikation eines Vertrags. */
export interface VertragsStatus {
  overall: string;
  sections: Record<string, string>;
  last_verified_against_code: string | null;
  known_gaps: string[];
}

/**
 * Trägt eine Regel alle sieben Punkte?
 *
 * Der Satz ist die Regel: **eine Regel ohne alle sieben Punkte ist nicht
 * implementiert, sondern behauptet.** Damit ist die Frage „ist das jetzt
 * fertig?“ beantwortbar – ja, wenn eine Zusicherung belegt ist, nein, wenn
 * sieben Felder mit Absichtserklärungen gefüllt sind.
 */
export function regelVollstaendig(regel: Regel): boolean {
  return Object.keys(GATE_PUNKTE).every((punkt) => {
    const wert = regel[punkt as keyof Regel];
    return typeof wert === 'string' && wert.trim().length > 0;
  });
}

/** Ein Vertragsabschnitt: `IMPLEMENTED`, `STUB`, `NOT_IMPLEMENTED` oder `NOT_VERIFIED`. */
export function statusBekannt(status: string): boolean {
  return Object.keys(STATUS_WERTE).includes(status);
}
