/**
 * Zählt einen Zahlenwert weich hoch (Indikator-Animation).
 *
 * Bei `prefers-reduced-motion: reduce` wird der Zielwert direkt gesetzt.
 */
export declare function useZaehler(ziel: number, dauer?: number): number;
/** Laufzeit in Sekunden, solange `aktiv` gilt (Timer-Indikator). */
export declare function useLaufzeit(aktiv: boolean): number;
/** Laufzeit als kurzer Text, z. B. „3,4 s“ oder „1:05 min“. */
export declare function dauerText(sekunden: number): string;
