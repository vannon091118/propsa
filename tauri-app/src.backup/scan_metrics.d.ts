import type { ScanErgebnis } from '../tauri-app/src/typen';
import { GescannteDatei } from '../tauri-app/src/scanner';
export declare function cachePfad(identitaet: string): string;
/**
 * Ensure cache directory exists.
 */
export declare function sicherstelleCache(identitaet: string): void;
/**
 * Build map of relative path -> content hash for a list of GescannteDatei.
 */
export declare function fingerabdrücke(dateien: GescannteDatei[]): Record<string, string>;
/**
 * Load cached scan result if it exists and is valid.
 * Returns null if missing or invalid.
 */
export declare function ladeCache(identitaet: string): {
    zeitstempel: number;
    fingerabdrücke: Record<string, string>;
    ergebnis: ScanErgebnis;
} | null;
/**
 * Save scan result to cache.
 */
export declare function speichereCache(identitaet: string, fingerabdrücke: Record<string, string>, ergebnis: ScanErgebnis): void;
/**
 * Compare two fingerprint maps; returns true if identical.
 */
export declare function gleicheFingerabdrücke(a: Record<string, string>, b: Record<string, string>): boolean;
