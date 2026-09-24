/**
 * Update-Vertrag: gemeinsame Typen und Regeln für CLI und App.
 *
 * PROPAKT aktualisiert sich git-basiert über `origin/main`: Der Check holt
 * den Stand der Fernquelle (git fetch) und vergleicht die lokale Commit-Hash
 * mit `origin/main`. Liegt die Fernquelle voraus, gibt es ein Update.
 *
 * Die Ausführung (fetch/pull/installieren) bleibt bewusst außerhalb des
 * Kerns – sie braucht Dateisystem/Prozesse und unterscheidet sich zwischen
 * CLI und Rust-Backend. Dieser Modul definiert nur den Vertrag.
 */

/** Ergebnis eines Update-Checks (Feldnamen snake_case wie im Rust-Spiegel). */
export interface UpdateCheck {
  /** Fernquelle erreichbar und Commit gelesen? */
  erreichbar: boolean;
  /** Lokaler HEAD-Hash (kurz). */
  lokal: string;
  /** Hash von origin/main (kurz); leer, wenn nicht erreichbar. */
  fern: string;
  /** true, wenn fern voraus ist (Commit-Kette lokal..fern nicht leer). */
  update_verfuegbar: boolean;
  /** Kurze Fehlermeldung, wenn der Check scheiterte. */
  fehler?: string;
}

/** Kürzt einen Commit-Hash auf 12 Zeichen (Anzeige-Form). */
export function hashKurz(hash: string): string {
  return hash.slice(0, 12);
}

/**
 * Ist die Fernquelle voraus? Vergleich über die Commit-Kette: `git
 * rev-list lokal..fern` nicht leer ⇔ fern enthält Commits, die lokal fehlen.
 * Gleichstand (kein Update) auch, wenn lokal voraus ist.
 */
export function updateVerfuegbar(revListeLokalBisFern: string[]): boolean {
  return revListeLokalBisFern.length > 0;
}
