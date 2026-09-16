import type { ScanErgebnis } from "./typen";
type Props = {
    ergebnis: ScanErgebnis;
};
/** Dateiliste mit Sprach-, Größen- und Hotspot-Indikatoren. */
declare function ErgebnisTabelleBasis({ ergebnis }: Props): import("react").JSX.Element;
/**
 * Bei jedem Fortschritts-Ereignis rendert die Oberfläche neu; die Tabelle
 * bleibt davon unberührt, weil sich ihr Ergebnis nicht ändert.
 */
export declare const ErgebnisTabelle: import("react").MemoExoticComponent<typeof ErgebnisTabelleBasis>;
export {};
