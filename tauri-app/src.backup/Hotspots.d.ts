import type { ScanErgebnis } from "./typen";
type Props = {
    ergebnis: ScanErgebnis;
};
/**
 * Die größten Dateien als Rangliste.
 *
 * Pendant zu den Hotspots des CLI-Dashboards – ein Blick, um Kandidaten für
 * einen Schnitt zu finden, ohne die Tabelle zu durchsuchen.
 */
export declare function Hotspots({ ergebnis }: Props): import("react").JSX.Element | null;
export {};
