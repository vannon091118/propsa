import type { Fortschritt, ScanEinstellungen, ScanErgebnis } from "./typen";
import type { UpdateCheck } from "@propsa/core";
import "./scan_metrics";
/** Ordner-Dialog; liefert `null` bei Abbruch. */
export declare function ordnerWaehlen(titel: string): Promise<string | null>;
/**
 * Startet einen Scan und meldet den Fortschritt über `beiFortschritt`.
 *
 * Das Backend sendet `scan-fortschritt`-Ereignisse; nach dem Scan wird der
 * Zuhörer wieder abgemeldet.
 */
export declare function scanStarten(einstellungen: ScanEinstellungen, beiFortschritt: (fortschritt: Fortschritt) => void): Promise<ScanErgebnis>;
/**
 * Prüft auf Updates über origin/main (Rust: `update_check`).
 *
 * In der Browser-Vorschau (Mock) immer „alles aktuell“.
 */
export declare function updatePruefen(): Promise<UpdateCheck>;
/**
 * Übernimmt Updates (fast-forward + Neuinstallation) mit Fortschritts-
 * rückmeldung über `update-fortschritt` (Rust: `update_ausfuehren`).
 */
export declare function updateStarten(beiFortschritt: (text: string) => void): Promise<UpdateCheck>;
/**
 * Schreibt das Kontextpaket in einen Ordner.
 *
 * Liefert die geschriebenen Dateinamen (relativ zum Ordner).
 */
export declare function paketSchreiben(ergebnis: ScanErgebnis, ordner: string): Promise<string[]>;
