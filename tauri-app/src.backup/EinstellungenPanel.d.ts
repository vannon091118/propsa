import { type ScanEinstellungen } from "./typen";
type Props = {
    einstellungen: ScanEinstellungen;
    laedt: boolean;
    onAendern: (teil: Partial<ScanEinstellungen>) => void;
    onPfadWaehlen: () => void;
    onScan: () => void;
};
/** Linkes Panel: Pfadwahl, Guardrail-Limits und Filter. */
export declare function EinstellungenPanel({ einstellungen, laedt, onAendern, onPfadWaehlen, onScan, }: Props): import("react").JSX.Element;
export {};
