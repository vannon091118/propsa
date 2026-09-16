/**
 * Vorschau-Mock für den Browser (`npm run dev`).
 *
 * Nur aktiv, wenn die Seite außerhalb von Tauri läuft **und** im
 * Entwicklungsmodus gebaut wurde. In der gebauten App ist der Mock
 * wirkungslos, damit dort niemals erfundene Daten erscheinen.
 */
import type { Fortschritt, ScanEinstellungen, ScanErgebnis } from "./typen";
/** Läuft die Seite außerhalb von Tauri (Browser-Vorschau)? */
export declare function istVorschauMock(): boolean;
/** Simuliert einen Scan samt Fortschrittsmeldungen. */
export declare function mockScan(einstellungen: ScanEinstellungen, beiFortschritt: (fortschritt: Fortschritt) => void): Promise<ScanErgebnis>;
/** Simuliert das Schreiben des Pakets (kein Dateisystem). */
export declare function mockPaketSchreiben(ordner: string): Promise<string[]>;
/** Simulierter Dialog für die Browser-Vorschau. */
export declare const mockOrdnerWaehlen: () => Promise<string | null>;
