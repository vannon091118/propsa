import type { Fortschritt } from "./typen";
type Props = {
    fortschritt: Fortschritt | null;
    sichtbar: boolean;
};
/** Fortschritt des laufenden Scans (bestimmt, sonst unbestimmt animiert). */
export declare function Fortschrittsbalken({ fortschritt, sichtbar }: Props): import("react").JSX.Element | null;
export {};
