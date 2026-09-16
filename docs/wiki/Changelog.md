# PROPSA – Changelog

## 0.1.2

**Neu**

- **Release-Workflow:** GitHub-Action `.github/workflows/release.yml` läuft
  bei Push eines `v*`-Tags: `npm run pruefen` und Doku-Tests, CLI-Build
  (Artefakt `propsa-cli-<tag>.tar.gz`), Desktop-App-Build für Windows,
  Linux und macOS, dann ein GitHub-Release mit allen Artefakten und der
  Changelog-Notiz des Tags.
- **Updater `--force-stash`:** `propsa update --force-stash` stasht lokale
  Änderungen vor dem Pull automatisch und holt sie nach dem Update zurück;
  bei Konflikten bleibt der Stash erhalten und die Meldung nennt den Weg
  zurück. Ohne das Flag bleibt es bei der klaren Ablehnung mit Hinweis.

**Geändert**

- **Version überall 0.1.2** in den fünf Manifesten samt Lockfiles und
  Versions-Badges in beiden READMEs.

## 0.1.1

**Neu / Geändert**

- **Auto-Updater (git-basiert):** CLI (`propsa update [--nur-pruefen]`) und
  Desktop-App (Update-Bereich in der Kopfzeile) prüfen gegen `origin/main`:
  `git fetch`, Vergleich HEAD ↔ origin/main, Übernahme per Fast-Forward und
  Neuinstallation (`npm run installieren`). Der Vertrag
  (`UpdateCheck`) lebt in `@propsa/core`; Umsetzung in `src/update.ts` und
  `src-tauri/src/update.rs`. Lokale Änderungen werden nie überschrieben –
  bei Divergenz bricht der Lauf ab.
- **Version überall 0.1.1:** `package.json`, `packages/core/package.json`,
  `tauri-app/package.json`, `Cargo.toml`, `tauri.conf.json` samt Lockfiles
  (`npm`-Lockfiles und `Cargo.lock` mitgebumpft).
- **Bump-Skript ergänzt Core:** `scripts/bump-version.ts` aktualisiert jetzt
  zusätzlich `packages/core/package.json` (vorher nur die vier Manifeste).

**Behoben**

- **CLI-Fehlermeldung präzisiert:** `--delta`-Hilfe und Doku nennen die
  zentrale History `~/.propsa/history/` statt der ausgemusterten
  `.propsa/history.json`.

## 0.1.0 (@propsa/core)

**Neu**

- **Geteilter Kern als eigenes Paket:** `@propsa/core`
  (`packages/core/`) bündelt die Regeln und Verträge, die CLI und Frontend
  gemeinsam haben: Sprach-Erkennung, Ausschlusskatalog, Domänen-Regel und
  Export-Schema. Die CLI importiert das Paket als npm-Workspace, das
  Frontend als `file:`-Abhängigkeit; die Rust-Spiegel bleiben als
  Zweitumsetzung bestehen und werden von `npm run pruefen` abgeglichen.
- **Prüfpunkt Sprachkataloge:** `npm run pruefen` vergleicht jetzt auch die
  Endungs- und Fence-Tabellen zwischen `packages/core/src/sprache.ts` und
  `tauri-app/src-tauri/src/sprache.rs` (32 + 20 Einträge, deckungsgleich).
- **Kataloge ohne Kopie:** Der Ausschlusskatalog (35 Verzeichnisse,
  16 Dateien) lebt nur noch in `@propsa/core`; das Frontend bezieht
  `STANDARD_AUSSCHLUESSE` von dort statt einer eigenen 52-Zeilen-Kopie.
  `npm run pruefen` vergleicht beide Kataloge Core ↔ Rust und stellt
  sicher, dass das Frontend den Core-Wert importiert.

**Zentrale Ablage `~/.propsa` (Verhaltensänderung)**

- **Delta-History umgezogen:** Statt `.propsa/history.json` im gescannten
  Projekt liegt die History jetzt zentral im Benutzerverzeichnis:
  `~/.propsa/history/<identitaet>.jsonl` – eine Datei je Projekt-Identität,
  JSONL, 50 Einträge gekürzt. Im gescannten Projekt bleibt nichts zurück;
  der `.gitignore`-Eingriff entfällt ersatzlos.
- **Installation/Deinstallation:** `npm run installieren` baut Core und
  CLI und richtet `~/.propsa` ein (History + `version.json`);
  `npm run deinstallieren` entfernt die Ablage nach Bestätigung und löst
  ein `npm link`. Die Ablage nimmt alles zwischen den Läufen auf –
  **außer dem Output**: Kontextpakete und `--einzeln`-Dateien landen, wo
  sie angefordert werden.

**Gleiche Geschichte, neues Format:** Der Umstieg ist für bestehende
Projekte verlustfrei – das Delta beginnt je Identität einfach wieder bei
Erstlauf; alte `.propsa/history.json`-Dateien im Projekt können gelöscht
werden (sie werden nicht mehr gelesen).

## 0.1.0 (.propsaignore)

**Neu**

- **`.propsaignore`** im Projekt-Root: projektspezifische, versionierbare
  Ausschlüsse. Eine Zeile = ein Glob-Muster, `#`-Kommentare erlaubt,
  `!muster` hebt einen Standard-Ausschluss auf (auch das Wieder-Betreten
  eines Katalog-Verzeichnisses wie `vendor/`).
- Identische Semantik in CLI (`src/propsaignore.ts`) und App
  (`tauri-app/src-tauri/src/filterignore.rs`); die CLI meldet einen aktiven
  Ausschluss in der Ausgabe.

## 0.1.0 (Paket-Hygiene)

**Behoben**

- **Selbstfressende Pakete gestoppt:** Eigene früherer Outputs (`context.md`,
  `context.json`, `kontext.json`), Lockfiles (`package-lock.json` & Verwandte),
  `*.bak` und `.tmp/`-Verzeichnisse werden jetzt standardmäßig ausgeschlossen
  – in CLI, Rust und Frontend (Kataloge bleiben inhaltsgleich). In einem
  belasteten Arbeitsverzeichnis sank der Paketanteil an Artefakten so von
  ~81 % auf 0 %.
- **Doku-Wahrheit ohne False Positives:** Die Linse meldet eine Referenz nur
  noch als fehlend, wenn sie wie eine echte Datei aussieht (Endung, Wildcard)
  und kein Eintrag im `dateien`-Array passt. Wörtliche Pfad-Strings ohne
  Datei-Bezug (Verzeichnisse, `src/…`-Platzhalter) bleiben außen vor.
  Vorher meldete sie fälschlich „79 von 90 Referenzen fehlen“.

## 0.1.0 (Delta in der App)

**Neu**

- Die Desktop-App kann jetzt ebenfalls Delta: Die Checkbox „Änderungen zum
  letzten Lauf melden“ im Scan-Panel liest/führt dieselbe
  `.propsa/history.json` wie die CLI (Rust-Modul `src-tauri/src/history.rs`,
  Spiegel von `src/history.ts`, gleiche Identitätslogik über den
  Root-Commit-Hash, gleiche Kürzung auf 50 Einträge, gleicher
  .gitignore-Eintrag).
- Neuer Ergebnisblock: Kennzahlen (+/~ /−/unverändert), Identität mit
  Herkunft, Dateilisten je Kategorie (max. 20 Zeilen, Rest als Summe).
  Erstläufe werden als solche angezeigt.
- `scan` nimmt den Parameter `delta` an; `ScanErgebnis` trägt das Delta
  optional in `delta_info`. Der JSON-Vertrag `kontext.json` (Schema v2)
  bleibt delta-frei.
- Mock-Delta für die Browser-Vorschau (`devMock.ts`).

## 0.1.0 (Delta & History)

**Neu**

- **Delta-Erkennung** in der CLI: `--delta` vergleicht den Lauf mit dem
  letzten Eintrag derselben Projekt-Identität und meldet je Datei
  `+` neu, `~` geändert, `-` entfernt.
- **`.propsa/history.json`** wohnt lokal im gescannten Projekt, wird auf
  50 Einträge gekürzt und automatisch in die `.gitignore` eingetragen
  (idempotent). Der Katalog der nie betretenen Verzeichnisse umfasst
  `.propsa` jetzt in CLI, Rust und Frontend.
- **Identity-Matching über den Root-Commit-Hash** (`git rev-list
  --max-parents=0 HEAD`) – stabil über Branches, Pfade und Remote-URLs.
  Ohne Git/Commit fällt die Identität auf den normierten Pfad zurück
  (in jedem Eintrag als `herkunft` gekennzeichnet).
- **INSTALL.md** als kanonische Installationsanleitung: einzige
  verbindliche Quelle für Installations-Schritte, Verweise statt Kopien.

## 0.1.0 (Bereinigungs-Cut)

Zweiter Schnitt der 0.1.0: Fail-Loud-Paradigma, Kompaktmodus beerdigt,
Namen endgültig bereinigt.

**Paradigma: Fail Loud, Never Truncate Silent**

- Limits (`-m`, `-l` in der CLI; Datei-/Zeilenlimit in der App) sind
  **Guardrails** und brechen den Scan **vor** der Verarbeitung ab. Es gibt
  kein Teilergebnis mehr: keine stille Kürzung, kein Abbruchgrund, kein
  beschnittenes Paket.
- CLI: Bei einem Guardrail-Treffer Exit-Code 2 mit verständlicher
  Fehlermeldung; `--no-limits` schaltet alle Guardrails ab.
- Export-Schema auf **Version 2**: `kompakt_ausgelassen` und `abbruch_grund`
  sind entfernt.

**Kompaktmodus beerdigt**

- Entfernt: `-c/--compact` mit den arbiträren Grenzen ≤ 500 Zeilen /
  ≤ 50 Dateien.
- Ersetzt durch zielbasierte **Slice-Selektoren** (nur CLI): `--entrypoint`
  (Einstiegsdatei plus lokale Import-Kette), `--depth` (Ordnertiefe),
  `--top-files` (n größten Dateien). Selektoren dürfen kombiniert werden.

**Namen und Version**

- Letzte Namensreste beseitigt: das Lockfile trug noch `repomix-parser-llm`
  mit den Bin-Namen `files-to-prompt` und `repomix-parser`. Jetzt überall
  `propsa`; die Prüfung (`npm run pruefen`) deckt auch das Lockfile ab.
- Version **0.1.0** in allen vier Manifesten.

**Oberfläche**

- Rahmenloses Fenster (`decorations: false`) mit eigener Titelzeile
  (`src/TitleLeiste.tsx`) und Window-Permissions in der Capability.
- Kompaktmodus-Schalter entfernt; Limits sind als Guardrails beschriftet.

**Entfernt**

- `propsa.config.json`: Die CLI liest keine Konfigurationsdatei mehr; alle
  Optionen kommen aus Argumenten.

## 0.1.0 (erste Fassung)

Erste Fassung, die CLI und Desktop-App auf demselben Vertrag zusammenführt.
Nicht veröffentlicht: es gibt keine Release-Tags.

**Name und Version**

- Ein Produktname überall: **PROPSA**. Vorher standen `files-to-prompt`,
  `repomix-parser-llm` und „RepomixParser“ nebeneinander.
- Eine Version überall: **0.1.0** in `package.json`, `tauri-app/package.json`,
  `Cargo.toml` und `tauri.conf.json`. Vorher waren es 1.0.0, 0.1.0 und v0.0.3.

**Ausgabe**

- Neues **Kontextpaket**: eine Datei je Domäne plus Zusammenfassung,
  Architektur, Dokumentation und `kontext.json`
  ([Kontextpaket.md](Kontextpaket.md)).
- **Gemeinsames JSON-Schema** mit `schemaVersion` für CLI und App
  ([Export-Schema.md](Export-Schema.md)); `absoluter_pfad` ist entfernt.
- Einzeldatei-Ausgabe der CLI auf `--einzeln datei.md|json` umgestellt.

**Scan**

- Standard ist ein vollständiger Scan: keine Limits, Kompaktmodus aus.
- Zweiphasiger Scan: erst Kandidaten sammeln und sortieren, dann lesen. Damit
  treffen Limits immer dieselben Dateien, unabhängig vom Dateisystem.
- Ein Ignorier-Katalog verhindert das Betreten von `node_modules`, `.venv`,
  `target`, `__pycache__` und Verwandten – auch bei leerem Ausschlussfeld.
- Übersprungene Dateien (binär, leer, gesperrt) werden gezählt und gemeldet.

**Oberfläche**

- Desktop-App neu gestaltet: dunkles Theme mit Design-Tokens, Verlaufstitel,
  Hintergrundanimationen, Kennzahl-Karten, Sprachverteilung und Hotspot-Liste.
- Fortschrittsanzeige über das Ereignis `scan-fortschritt`.
- Hinweisbalken und Kopfzeilen der Paketdateien sagen, wenn ein Scan
  unvollständig ist.

**Aufgeräumt**

- Entfernt: historischer Repomix-Parser (`src/cli.ts`, `src/parser/`),
  `src/keywords.ts`, die toten Rust-Module `commands.rs` und `types.rs` sowie
  der Einzeldatei-Export der App.
- Frontend auf Tailwind v4 mit einer einzigen Stildatei umgestellt
  (`App.css` und `Animationen.css` entfallen).
- Neuer Konsistenzprüfer: `npm run pruefen`.
- Dokumentation auf den tatsächlichen Code gezogen (Pfade, Optionen, Versionen).

## Lizenz

MIT – siehe [../../LICENSE](../../LICENSE).
