/**
 * Farbliche Indikatoren je Sprache (für Chips und Verteilungsbalken).
 *
 * Die Sprachnamen stammen aus `src-tauri/src/sprache.rs` und
 * `src/scanner.ts`, damit beide Oberflächen dieselben Namen zeigen.
 */
export type SprachStil = {
  farbe: string;
  kurz: string;
};

const STILE: Record<string, SprachStil> = {
  TypeScript: { farbe: "#4f9eff", kurz: "TS" },
  JavaScript: { farbe: "#e8c34a", kurz: "JS" },
  JSON: { farbe: "#c9a227", kurz: "{}" },
  Markdown: { farbe: "#9aa2b1", kurz: "MD" },
  CSS: { farbe: "#56a3f5", kurz: "CSS" },
  SCSS: { farbe: "#d973a6", kurz: "SC" },
  LESS: { farbe: "#7aa6ff", kurz: "LS" },
  HTML: { farbe: "#e0703e", kurz: "HT" },
  XML: { farbe: "#c98a3e", kurz: "XML" },
  YAML: { farbe: "#a3d977", kurz: "YM" },
  TOML: { farbe: "#8fce8f", kurz: "TM" },
  Python: { farbe: "#5aa9e6", kurz: "PY" },
  Go: { farbe: "#5dc9e2", kurz: "GO" },
  Rust: { farbe: "#e0915b", kurz: "RS" },
  Java: { farbe: "#d1624a", kurz: "JV" },
  "C++": { farbe: "#7f8cff", kurz: "C++" },
  C: { farbe: "#8a95b8", kurz: "C" },
  Shell: { farbe: "#7ad48a", kurz: "SH" },
  SQL: { farbe: "#b58cff", kurz: "SQL" },
  GraphQL: { farbe: "#e570c8", kurz: "GQL" },
  INI: { farbe: "#8f9aa8", kurz: "INI" },
  Text: { farbe: "#6b7280", kurz: "TXT" },
};

const UNBEKANNT: SprachStil = { farbe: "#6b7280", kurz: "?" };

/** Liefert Farbe und Kürzel zu einem Sprachnamen. */
export function stilFuer(sprache: string): SprachStil {
  return STILE[sprache] ?? { ...UNBEKANNT, kurz: sprache.slice(0, 3).toUpperCase() };
}
