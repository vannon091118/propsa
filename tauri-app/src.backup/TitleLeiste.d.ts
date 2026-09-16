type Props = {
    /** Im Browser-Vorschau-Mock ohne Tauri wird nur das Layout gezeigt. */
    vorschau: boolean;
};
/**
 * Eigene Titelzeile für das rahmenlose Fenster (`decorations: false`).
 *
 * Die ganze Leiste ist Drag-Region; die drei Kniffe (Minimieren, Maximieren,
 * Schließen) liegen rechts und sind von der Drag-Region ausgenommen
 * (`data-tauri-drag-exclude` ist dafür nicht nötig, da sie eigene
 * Klick-Handler haben und die Drag-Region nur als `div` dahinter liegt).
 */
export declare function TitleLeiste({ vorschau }: Props): import("react").JSX.Element;
export {};
