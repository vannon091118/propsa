import type { ScanZustand } from "./typen";
type Props = {
    zustand: ScanZustand;
    laeuft: boolean;
    meldung?: string;
};
/** Kopfbereich unter der Titelzeile: Logo, Produktname und Statusleiste. */
export declare function KopfBereich({ zustand, laeuft, meldung }: Props): import("react").JSX.Element;
export {};
