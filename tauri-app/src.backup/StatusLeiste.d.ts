import type { ScanZustand } from "./typen";
type Props = {
    zustand: ScanZustand;
    /** Zählt die Laufzeit mit (Scan oder Export). */
    laeuft: boolean;
    /** Kurzinfo im Ruhezustand (z. B. „14 Dateien“). */
    meldung?: string;
};
/** Kopfzeilen-Indikator: Zustand, Laufzeit und Kurzinfo. */
export declare function StatusLeiste({ zustand, laeuft, meldung }: Props): import("react").JSX.Element;
export {};
