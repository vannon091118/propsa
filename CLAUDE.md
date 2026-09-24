# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt-Überblick

**PROPAKT** (**PRO**jekt-**PAKT**kontext für Sprachmodelle) macht aus einem Projektordner ein **Kontextpaket für Sprachmodelle**: mehrere Dateien statt eines Riesenblobs, aufgeteilt nach Domänen, jeweils mit vollständigem Inhalt.

Zwei Oberflächen teilen denselben Vertrag:
- **CLI** (TypeScript, `src/`) – Skripting und Automatisierung
- **Desktop-App** (Tauri v2, Rust + React, `tauri-app/`) – klickbasierte Bedienung

Der TypeScript-Kern liegt in **`@propakt/core`** (`packages/core/`) und wird von der CLI direkt importiert. Die Tauri-App bindet den Core per `file:../packages/core` und baut ihn in `dev`/`build` vorab. Das Rust-Backend spiegelt die Regeln; der Abgleich erfolgt durch `npm run pruefen`.

## Wichtige Befehle

### CLI
```bash
npm install                    # Abhängigkeiten installieren
npm run build                  # Core-Workspace + TypeScript-Kompilierung
npm start <pfad> [optionen]    # Projekt scannen, Paket nach ./propakt-kontext/ schreiben
npm run pruefen                # Konsistenzprüfung (LOC, Versionen, Namen, Kataloge, Links)
npm run installieren           # Build + zentrale Ablage ~/.propakt einrichten
npm run deinstallieren         # ~/.propakt entfernen (mit Bestätigung)
npm run changelog:spiegeln     # Changelog-Kopien in der App aktualisieren
```

### Desktop-App
```bash
cd tauri-app
npm install                    # Frontend-Abhängigkeiten
npm run dev                    # Vite Dev-Server (Layout-Vorschau über devMock.ts, kein Backend)
npm run tauri dev              # Vollständige App in Entwicklung (Rust + Frontend)
npm run tauri build            # Installer bauen (Windows: MSI + NSIS)
npm run tauri:exe              # Nur Exe bauen (ohne Bundle)
```

### Tests
```bash
npx ts-node tests/paketKritik.test.ts    # CLI-Doku-Tests (kein Test-Runner nötig)
npx ts-node tests/zwischenspeicher.test.ts
npx ts-node tests/updateFehler.test.ts
```

### Rust-Backend prüfen
```bash
cd tauri-app/src-tauri && cargo check
```

## Architektur-Highlights

### Datenfluss (beide Oberflächen)
```
Pfad + Optionen
      │
      ▼
1. Kandidaten sammeln      Filter, Ignorier-Katalog, Sortierung
      │
      ▼
2. Dateien lesen           Lesefehler/Binärdateien zählen als übersprungen
      │
      ▼
3. Guardrails prüfen       Limits brechen AB (kein Teilergebnis);
                           Slice-Selektoren schneiden die Menge (nur CLI)
      │
      ▼
4. Paket bauen             Domänen gruppieren, Texte und JSON erzeugen
      │
      ▼
5. Schreiben               Zusammenfassung.md, Architektur.md, Kritik.md,
                           Dokumentation.md, Quellen/<Domäne>.md, kontext.json
```

### CLI-Module (`src/`)
| Modul | Aufgabe |
|---|---|
| `propakt.ts` | Einstieg: Argumente, Ablauf, Ausgabe |
| `scanner.ts` | Kandidaten sammeln, sortieren, Guardrails und Zähler |
| `slice.ts` | Slice-Selektoren: `--entrypoint`, `--depth`, `--top-files` |
| `history.ts` | Delta/History: `~/.propakt/history/`, Root-Commit-Identität |
| `zwischenspeicher.ts` | Scan-Cache: Baum-Signatur, `~/.propakt/cache/`, Treffer-Logik |
| `propaktignore.ts` | `.propaktignore`: projektspezifische Ausschlüsse laden/mergen |
| `datei.ts` | Datei lesen, Binär-/Leerdateien erkennen, Zeilen zählen |
| `paket.ts` | Paket bauen und schreiben |
| `paketBasis.ts`, `paketKritik.ts`, `paketTexte.ts`, `paketQuellen.ts` | Paket-Bausteine |
| `formatter.ts` | Einzeldatei-Markdown (`--einzeln`) |
| `update.ts` | Git-basierter Auto-Updater |

### Rust-Backend (`tauri-app/src-tauri/src/`)
| Modul | Aufgabe |
|---|---|
| `lib.rs` | Builder, Plugins, registrierte Kommandos |
| `scan.rs` | Kommando `scan`: Kandidaten, Limits, Fortschritt, Cache-Andock |
| `filter.rs` | Musterabgleich und Ignorier-Katalog |
| `paket.rs` | Kommando `paket_schreiben` |
| `domaene.rs` | Domänen-Regel |
| `paketbasis.rs`, `pakettexte.rs`, `paketquellen.rs`, `paketkritik.rs` | Pakettexte |
| `kritik_regeln.rs` | `Kritik.md` Schwellwerte, Befunde |
| `history.rs` | Delta/History im Backend |
| `zwischenspeicher.rs` | Scan-Cache (Spiegel zu `src/zwischenspeicher.ts`) |
| `filterignore.rs` | `.propaktignore` im Backend |
| `schema.rs` | JSON-Vertrag (`kontext.json`) |
| `sprache.rs` | Sprache und Codeblock-Kennung |
| `fortschritt.rs` | Ereignis `scan-fortschritt` |
| `update.rs` | Auto-Updater: `update_check`, `update_ausfuehren` |
| `live_store.rs` | Live-Speicher: SQLite-WAL `~/.propakt/live/<identitaet>.db` |
| `live_zyklus.rs` | Live-Tick-Kern: Kandidaten, Baum-Signatur, Vergleich, Änderungen |
| `live_kommandos.rs` | Live-Kommandos `live_start`/`live_stop`/`live_status` |
| `live_takt.rs` | Live-Taktgeber-Loop: Ticks, Ereignisse, Tray-Alarm, Beruhigung |
| `live_anomalie.rs` | Anomalie-Erkennung (Spiegel zu `packages/core/src/live.ts`) |
| `live_bremse.rs` | Intervall-Bremse: effektive Pause aus Baum-Größe |
| `live_zeitreihe.rs` | Live-Zeitreihe als Leseansicht für Graph |
| `vertrag.rs` | Baustein-Kataloge (Spiegel zu `packages/core/src/vertrag.ts`) |
| `tray.rs` | Tray-Icon, Menü, Widget-Vordergrund-Hub |

### Geteilter Kern (`packages/core/src/`)
| Datei | Inhalt |
|---|---|
| `filters.ts` | Include/Exclude-Muster, `IGNORIERTE_VERZEICHNISSE`, `AUSGESCHLOSSENE_DATEIEN` |
| `sprache.ts` | Sprache nach Endung (`SPRACHE_NACH_ENDUNG`), Codeblock-Kennung (`FENCE_NACH_SPRACHE`) |
| `domaene.ts` | Domänen-Regel und Dateinamen im Paket |
| `schema.ts` | JSON-Vertrag (`kontext.json`, Schema v2) |
| `live.ts` | Live-Kataloge: `ANOMALIE_SCHWERE`, `ANOMALIE_BESCHREIBUNGEN`, `ANOMALIE_SCHWELLEN` |
| `zwischenspeicher.ts` | Cache-Vertrag: Version, Schema, Baum-Signatur |
| `vertrag.ts` | Baustein-Vertrag: Typen und Kataloge (Gate-Punkte, Status-Werte, Ereignistypen) |
| `datei.ts`, `update.ts` | Kleinere geteilte Typen/Hilfen |

## Wichtige Regeln (aus AGENTS.md)

1. **Ausgabe und Dokumentation auf Deutsch** – alle Ausgaben, Kommentare und Dokumentationen in deutscher Sprache
2. **LOC-Grenze pro Datei** – maximal 300 Zeilen (wird von `npm run pruefen` durchgesetzt)
3. **Eine Wahrheit je Regel** – Kataloge, Schemata und Versionen haben genau eine Quelle; Kopien werden durch `npm run pruefen` verglichen
4. **Changelog-Spiegel** – `docs/wiki/Changelog.md` ist die einzige Quelle; nach Änderungen `npm run changelog:spiegeln` ausführen
4. **Dokumentation folgt dem Code** – Pfade, Optionen und Versionen in der Doku müssen dem Stand entsprechen
5. **Keine erfundenen Angaben** – keine Zahlen, Badges, Screenshots oder Funktionen, die nicht gemessen/umgesetzt sind

### Versionseinheitlichkeit
Die Version steht in vier Dateien und muss überall gleich sein:
- `package.json`
- `tauri-app/package.json`
- `tauri-app/src-tauri/Cargo.toml`
- `tauri-app/src-tauri/tauri.conf.json`

### Kataloge synchron halten (Core ↔ Rust)
Immer gemeinsam ändern und dann `npm run pruefen` ausführen:
- `packages/core/src/filters.ts` ↔ `tauri-app/src-tauri/src/filter.rs`
- `packages/core/src/sprache.ts` ↔ `tauri-app/src-tauri/src/sprache.rs`
- `packages/core/src/schema.ts` ↔ `tauri-app/src-tauri/src/schema.rs`
- `packages/core/src/domaene.ts` ↔ `tauri-app/src-tauri/src/domaene.rs`
- `packages/core/src/history.ts` ↔ `tauri-app/src-tauri/src/history.rs`
- `packages/core/src/live.ts` ↔ `tauri-app/src-tauri/src/live_anomalie.rs`
- `packages/core/src/zwischenspeicher.ts` ↔ `tauri-app/src-tauri/src/zwischenspeicher.rs`
- `packages/core/src/vertrag.ts` ↔ `tauri-app/src-tauri/src/vertrag.rs`

Das Frontend (`tauri-app/src/typen.ts`) muss `STANDARD_AUSSCHLUESSE` aus `@propakt/core` importieren.

### Guardrails (Fail Loud, Never Truncate Silent)
Ein Limit bricht den Scan **vor der Verarbeitung** ab; es gibt kein Teilergebnis. Die App zeigt einen Fehler, die CLI endet mit Exit-Code 2.

### Zentrale Ablage `~/.propakt`
```
~/.propakt/
├── history/        Delta-History je Projekt-Identität (<hash>.jsonl)
├── cache/          Scan-Cache (Baum-Signatur)
├── live/           Live-Modus SQLite-DB (<identitaet>.db, WAL)
└── version.json    Installations-Metadaten
```
Im gescannten Projekt bleibt **nichts** zurück. Output (Kontextpakete, `--einzeln`-Dateien) landet dort, wo er angefordert wird.

## Entwicklungsumgebung (Windows-spezifisch)

- **Vite hört auf `[::1]:1420`** – IPv4-Tools zeigen nichts. Belegung prüfen:
  ```powershell
  Get-NetTCPConnection -LocalPort 1420
  ```
- **Rust-Build braucht C++ Build Tools** (Visual Studio Build Tools oder Community mit „Desktopentwicklung mit C++“)
- **npm in Node-Skripten** – `execFileSync('npm', …)` braucht `shell: true` (npm ist `.cmd`)
- **Git-Bash-Pfade** – `/tmp/…` funktioniert in Bash, aber Node braucht Windows-Pfade (`$TMP`, `$HOME`)
- **JSX-Text mit Pfaden** – `<identitaet>` wird als Tag geparst; als `&lt;…&gt;` schreiben

## CI/CD

GitHub Actions Workflow (`.github/workflows/release.yml`) läuft bei Push eines `v*`-Tags:
1. `npm run pruefen` (inkl. Doku-Tests)
2. CLI-Build → Artefakt `propakt-cli-<tag>.tar.gz`
3. Desktop-App-Build für Windows/Linux/macOS (Matrix)
4. GitHub-Release mit allen Artefakten und Changelog-Notiz des Tags

## Nützliche Dateien für Kontext

- `ARCHITECTURE.md` – detaillierte Modul- und Datenfluss-Beschreibung
- `AGENTS.md` – Entwicklungsrichtlinien und Regeln
- `INSTALL.md` – kanonische Installationsanleitung
- `docs/wiki/CLI-Usage.md` – vollständige CLI-Dokumentation
- `docs/wiki/Kontextpaket.md` – Paket-Struktur und Domänen-Regel
- `docs/wiki/Export-Schema.md` – JSON-Schema (v2)
- `docs/wiki/Live-Modus.md` – Live-Modus-Dokumentation
- `docs/wiki/Entwicklung.md` – Build-Stolperfallen und Debugging-Tipps

## Smoke-Tests vor Abgabe

```bash
npm run pruefen                      # Pflicht vor jeder Abgabe
npm start -- . --einzeln kontext.md  # Erster Lauf gegen das Projekt selbst
# Delta: zweimal mit --delta – der zweite meldet „0 neu · 0 geändert“
```