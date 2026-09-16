import type { DeltaInfo } from "./typen";
type Props = {
    info: DeltaInfo;
};
/**
 * Delta-Anzeige: Änderungen zum letzten Lauf derselben Projekt-Identität.
 *
 * Die History (`~/.propsa/history/<identitaet>.jsonl`) führt das Backend;
 * hier wird nur der Vergleich aufbereitet.
 */
export declare function DeltaAnzeige({ info }: Props): import("react").JSX.Element;
export {};
