# AGENTS.md

## Arbeitsregeln

- Antworten, Kommentare und Dokumentation auf Deutsch verfassen.
- Vor jedem `npm`- oder `npx`-Befehl Zustimmung einholen; npm-Prozesse wegen der Hardware nie parallel starten.
- Manifeste, Lockfiles, Skripte und CI-Konfiguration sind die ausführbare Wahrheit; bei Widersprüchen these Quellen vor README, `CLAUDE.md` und Wiki-Dokumenten verwenden.
- Das Repository ist ein Git-Repository. Vor dem Löschen, Zurücksetzen, Stashen oder breiten Reinigen Bestätigung einholen und den Arbeitsbaum nicht mit fremden Änderungen überschreiben.
- `npm run pruefen` ist vor jeder Abgabe Pflicht. Die harte Grenze sind 300 Quellzeilen; 200 ist die Zielgröße. Beim Berühren größerer Dateien nach Möglichkeit modularisieren.
- Keine geplanten Funktionen, unbelegten Zahlen oder alten Produktnamen als vorhanden dokumentieren.

## Paketgrenzen und Einstiegspunkte

- `package.json` ist die npm-Workspace-Wurzel und enthält nur `packages/*`; einziges Workspace-Mitglied ist `@propsa/core` unter `packages/core/`.
- `tauri-app/` ist ein eigenständiges privates npm-Paket mit eigener Lockdatei und **kein** Root-Workspace-Mitglied. Es bindet `@propsa/core` per `file:../packages/core` und baut den Core in `dev` und `build` vorab.
- Das MCP-Paket unter `agents/` ist optional, eigenständig, hat eine eigene Lockdatei und gehört nicht zum Root-Workspace. Seinen genauen Pfad führt `agents/INDEX.json`.
- CLI-Einstieg: `src/propsa.ts`; Core-Einstieg: `packages/core/src/index.ts`; Frontend-Einstieg: `tauri-app/src/main.tsx`; Rust-Start: `tauri-app/src-tauri/src/main.rs` → `lib.rs`.
- Die aktuellen Eigentümer- und Dateiindizes stehen in `INDEX.json` und den jeweiligen Unterordner-`INDEX.json`; bei neuen oder verschobenen Dateien zuerst dort nachsehen. Der Datenfluss ist in `ARCHITECTURE.md` beschrieben.
- Root und Core kompilieren nach CommonJS, das Tauri-Frontend als ESM. Deshalb ist `optimizeDeps.include: ["@propsa/core"]` in `tauri-app/vite.config.ts` nötig.
- Laufzeitdaten liegen zentral unter `~/.propsa/` (`history/`, `cache/`, `live/`); der Output bleibt im angeforderten Ziel. History ist JSONL mit höchstens 50 Einträgen; Identität bevorzugt über den Root-Commit-Hash, sonst über den Pfad.

## Verträge und Spiegel

- `packages/core/src/` ist die einzige TypeScript-Quelle für Sprach-, Filter-, Domänen- und Schema-Regeln. Das Frontend bezieht `STANDARD_AUSSCHLUESSE` in `tauri-app/src/typen.ts` aus `@propsa/core`.
- Diese Core-/Rust-Paare synchron halten: `filters.ts` ↔ `filter.rs`, `sprache.ts` ↔ `sprache.rs`, `schema.ts` ↔ `schema.rs`, `domaene.ts` ↔ `domaene.rs`, `live.ts` ↔ `live_anomalie.rs`.
- Cache: `packages/core/src/zwischenspeicher.ts` ↔ `src/zwischenspeicher.ts` ↔ `tauri-app/src-tauri/src/zwischenspeicher.rs`. History ist **nicht** im Core, sondern `src/history.ts` ↔ `tauri-app/src-tauri/src/history.rs`.
- `npm run pruefen` vergleicht tatsächlich Filterkataloge, Sprach-/Fence-Kataloge, Live-Kataloge, Cache-Version und -Schema sowie die Baustein-Kataloge in `vertrag.ts` ↔ `vertrag.rs` (Gate-Punkte, Status-Werte, Ereignistypen); Schema, Domäne und History werden dort nicht automatisch verglichen.
- Der Prüfer liest die betreffenden TypeScript-Objekte und Rust-`match`-Arme per Regex. Die Form der geprüften Deklarationen und Match-Arme nicht durch Umformatieren oder Umbenennen verändern.
- Changelog-Quelle ist ausschließlich `docs/wiki/Changelog.md`. `npm run pruefen` vergleicht `tauri-app/src-tauri/resources/Changelog.md` und `tauri-app/src-tauri/Changelog.md`; Tauri bündelt laut `tauri-app/src-tauri/tauri.conf.json` die zweite Datei.
- Produktname ausschließlich `PROPSA`. Die Versionsprüfung umfasst nur `package.json`, `tauri-app/package.json`, `tauri-app/src-tauri/Cargo.toml` und `tauri-app/src-tauri/tauri.conf.json`; Core-Paket und Lockfiles werden derzeit nicht mitgeprüft.

## Befehle

Nach Zustimmung; pro Arbeitsverzeichnis ausführen:

**Root**

```text
npm install
npm run pruefen
npm run build
npm start -- <pfad> [optionen]
```

**TypeScript-Tests**

```text
npx ts-node tests/paketKritik.test.ts
npx ts-node tests/zwischenspeicher.test.ts
npx ts-node tests/updateFehler.test.ts
```

**Tauri-Frontend (`tauri-app/`)**

```text
npm install
npm run build
npm run dev
npm run tauri dev
npm run tauri:exe
npm run tauri build
```

**Rust (`tauri-app/src-tauri/`)**

```text
cargo check
cargo test
cargo build --release --features custom-protocol
```

- `npm run build` im Root baut zuerst `@propsa/core` und danach die CLI. `npm run build` in `tauri-app/` baut den Core, `tsc` und Vite. Es gibt kein separates Root-Lint-, Typecheck- oder Test-Skript; `npm run pruefen` führt keine Tests aus.
- `npm run dev` im Tauri-Ordner ist nur Browser-/Layout-Vorschau über `src/devMock.ts`, kein Backend-Test. Für echte App-Funktionen `npm run tauri dev` verwenden.
- `npm run tauri:exe` baut ohne Bundle; `npm run tauri build` erzeugt das konfigurierte Bundle. Für einen manuellen Rust-Release-Build ist `--features custom-protocol` zwingend.
- Icon-Änderungen aus `tauri-app/` mit `node scripts/generate-icons.mjs` erzeugen; `sharp` nicht direkt für `.ico` verwenden.
- Der Delta-Smoke-Test läuft zweimal mit `--delta`; der zweite Lauf muss `0 neu · 0 geändert` melden. `updateFehler.test.ts` überspringt sich bei verschmutztem Git-Arbeitsbaum; `zwischenspeicher.test.ts` benötigt den gebauten Core und legt temporäre Cache-Dateien an.

## Umgebung und Stolperfallen

- Trotz Node-18-Angaben in README/INSTALL ist lokal mindestens Node `22.12` erforderlich: `commander@15` und `vite@8` fordern diese Untergrenze. CI verwendet derzeit Node 20.
- Vite läuft mit `strictPort` auf Port 1420; die Konfiguration erzwingt keine IPv6-Familie. Vor `tauri dev` Port und laufende Vite-Prozesse prüfen.
- In Node-Skripten unter Windows `npm` über `execFileSync`/`execSync` nur mit `shell: true` aufrufen, weil npm eine `.cmd`-Datei ist. Für Git-Bash-Pfade in Node `$TMP`/`$HOME` statt `/tmp/...` verwenden.
- Zeilenumbrüche in Suchmustern als `\r?\n` behandeln. In JSX-Text Pfadnamen wie `<identitaet>` als `&lt;identitaet&gt;` schreiben, sonst interpretiert TypeScript sie als Tag.
- Tauri-Konfiguration und Capabilities gehören unter `tauri-app/src-tauri/`; dort müssen Plugin-Abhängigkeiten und Capability-Permissions zusammenpassen.

## CI und Skriptstatus

- `.github/workflows/release.yml` läuft ausschließlich bei einem Push auf ein `v*`-Tag, installiert mit `npm install`, führt `paketKritik.test.ts` und `cargo test` aus und baut Desktop-Artefakte mit `tauri:exe` ohne Bundle.
- `npm run changelog:spiegeln`, `npm run installieren`, `npm run validate` und `npm run architecture:check` laufen unter Windows zuverlässig. `scripts/architecture-check.mjs` nutzt `fileURLToPath` und verarbeitet den Projektpfad korrekt.
- Was `architecture:check` **nicht** leistet: Es prüft keine Index-Vollständigkeit. Es verlangt, dass jede Datei einem im Root-`INDEX.json` eingetragenen Modulpfad zugeordnet ist, und prüft nur für die ersten drei Module stichprobenartig, ob eingetragene Dateien existieren — als Warnung, ohne Abbruch. Fehlt eine Datei in einem Unter-`INDEX.json`, fällt es nicht auf. Index-Pflege bleibt Sorgfalt, nicht Gate.
- `CLAUDE.md` ist eine ausführlichere, aber teilweise veraltete Zweitquelle; insbesondere alte Skriptpfade, `packages/core/src/history.ts` und Node-18-Angaben nicht ungeprüft übernehmen.

## Optionales Agenten-MCP

- Das Paket unter `agents/` stellt einen stdio-MCP-Server mit vier Tools bereit: Analyse auslösen, letzten Snapshot lesen, jüngste Erklärungen lesen, Status abfragen. Die Werkzeugnamen stehen in `agents/INDEX.json` und in `agents/*/src/tools/`.
- Es legt `snapshots/repo_snapshots/`, `snapshots/diffs/` und `logs/` relativ zum Start-CWD an und schreibt dort; es ist **nicht** read-only.
- Es ist **nicht** in den Root-Workspace aufgenommen und wird von `npm install` im Root nicht mitinstalliert.
- Ein Scheduler, ein `/heartbeat`-Kommando oder eine sonstige Einbindung in den Ablauf ist im Quelltext **nicht** vorhanden.
