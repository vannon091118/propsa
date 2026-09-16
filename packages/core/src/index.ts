/**
 * Geteilter Kern von PROPSA.
 *
 * Enthält die Regeln und Verträge, die CLI und GUI gemeinsam haben: Sprach-
 * Erkennung, Filterkatalog, Domänen-Regel und das Export-Schema. Die GUI
 * setzt dieselben Regeln in Rust nach (`tauri-app/src-tauri/src/`); dieses
 * Paket ist die **einzige** TypeScript-Quelle.
 *
 * Gegenstücke in Rust (müssen zusammen geändert werden):
 * - `sprache.ts`   ↔ `sprache.rs`
 * - `filters.ts`   ↔ `filter.rs` und Vorbelegung `tauri-app/src/typen.ts`
 * - `schema.ts`    ↔ `schema.rs`
 * - `domaene.ts`   ↔ `domaene.rs`
 */
export { KontextDatei } from './datei';
export {
  spracheFuerEndung,
  spracheErkennen,
  codeBlockSprache,
} from './sprache';
export {
  IGNORIERTE_VERZEICHNISSE,
  AUSGESCHLOSSENE_DATEIEN,
  STANDARD_AUSSCHLUESSE,
  resolveExcludes,
  resolveIncludes,
} from './filters';
export {
  SCHEMA_VERSION,
  SchemaDatei,
  SchemaMeta,
  SchemaKontext,
  zeitstempelJetzt,
  kontextObjekt,
  kontextAlsJson,
} from './schema';
export {
  UpdateCheck,
  hashKurz,
  updateVerfuegbar,
} from './update';
export {
  WURZEL_DOMAENE,
  Domaene,
  domaeneVon,
  dateinameFuerSprache,
  gruppiereNachDomaene,
  istDokumentation,
  quellenName,
} from './domaene';
