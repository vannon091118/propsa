"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASIS_EINSTELLUNGEN = exports.STANDARD_AUSSCHLUESSE = void 0;
/**
 * Datentypen der Oberfläche.
 *
 * Die Feldnamen der Backend-Typen sind bewusst snake_case, weil sie 1:1 den
 * Rust-Structs in `src-tauri/src/scan.rs` und `export.rs` entsprechen.
 */
const core_1 = require("@propsa/core");
Object.defineProperty(exports, "STANDARD_AUSSCHLUESSE", { enumerable: true, get: function () { return core_1.STANDARD_AUSSCHLUESSE; } });
/** Startwerte: vollständiger Scan (keine Limits gesetzt). */
exports.BASIS_EINSTELLUNGEN = {
    pfad: "",
    maxDateien: null,
    maxZeilen: null,
    includeMuster: "",
    excludeMuster: core_1.STANDARD_AUSSCHLUESSE,
    delta: false,
};
