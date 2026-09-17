/**
 * Zwischenspeicher-Vertrag: gemeinsame Typen und Regeln für den Scan-Cache.
 *
 * Idee: Bevor Dateien gelesen werden, wird eine **Baum-Signatur** gebildet –
 * relativer Pfad, Größe und Änderungszeit je Datei. Stimmt sie mit dem
 * letzten Lauf derselben Scan-Konfiguration überein, darf das gespeicherte
 * Ergebnis wiederverwendet werden, ohne den Inhalt erneut zu lesen.
 *
 * Dieses Modul ist bewusst **pur** (kein `fs`, keine Prozesse), damit CLI und
 * Frontend denselben Vertrag importieren können. Die Umsetzungen liegen in
 * `src/zwischenspeicher.ts` (CLI) und `tauri-app/src-tauri/src/
 * zwischenspeicher.rs` (App) und bilden dieselben Regeln nach – der Abgleich
 * von Version und Schema läuft über `npm run pruefen`.
 */

/** Eine Datei des Baums, wie der Scanner sie **vor** dem Lesen kennt. */
export interface BaumEintrag {
  relativerPfad: string;
  /** Größe in Bytes. */
  groesse: number;
  /** Änderungszeit in Millisekunden (Epoch). */
  mtime: number;
}

/** Version des Cache-Formats; eine Erhöhung erzwingt das Neu-Schreiben. */
export const ZWISCHENSPEICHER_VERSION = 1;

/** Kennzeichnet gültige Cache-Dateien im JSON. */
export const ZWISCHENSPEICHER_SCHEMA = 'propsa-zwischenspeicher';

/** Gespeicherter Lauf: Signatur plus Ergebnis. */
export interface CacheEintrag<T> {
  schema: string;
  version: number;
  /** Zeitstempel des gespeicherten Laufs (ISO). */
  zeitstempel: string;
  signatur: BaumEintrag[];
  ergebnis: T;
}

/** Baum-Signatur normalisieren: nach Pfad sortiert, originál unangetastet. */
export function baumSignatur(eintraege: BaumEintrag[]): BaumEintrag[] {
  return [...eintraege].sort((a, b) =>
    a.relativerPfad < b.relativerPfad
      ? -1
      : a.relativerPfad > b.relativerPfad
        ? 1
        : 0
  );
}

/** Zwei Signaturen deckungsgleich? Reihenfolge spielt keine Rolle. */
export function gleicheSignatur(a: BaumEintrag[], b: BaumEintrag[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const links = baumSignatur(a);
  const rechts = baumSignatur(b);
  return links.every(
    (eintrag, index) =>
      eintrag.relativerPfad === rechts[index].relativerPfad &&
      eintrag.groesse === rechts[index].groesse &&
      eintrag.mtime === rechts[index].mtime
  );
}

/** Struktur-Prüfung: sieht `wert` wie ein Cache-Eintrag aus? */
export function istCacheEintrag(
  wert: unknown
): wert is CacheEintrag<unknown> {
  if (typeof wert !== 'object' || wert === null) {
    return false;
  }
  const eintrag = wert as Record<string, unknown>;
  return (
    eintrag.schema === ZWISCHENSPEICHER_SCHEMA &&
    typeof eintrag.version === 'number' &&
    typeof eintrag.zeitstempel === 'string' &&
    Array.isArray(eintrag.signatur) &&
    eintrag.signatur.every(
      (kandidat) =>
        typeof kandidat === 'object' &&
        kandidat !== null &&
        typeof (kandidat as BaumEintrag).relativerPfad === 'string' &&
        typeof (kandidat as BaumEintrag).groesse === 'number' &&
        typeof (kandidat as BaumEintrag).mtime === 'number'
    ) &&
    eintrag.ergebnis !== undefined &&
    eintrag.ergebnis !== null
  );
}

/**
 * Cache-Treffer prüfen: gültiger Eintrag, aktuelle Version, deckungsgleiche
 * Signatur. Jeder Zweifel kehrt `null` zurück – ein zweifelhafter Eintrag
 * wird nie als „unverändert“ verkauft (Fail Loud, Never Truncate Silent).
 *
 * `istGueltig` prüft das gespeicherte Ergebnis selbst (z. B. dessen Felder);
 * ohne sie zählt nur Struktur und Signatur.
 */
export function cacheTreffer<T>(
  geladen: unknown,
  aktuell: BaumEintrag[],
  istGueltig?: (kandidat: unknown) => boolean
): T | null {
  if (!istCacheEintrag(geladen)) {
    return null;
  }
  if (geladen.version !== ZWISCHENSPEICHER_VERSION) {
    return null;
  }
  if (istGueltig && !istGueltig(geladen.ergebnis)) {
    return null;
  }
  if (!gleicheSignatur(geladen.signatur, aktuell)) {
    return null;
  }
  return geladen.ergebnis as T;
}
