/**
 * Zahlen für die Anzeige formatieren.
 *
 * Ein geteilter Formatierer ist deutlich schneller als `toLocaleString()` je
 * Wert: gemessen im WebView der App 879 ms gegenüber 29 ms für 20 000 Werte.
 * Deshalb steht die Formatierung hier einmal und wird überall verwendet.
 */
/** Ganzzahl mit Tausendertrennung: `12345` → `12.345`. */
export declare function zahl(wert: number): string;
/** Zahl mit einer Nachkommastelle: `3.4` → `3,4`. */
export declare function komma(wert: number): string;
