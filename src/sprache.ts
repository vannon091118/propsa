/**
 * Sprach-Erkennung der CLI nach Dateiendung.
 *
 * Muss zu `sprache_fuer_endung` in `tauri-app/src-tauri/src/sprache.rs` passen:
 * gleicher Input ⇒ gleicher Sprachname in CLI und GUI. Unbekannt ⇒ `Text`.
 */
const SPRACHE_NACH_ENDUNG: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  json: 'JSON',
  md: 'Markdown',
  mdx: 'Markdown',
  css: 'CSS',
  scss: 'SCSS',
  less: 'LESS',
  html: 'HTML',
  htm: 'HTML',
  xml: 'XML',
  yaml: 'YAML',
  yml: 'YAML',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  cpp: 'C++',
  cc: 'C++',
  cxx: 'C++',
  c: 'C',
  h: 'C',
  sh: 'Shell',
  bash: 'Shell',
  env: 'Shell',
  sql: 'SQL',
  graphql: 'GraphQL',
  toml: 'TOML',
  cfg: 'INI',
  ini: 'INI',
};

/** Ordnet einer Dateiendung einen Sprachnamen zu. */
export function spracheFuerEndung(endung: string): string {
  return SPRACHE_NACH_ENDUNG[endung.toLowerCase()] ?? 'Text';
}

/** Ordnet einem relativen Pfad einen Sprachnamen zu. */
export function spracheErkennen(relativerPfad: string): string {
  const punkt = relativerPfad.lastIndexOf('.');
  const schraeg = Math.max(relativerPfad.lastIndexOf('/'), relativerPfad.lastIndexOf('\\'));
  if (punkt <= schraeg || punkt === -1) {
    return 'Text';
  }
  return spracheFuerEndung(relativerPfad.substring(punkt + 1));
}

/** Markdown-Fence-Sprache; muss zu `code_block_sprache` in Rust passen. */
const FENCE_NACH_SPRACHE: Record<string, string> = {
  TypeScript: 'typescript',
  JavaScript: 'javascript',
  JSON: 'json',
  Markdown: 'markdown',
  CSS: 'css',
  SCSS: 'scss',
  LESS: 'less',
  HTML: 'html',
  XML: 'xml',
  YAML: 'yaml',
  TOML: 'toml',
  Shell: 'bash',
  Go: 'go',
  Rust: 'rust',
  Java: 'java',
  'C++': 'cpp',
  C: 'c',
  SQL: 'sql',
  GraphQL: 'graphql',
  INI: 'ini',
};

/** Fence-Sprache für einen Sprachnamen; unbekannt ⇒ `text`. */
export function codeBlockSprache(sprache: string): string {
  return FENCE_NACH_SPRACHE[sprache] ?? 'text';
}
