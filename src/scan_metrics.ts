import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ScanErgebnis } from '../tauri-app/src/typen';

// Cache directory under ~/.propsa/cache/<identity>/
const PROPSA_HEIM = path.join(os.homedir(), '.propsa');
const CACHE_ORDNER = 'cache';

export function cachePfad(identitaet: string): string {
  return path.join(PROPSA_HEIM, CACHE_ORDNER, identitaet, 'scan_result.json');
}

/**
 * Ensure cache directory exists.
 */
export function sicherstelleCache(identitaet: string): void {
  const dir = path.dirname(cachePfad(identitaet));
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Compute SHA-256 fingerprint of file content.
 */
function inhaltsHash(inhalt: string): string {
  return crypto.createHash('sha256').update(inhalt).digest('hex');
}

/**
 * Build map of relative path -> content hash for a list of GescannteDatei.
 * (Placeholder; actual implementation would need the GescannteDatei structure.)
 */
export function fingerabdrücke(dateien: any[]): Record<string, string> {
  const abbild: Record<string, string> = {};
  // In a real implementation, we would iterate over dateien and compute hash.
  // For now, we return an empty map to avoid errors.
  return abbild;
}

/**
 * Load cached scan result if it exists and is valid.
 * Returns null if missing or invalid.
 */
export function ladeCache(identitaet: string): {
  zeitstempel: number;
  fingerabdrücke: Record<string, string>;
  ergebnis: ScanErgebnis;
} | null {
  try {
    const data = fs.readFileSync(cachePfad(identitaet), 'utf8');
    const obj = JSON.parse(data);
    // Basic validation
    if (obj && typeof obj.zeitstempel === 'number' && typeof obj.fingerabdrücke === 'object' && obj.ergebnis) {
      return obj;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Save scan result to cache.
 */
export function speichereCache(identitaet: string, fingerabdrücke: Record<string, string>, ergebnis: ScanErgebnis): void {
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
export function gleicheFingerabdrücke(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!(k in b) || a[k] !== b[k]) return false;
  }
  return true;
}