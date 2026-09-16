import type { ScanErgebnis } from "./typen";
type Props = {
    ergebnis: ScanErgebnis;
};
/**
 * Hinweise, wenn der Kontext unvollständig ist.
 *
 * Mit Fail Loud gibt es keinen Abbruchgrund mehr: Ein Limit bricht den Scan
 * ab und es gibt kein Ergebnis. Gemeldet werden nur noch übersprungene
 * Dateien und ein Größenhinweis.
 */
export declare function ScanHinweise({ ergebnis }: Props): import("react").JSX.Element | null;
export {};
