import * as fs from 'fs';

/**
 * Dateizugriff des Scanners: Inhalte lesen und Zeilen zählen.
 *
 * Die Regeln entsprechen `datei_lesen` und `str::lines()` in
 * `tauri-app/src-tauri/src/filter.rs`, damit CLI und GUI dieselben Dateien
 * einbeziehen und dieselben Zahlen nennen.
 */

/**
 * Liest eine Datei; `null` bedeutet „übersprungen“.
 *
 * Leere Dateien und Dateien, deren Inhalt kein gültiges UTF-8 ist
 * (Binärdateien), gelten als übersprungen. Die Prüfung erfolgt über einen
 * Rückweg-Vergleich, weil Node sonst stillschweigend Ersatzzeichen einfügen
 * würde. `zeichen` sind Bytes, nicht sichtbare Zeichen.
 */
export function dateiLesen(absoluterPfad: string): { inhalt: string; zeichen: number } | null {
  let puffer: Buffer;
  try {
    puffer = fs.readFileSync(absoluterPfad);
  } catch {
    return null;
  }
  if (puffer.length === 0) {
    return null;
  }
  const inhalt = puffer.toString('utf8');
  if (!Buffer.from(inhalt, 'utf8').equals(puffer)) {
    return null;
  }
  return { inhalt, zeichen: puffer.length };
}

/** Zeilen wie Rust `str::lines()`: ein abschließender Umbruch zählt nicht. */
export function zeilenZaehlen(inhalt: string): number {
  const teile = inhalt.split('\n');
  if (teile[teile.length - 1] === '') {
    teile.pop();
  }
  return teile.length;
}
