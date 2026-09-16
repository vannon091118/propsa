"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cachePfad = cachePfad;
exports.sicherstelleCache = sicherstelleCache;
exports.fingerabdrücke = fingerabdrücke;
exports.ladeCache = ladeCache;
exports.speichereCache = speichereCache;
exports.gleicheFingerabdrücke = gleicheFingerabdrücke;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
// Cache directory under ~/.propsa/cache/<identity>/
const PROPSA_HEIM = path.join(os.homedir(), '.propsa');
const CACHE_ORDNER = 'cache';
function cachePfad(identitaet) {
    return path.join(PROPSA_HEIM, CACHE_ORDNER, identitaet, 'scan_result.json');
}
/**
 * Ensure cache directory exists.
 */
function sicherstelleCache(identitaet) {
    const dir = path.dirname(cachePfad(identitaet));
    fs.mkdirSync(dir, { recursive: true });
}
/**
 * Compute SHA-256 fingerprint of file content.
 */
function inhaltsHash(inhalt) {
    return crypto.createHash('sha256').update(inhalt).digest('hex');
}
/**
 * Build map of relative path -> content hash for a list of GescannteDatei.
 */
function fingerabdrücke(dateien) {
    const abbild = {};
    for (const datei of dateien) {
        abbild[datei.relativerPfad] = inhaltsHash(datei.inhalt);
    }
    return abbild;
}
/**
 * Load cached scan result if it exists and is valid.
 * Returns null if missing or invalid.
 */
function ladeCache(identitaet) {
    try {
        const data = fs.readFileSync(cachePfad(identitaet), 'utf8');
        const obj = JSON.parse(data);
        // Basic validation
        if (obj && typeof obj.zeitstempel === 'number' && typeof obj.fingerabdrücke === 'object' && obj.ergebnis) {
            return obj;
        }
    }
    catch {
        // ignore
    }
    return null;
}
/**
 * Save scan result to cache.
 */
function speichereCache(identitaet, fingerabdrücke, ergebnis) {
    sicherstelleCache(identitaet);
    const data = {
        zeitstempel: Date.now(),
        fingerabdrücke,
        ergebnis,
    };
    fs.writeFileSync(cachePfad(identitaet), JSON.stringify(data, null, 2), 'utf8');
}
/**
 * Compare two fingerprint maps; returns true if identical.
 */
function gleicheFingerabdrücke(a, b) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
        return false;
    for (const k of keysA) {
        if (!(k in b) || a[k] !== b[k])
            return false;
    }
    return true;
}
