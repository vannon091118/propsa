# PROPSA – Changelog

## 0.0.14

**Neu**

- **Live-Modus (App, Phase 1–5) — der Agenten-Wächter:** `live_start`/
  `live_stop`/`live_status` fahren einen sequenziellen Zyklus (Scan →
  Abgleich → nächster Tick, nie überlappend), der Snapshots samt
  Änderungsjournal in `~/.propsa/live/<identitaet>.db` (SQLite, WAL)
  schreibt. Ein Bestand (Pfad → Zeilen, Inhalts-Hash) macht die
  Regressions-Erkennung möglich, ohne Dateien voll zu lesen; 500 rohe
  Snapshots werden „Kinder zuerst“ gekürzt. Je Tick werden Anomalien
  erkannt (Flattern, Regression, Pendeln, Löschsturm, Explosion,
  Kohorten-Differenzen), persistiert und als `live-tick`-Ereignis
  gemeldet – auch ruhige Ticks senden als Herzschlag; ein Guardrail-Bruch
  (`limitbruch`) wird laut gemeldet, schreibt aber nichts.
- **Live-Oberfläche (Phase 3 + Widget-Sync):** Tray-Icon mit Menü (App
  öffnen, Live-Widget zeigen, Zyklus beenden, Beenden), Overlay-Widget
  als transparentes Zweitfenster (Ampel, Kennzahlen, Sparkline, Ticker,
  Anomalie-Badge, Start/Stopp, Intervall-Eingabe Minimum 10 s). Schwere
  Befunde (Schwere 3) holen das Widget einmalig nach vorn und setzen den
  Tray-Tooltip-Alarm; der erste ruhige Tick beruhigt. Das Widget gleicht
  `laeuft` alle 2 Sekunden per `live_status` mit dem Backend ab: Ein
  Stopp im Tray-Menü wird so in der Ampel sichtbar, ohne dass das Widget
  berührt wird.
- **Live-Graph (Phase 4):** Der Haupt-Graph der App zeigt beide Serien
  auf einer zeitbasierten X-Achse — die JSONL-Scan-History (unverändert)
  und die Live-Snapshots aus SQLite. `live_zeitreihe.rs` liest die
  Snapshots als Graph-Punkte, das Kommando `get_live_zeitreihe` filtert
  nach Zeitraum (Alles / 7 Tage / 24 Std / 6 Std); das Laden kapselt
  `useVerlauf.ts`. Der Graph wird damit erstmals überhaupt in der
  Oberfläche gerendert (bislang nur importiert).
- **Intervall-Bremse (Phase 5):** Große Bäume (2 000+ Dateien) ticken
  seltener, je 5 000 Dateien +50 % Pause; Schwellwerte im Katalog
  (`bremse_*`, Core ↔ Rust gespiegelt, `npm run pruefen` vergleicht),
  Umsetzung in `live_bremse.rs`. `live_status` meldet das **effektive**
  Intervall, das Widget zeigt es als `· 15s`.
- **Scan-Zwischenspeicher (`--cache`, App + CLI):** Vor dem Lesen bildet
  PROPSA eine Baum-Signatur (relativer Pfad, Größe, Änderungszeit je
  Datei) und vergleicht sie mit dem letzten Lauf derselben Konfiguration
  (Pfad, Muster, Limits). Bei Übereinstimmung kommt das Ergebnis aus
  `~/.propsa/cache/`, ohne die Dateiinhalte erneut zu lesen. Geändert
  auch eine Datei, wird vollständig neu gelesen und gespeichert; ein
  Guardrail-Abbruch wird nie gespeichert. Vertrag in `@propsa/core`
  (`zwischenspeicher.ts`), Umsetzungen in `src/zwischenspeicher.ts` (CLI)
  und `tauri-app/src-tauri/src/zwischenspeicher.rs` (App; Version und
  Schema vergleicht `npm run pruefen`). In der App steht der Schalter
  „Unveränderten Baum aus dem Cache holen“ (Standard: an), ein Treffer
  liefert das Ergebnis mit frischem Zeitstempel und Identität.
- **Live-Doku (Phase 5):** wiki/Live-Modus.md (siehe docs/wiki/Live-Modus.md im Projekt-Root) (Zyklus,
  Persistenz, Anomalien, Bremse, Grenzen), README-Kapitel „Live-Modus“
  und erweiterter Abschnitt „Was diese Version nicht kann“.

**Behoben**

- **Verminter Stub entfernt:** Das Modul `src/scan_metrics.ts` enthielt
  eine Fingerabdruck-Funktion, die stets eine  leere Map lieferte – jeder
  Vergleich hätte "unverändert" gemeldet. Es war nie angebunden (die App
  scannt real), daher entstanden keine falschen Ergebnisse; der
  irreführende TODO-Kommentar in `tauri-app/src/api.ts` ist entfernt und
  der echte Cache sauber angebunden (siehe oben).
- **Kürzung im Live-Speicher (Kinder zuerst):** `kuerzen` entfernte nur
  alte Snapshots – Journal- und Anomalien-Zeilen blieben als Waisen ohne
  Snapshot zurück, und das Einfügen einer Anomalie zum 500. Snapshot wäre
  mit Fehlermeldung gestorben. Jetzt kürzt `kuerzen` selbst in einer
  Transaktion Anomalien und Journal vor den Snapshots.
- **HistoryGraph war toter Code:** In `App.tsx` war der Graph importiert,
  wurde aber nie gerendert; zusätzlich lieferte `get_history_metrics`
  Tupel, die das Frontend als Objekte erwartete – der JSONL-Graph wäre
  auch mit neuer Exe leer geblieben. Beides behoben (Konvertierung in
  `useVerlauf.ts`, Rendern im Ergebnis-Bereich).
- **Dev-Server mit `@propsa/core` (Vite-Pre-Bundling):** Der Core wird als
  CommonJS gebaut; `vite dev` scheiterte am benannten Import, weil
  verlinkte Pakete nicht automatisch vorgebündelt werden. `optimizeDeps.
  include: ["@propsa/core"]` in `vite.config.ts` behebt das (der
  Produktions-Build war nicht betroffen).
- **`tauri-app/src-tauri/tests/paketkritik_doku.rs` wieder kompilierbar:**
  Der Integrationstest importierte mit `crate::…` aus der Lib – das kann
  in Integrationstests nie auflösen; er scheiterte seit `35ffc91` an der
  Kompilierung, weil AGENTS.md nur `cargo check` verlangt, das Tests
  nicht baut. Imports auf die Lib umgestellt, fehlende Felder ergänzt.

**Geändert**

- **Version überall 0.0.14** in `package.json`, `tauri-app/package.json`,
  `tauri-app/src-tauri/Cargo.toml`, `tauri-app/src-tauri/tauri.conf.json`
  und Versions-Badge im README.

## Unveröffentlicht

**Behoben**

- **Changelog-Quellen gespiegelt:** Die App zeigte im Changelog-Tab den
  Stand 0.1.2, obwohl 0.0.14 aktuell war — sie liest die Kopie
  `tauri-app/src-tauri/resources/Changelog.md`, die seit der Core-
  Extraktion nicht mehr mit der Quelle `docs/wiki/Changelog.md`
  mitgezogen worden war. Die Kopien werden jetzt per
  `npm run changelog:spiegeln` erzeugt (Link-Transformationen geteilt in
  `scripts/changelog_kopie.mjs`), `npm run pruefen` vergleicht beide
  Kopien gegen die Quelle und schlägt bei Abweichung an.

**Neu**

- **Scan-Zwischenspeicher (`--cache`, nur CLI):** Vor dem Lesen bildet
  PROPSA eine Baum-Signatur (relativer Pfad, Größe, Änderungszeit je
  Datei) und vergleicht sie mit dem letzten Lauf derselben Konfiguration
  (Pfad, Muster, Limits). Bei Übereinstimmung kommt das Ergebnis aus
  `~/.propsa/cache/`, ohne die Dateiinhalte erneut zu lesen. Geändert
  auch eine Datei, wird vollständig neu gelesen und gespeichert; ein
  Guardrail-Abbruch wird nie gespeichert. Vertrag in `@propsa/core`
  (`zwischenspeicher.ts`), Umsetzungen in `src/zwischenspeicher.ts` (CLI)
  und `tauri-app/src-tauri/src/zwischenspeicher.rs` (App; Spiegel samt
  Tests, Version und Schema vergleicht `npm run pruefen`).
- **Live-Modus, Phase 1–3 (App):** `live_start`/`live_stop`/
  `live_status` fahren einen sequenziellen Zyklus (Scan → Abgleich →
  nächster Tick, nie überlappend), der Snapshots samt Änderungsjournal in
  `~/.propsa/live/<identitaet>.db` (SQLite, WAL) schreibt. Ein Bestand
  (Pfad → Zeilen, Inhalts-Hash) macht die Regressions-Erkennung möglich,
  ohne Dateien voll zu lesen. Je Tick werden Anomalien erkannt (Flattern,
  Regression, Pendeln, Löschsturm, Explosion), persistiert und als
  `live-tick`-Ereignis gemeldet – auch ruhige Ticks senden als Herzschlag.
  Phase 3 liefert die Oberfläche: Tray-Icon mit Menü (App öffnen,
  Live-Widget zeigen, Zyklus beenden, Beenden), Overlay-Widget als
  transparentes Zweitfenster (Ampel, Kennzahlen, Sparkline, Ticker,
  Anomalie-Badge, Start/Stopp) und Start/Stopp über die Ereignisse
  `live-tick`/`live-anomalie`. Schwere Befunde (Schwere 3) holen das
  Widget einmalig nach vorn und setzen den Tray-Tooltip-Alarm; der erste
  ruhige Tick beruhigt. Schwellwert-Katalog in `@propsa/core` (`live.ts`),
  Rust-Spiegel in `live_anomalie.rs`; `npm run pruefen` vergleicht beide
  Seiten. Der Scan-Zwischenspeicher steht jetzt auch der App zur
  Verfügung: Der Schalter „Unveränderten Baum aus dem Cache holen“
  (Standard: an) nutzt den Rust-Spiegel `zwischenspeicher.rs`, ein Treffer
  liefert das Ergebnis mit frischem Zeitstempel und Identität. Das Widget
  gleicht `laeuft` alle 2 Sekunden per `live_status` mit dem Backend ab:
  Ein Stopp im Tray-Menü wird so in der Ampel sichtbar, ohne dass das
  Widget berührt wird.
- **Live-Modus, Phase 5 (Härten & Doku):** **Intervall-Bremse** – große
  Bäume (2 000+ Dateien) ticken seltener, je 5 000 Dateien +50 % Pause;
  Schwellwerte im Katalog (`bremse_*`, Core ↔ Rust gespiegelt, `npm run
  pruefen` vergleicht), Umsetzung in `live_bremse.rs`, Verdrahtung im
  Taktgeber. `live_status` meldet das **effektive** Intervall, das Widget
  zeigt es als `· 15s`. Das Widget bekommt eine **Intervall-Eingabe**
  (Minimum 10 s wie `MIN_INTERVALL_SEKUNDEN`). Wiki-Doku:
  wiki/Live-Modus.md (siehe docs/wiki/Live-Modus.md im Projekt-Root) (Zyklus, Persistenz, Anomalien,
  Bremse, Grenzen), README-Kapitel „Live-Modus“ und „Was diese Version
  nicht kann“ aktualisiert.
- **Live-Modus, Phase 4 (Graph):** Der Haupt-Graph der App zeigt jetzt
  beide Serien auf einer zeitbasierten X-Achse — die JSONL-Scan-History
  (unverändert) und die Live-Snapshots aus `~/.propsa/live/<identitaet>.db`
  (SQLite). `live_zeitreihe.rs` liest die Snapshots als Graph-Punkte, das
  Kommando `get_live_zeitreihe` filtert nach Zeitraum (Alles / 7 Tage /
  24 Std / 6 Std); das Laden kapselt `useVerlauf.ts`. Der Graph wird damit
  erstmals überhaupt in der Oberfläche gerendert (bislang nur importiert).

**Behoben**

- **Leeres Fenster nach dem Scan (App):** Die Achsen-Glättung des
  HistoryGraph wertete für den ersten Punkt `liste[index - 1]` aus —
  `undefined` — und warf mitten im Render einen TypeError; React warf
  den ganzen Baum weg und das Fenster blieb leer. Der Vorgänger bei
  Index 0 wird jetzt übersprungen. Daneben erlaubte die CSP unter
  `connect-src` nur `http://ipc.local`, Tauri 2 ruft aber
  `http://ipc.localhost` auf — jeder IPC-Aufruf scheiterte erst und
  fiel auf den postMessage-Weg zurück. Beides in der echten App per
  CDP verifiziert: Scan und Live-Lauf gefahren, beide Graph-Serien
  gerendert (Türkis 7 Live-Punkte, Violett 2 Scan-Punkte).
- **Undurchsichtiges Live-Widget (App):** Der Body-Hintergrund (Radial-
  verläufe auf `--color-grund`) galt auch im Overlay-Fenster und
  überdeckte die Fenster-Transparenz — das Widget erschien als dunkles
  Vollflächen-Rechteck statt als Glasfläche über dem Desktop. Auf der
  Overlay-Route setzt `main.tsx` jetzt die Klasse `overlay-hintergrund`,
  stile.css hält den Body dort transparent; das Widget trägt seine
  eigene Fläche.
- **Verminter Stub entfernt:** Das Modul `src/scan_metrics.ts` enthielt
  eine Fingerabdruck-Funktion, die stets eine  leere Map lieferte – jeder
  Vergleich hätte "unverändert" gemeldet. Es war nie angebunden (die App
  scannt real), daher entstanden keine falschen Ergebnisse; der
  irreführende TODO-Kommentar in `tauri-app/src/api.ts` ist entfernt und
  der echte Cache sauber angebunden (siehe oben).
- **Kürzung im Live-Speicher (Kinder zuerst):** `kuerzen` entfernte nur
  alte Snapshots – Journal- und Anomalien-Zeilen blieben als Waisen ohne
  Snapshot zurück, und das Einfügen einer Anomalie zum 500. Snapshot wäre
  mit Fehlermeldung gestorben. Jetzt kürzt `kuerzen` selbst in einer
  Transaktion Anomalien und Journal vor den Snapshots.
- **Dev-Server mit `@propsa/core` (Vite-Pre-Bundling):** Der Core wird als
  CommonJS gebaut; `vite dev` scheiterte am benannten Import, weil
  verlinkte Pakete nicht automatisch vorgebündelt werden. `optimizeDeps.
  include: ["@propsa/core"]` in `vite.config.ts` behebt das (der
  Produktions-Build war nicht betroffen).
- **`tauri-app/src-tauri/tests/paketkritik_doku.rs` wieder kompilierbar:**
  Der Integrationstest importierte mit `crate::…` aus der Lib – das kann
  in Integrationstests nie auflösen; er scheiterte seit `35ffc91` an der
  Kompilierung, weil AGENTS.md nur `cargo check` verlangt, das Tests
  nicht baut. Imports auf die Lib umgestellt, fehlende Felder ergänzt.

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

- Letzte Namensreste beseitigt: das Lockfile trug noch `propsa`
  mit den Bin-Namen `propsa` und `propsa`. Jetzt überall
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

- Ein Produktname überall: **PROPSA**. Vorher standen `propsa`,
  `propsa` und „RepomixParser“ nebeneinander.
- Eine Version überall: **0.1.0** in `package.json`, `tauri-app/package.json`,
  `Cargo.toml` und `tauri.conf.json`. Vorher waren es 1.0.0, 0.1.0 und v0.0.3.

**Ausgabe**

- Neues **Kontextpaket**: eine Datei je Domäne plus Zusammenfassung,
  Architektur, Dokumentation und `kontext.json`
  (Kontextpaket.md (siehe docs/wiki/Kontextpaket.md im Projekt-Root)).
- **Gemeinsames JSON-Schema** mit `schemaVersion` für CLI und App
  (Export-Schema.md (siehe docs/wiki/Export-Schema.md im Projekt-Root)); `absoluter_pfad` ist entfernt.
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

MIT – siehe LICENSE im Projekt-Root.
