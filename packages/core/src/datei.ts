/**
 * Der Datei-Typ, den alle Kern-Module konsumieren.
 *
 * Vor dem Core-Auszug wurde hierfür `GescannteDatei` aus der CLI importiert;
 * im Kern definiert das Paket den Typ selbst, und die CLI (`src/scanner.ts`)
 * hält einen strukturgleichen Typ. TypeScript matcht strukturell, deshalb
 * sind beide ohne Umweg kompatibel.
 */

/** Eine gescannte Datei, wie Kern und CLI sie weiterreichen. */
export interface KontextDatei {
  relativerPfad: string;
  sprache: string;
  zeilen: number;
  zeichen: number;
  inhalt: string;
}
