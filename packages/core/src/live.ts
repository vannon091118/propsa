/**
 * Live-Modus-Vertrag: Anomalie-Arten, Schwellwerte und Texte.
 *
 * Die Kataloge sind die **einzige TypeScript-Quelle**; das Rust-Backend
 * spiegelt sie in `tauri-app/src-tauri/src/live_anomalie.rs` und
 * `npm run pruefen` vergleicht beide Seiten (gleiches Muster wie die
 * Sprach- und Filterkataloge). Werte sind bewusst Strings, damit die
 * bestehende Prüfung beide Kataloge mit derselben Extraktion liest.
 *
 * Umsetzungsplan: `docs/wiki/Live-Modus-Plan.md` (Phase 2).
 */

/** Arten der Anomalie-Erkennung im Live-Zyklus. */
export type AnomalieArt =
  | 'flattern'
  | 'regression'
  | 'pendeln'
  | 'loeschsturm'
  | 'explosion'
  | 'limitbruch'
  | 'differenzen';

/** Schwere je Art: 1 beobachten, 2 auffällig, 3 eingreifen (Widget nach vorn). */
export const ANOMALIE_SCHWERE: Record<AnomalieArt, string> = {
  flattern: '2',
  regression: '2',
  pendeln: '2',
  loeschsturm: '3',
  explosion: '2',
  limitbruch: '3',
  differenzen: '3',
};

/** Deutsche Beschreibung je Art (Widget-Badge und DB-Eintrag). */
export const ANOMALIE_BESCHREIBUNGEN: Record<AnomalieArt, string> = {
  flattern: 'Flattern: Datei wird immer wieder geändert – vermutlich zwei Agenten gegeneinander',
  regression: 'Regression: Inhalt wurde auf einen früheren Stand zurückgerollt',
  pendeln: 'Pendeln: Umfang schwankt ohne Fortschritt – Schleife ohne Konvergenz',
  loeschsturm: 'Löschsturm: viele Dateien gleichzeitig entfernt',
  explosion: 'Explosion: starker Zeilenzuwachs in einem Tick',
  limitbruch: 'Limitbruch: Guardrail des Scans getroffen',
  differenzen: 'Differenzen: zusammengehörige Dateien treten auseinander',
};

/** Schwellwerte der Detektion (Strings, vom Rust-Spiegel geparst). */
export const ANOMALIE_SCHWELLEN: Record<string, string> = {
  // Flattern: so viele Änderungen je Pfad innerhalb des Fensters.
  flattern_aenderungen: '4',
  flattern_fenster: '10',
  // Löschsturm: absolute Dateien oder Anteil am Vortick-Baum (Prozent).
  loeschsturm_dateien: '10',
  loeschsturm_anteil: '20',
  // Explosion: Zeilenzuwachs je Tick (Prozent).
  explosion_anteil: '25',
  // Pendeln: Fenster, Amplitude und tolerierte Netto-Änderung (Prozent).
  pendeln_fenster: '12',
  pendeln_amplitude: '10',
  pendeln_fortschritt: '2',
  // Differenzen: abwechselnde Änderungen zweier Dateien einer Kohorte
  // (gleicher Ordner) – Mindestanzahl der Wechsel im Fenster.
  differenzen_alternationen: '6',
  differenzen_fenster: '12',
  // Limitbruch (Guardrail): max. Dateien bzw. Zeilen des Tick-Baums.
  live_max_dateien: '5000',
  live_max_zeilen: '400000',
  // Gedächtnis: gemerkte Ticks und Hashes je Pfad.
  beobachtung_fenster: '24',
  hash_verlauf: '24',
  // Intervall-Bremse (Phase 5): ab dieser Dateien-Zahl verlängert sich das
  // Intervall um bremse_stufen × 50 % — kleine Bäume ticken schnell,
  // große seltener (Hardware-Schonung).
  bremse_ab_dateien: '2000',
  bremse_stufen: '3',
};
