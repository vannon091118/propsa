"use strict";
/**
 * Zahlen für die Anzeige formatieren.
 *
 * Ein geteilter Formatierer ist deutlich schneller als `toLocaleString()` je
 * Wert: gemessen im WebView der App 879 ms gegenüber 29 ms für 20 000 Werte.
 * Deshalb steht die Formatierung hier einmal und wird überall verwendet.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.zahl = zahl;
exports.komma = komma;
const GANZ = new Intl.NumberFormat("de-DE");
const KOMMA = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});
/** Ganzzahl mit Tausendertrennung: `12345` → `12.345`. */
function zahl(wert) {
    return GANZ.format(Math.round(wert));
}
/** Zahl mit einer Nachkommastelle: `3.4` → `3,4`. */
function komma(wert) {
    return KOMMA.format(wert);
}
