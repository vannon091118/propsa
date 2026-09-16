/**
 * Farbliche Indikatoren je Sprache (für Chips und Verteilungsbalken).
 *
 * Die Sprachnamen stammen aus `src-tauri/src/sprache.rs` und
 * `src/scanner.ts`, damit beide Oberflächen dieselben Namen zeigen.
 */
export type SprachStil = {
    farbe: string;
    kurz: string;
};
/** Liefert Farbe und Kürzel zu einem Sprachnamen. */
export declare function stilFuer(sprache: string): SprachStil;
