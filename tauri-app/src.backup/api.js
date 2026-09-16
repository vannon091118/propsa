"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordnerWaehlen = ordnerWaehlen;
exports.scanStarten = scanStarten;
exports.updatePruefen = updatePruefen;
exports.updateStarten = updateStarten;
exports.paketSchreiben = paketSchreiben;
/**
 * Zugriff auf die Tauri-Kommandos.
 *
 * Wichtig: Tauri erwartet Argumentnamen in camelCase (Rust-Parameter
 * `max_dateien` ⇒ `maxDateien`). Felder *innerhalb* übergebener Structs
 * behalten dagegen ihre Rust-Namen.
 */
const core_1 = require("@tauri-apps/api/core");
const event_1 = require("@tauri-apps/api/event");
const plugin_dialog_1 = require("@tauri-apps/plugin-dialog");
const devMock_1 = require("./devMock");
require("./scan_metrics"); // Import to ensure module is included; functions can be used if needed.
/** Komma-getrennte Muster in eine Liste umwandeln (analog zur CLI). */
function musterListe(text) {
    return text
        .split(",")
        .map((muster) => muster.trim())
        .filter((muster) => muster.length > 0);
}
/** Ordner-Dialog; liefert `null` bei Abbruch. */
async function ordnerWaehlen(titel) {
    if ((0, devMock_1.istVorschauMock)()) {
        return (0, devMock_1.mockOrdnerWaehlen)();
    }
    const gewaehlt = await (0, plugin_dialog_1.open)({ directory: true, multiple: false, title: titel });
    return typeof gewaehlt === "string" ? gewaehlt : null;
}
/**
 * Startet einen Scan und meldet den Fortschritt über `beiFortschritt`.
 *
 * Das Backend sendet `scan-fortschritt`-Ereignisse; nach dem Scan wird der
 * Zuhörer wieder abgemeldet.
 */
async function scanStarten(einstellungen, beiFortschritt) {
    if ((0, devMock_1.istVorschauMock)()) {
        return (0, devMock_1.mockScan)(einstellungen, beiFortschritt);
    }
    // TODO: Implement scan-metrics cache.
    // Idea: Before invoking the scan, compute a cheap fingerprint of the file tree
    // (e.g., list of relative paths and file sizes) and compare with cached version.
    // If unchanged, return cached ScanErgebnis from cache.
    // This requires a backend command to provide file metadata, or we could
    // replicate the scanning logic in the frontend (which would duplicate work).
    // For now, we always invoke the scan.
    const abmelden = await (0, event_1.listen)("scan-fortschritt", (ereignis) => {
        beiFortschritt(ereignis.payload);
    });
    try {
        return await (0, core_1.invoke)("scan", {
            pfad: einstellungen.pfad,
            delta: einstellungen.delta,
            maxDateien: einstellungen.maxDateien,
            maxZeilen: einstellungen.maxZeilen,
            includeMuster: musterListe(einstellungen.includeMuster),
            excludeMuster: musterListe(einstellungen.excludeMuster),
        });
    }
    finally {
        abmelden();
    }
}
/**
 * Prüft auf Updates über origin/main (Rust: `update_check`).
 *
 * In der Browser-Vorschau (Mock) immer „alles aktuell“.
 */
async function updatePruefen() {
    if ((0, devMock_1.istVorschauMock)()) {
        return {
            erreichbar: true,
            lokal: "vorschau",
            fern: "vorschau",
            update_verfuegbar: false,
            fehler: undefined,
        };
    }
    return (0, core_1.invoke)("update_check");
}
/**
 * Übernimmt Updates (fast-forward + Neuinstallation) mit Fortschritts-
 * rückmeldung über `update-fortschritt` (Rust: `update_ausfuehren`).
 */
async function updateStarten(beiFortschritt) {
    if ((0, devMock_1.istVorschauMock)()) {
        beiFortschritt("Vorschau: nichts zu aktualisieren.");
        return {
            erreichbar: true,
            lokal: "vorschau",
            fern: "vorschau",
            update_verfuegbar: false,
            fehler: undefined,
        };
    }
    const abmelden = await (0, event_1.listen)("update-fortschritt", (ereignis) => beiFortschritt(ereignis.payload.text));
    try {
        return await (0, core_1.invoke)("update_ausfuehren");
    }
    finally {
        abmelden();
    }
}
/**
 * Schreibt das Kontextpaket in einen Ordner.
 *
 * Liefert die geschriebenen Dateinamen (relativ zum Ordner).
 */
async function paketSchreiben(ergebnis, ordner) {
    if ((0, devMock_1.istVorschauMock)()) {
        return (0, devMock_1.mockPaketSchreiben)(ordner);
    }
    return (0, core_1.invoke)("paket_schreiben", { scan: ergebnis, ordner });
}
