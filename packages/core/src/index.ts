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
 *
 * `zwischenspeicher.ts` (Scan-Cache-Vertrag) wird in
 * `tauri-app/src-tauri/src/zwischenspeicher.rs` gespiegelt; `live.ts`
 * (Live-Kataloge) in `live_anomalie.rs`; `vertrag.ts` (Baustein-Kataloge:
 * Gate-Punkte, Status-Werte, Ereignistypen) in `vertrag.rs`. Alle drei
 * vergleicht `npm run pruefen`.
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
  AnomalieArt,
  ANOMALIE_SCHWERE,
  ANOMALIE_BESCHREIBUNGEN,
  ANOMALIE_SCHWELLEN,
} from './live';
export {
  BaumEintrag,
  CacheEintrag,
  ZWISCHENSPEICHER_VERSION,
  ZWISCHENSPEICHER_SCHEMA,
  baumSignatur,
  gleicheSignatur,
  istCacheEintrag,
  cacheTreffer,
} from './zwischenspeicher';
export {
  WURZEL_DOMAENE,
  Domaene,
  domaeneVon,
  dateinameFuerSprache,
  gruppiereNachDomaene,
  istDokumentation,
  quellenName,
} from './domaene';
export {
  Position,
  Regel,
  Vertrag,
  VertragsStatus,
  GATE_PUNKTE,
  STATUS_WERTE,
  EREIGNIS_TYPEN,
  regelVollstaendig,
  statusBekannt,
} from './vertrag';
