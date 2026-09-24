# ARCHITECTURE.md

## Überblick

**PROPAKT** verwandelt ein Projektverzeichnis in ein Kontextpaket für
Sprachmodelle. Es gibt zwei Oberflächen:

- **CLI** (TypeScript, `src/`) – Skripting und Automatisierung.
- **Desktop-App** (Tauri v2, Rust + React, `tauri-app/`) – klickbasierte Bedienung.

Beide teilen den **Vertrag**; die TypeScript-Seite des Vertrags lebt im
eigenen Paket **`@propakt/core`** (`packages/core/`). Verbindlich sind
[docs/wiki/Export-Schema.md](docs/wiki/Export-Schema.md) (JSON) und
[docs/wiki/Kontextpaket.md](docs/wiki/Kontextpaket.md) (Dateien des Pakets).

## Datenfluss

```text
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

Phasen 1 und 2 sind getrennt, damit Guardrails auf einer **festen, sortierten**
Auswahl greifen: sonst entschiede die Reihenfolge des Dateisystems, welche
Dateien ein Limit trifft. Ein Limit ist ein Schutzschalter, keine Schleuse:
Wird es erreicht, bricht der Lauf ab (CLI: Exit-Code 2), statt Dateien still
wegzulassen (**Fail Loud, Never Truncate Silent**). Ein dritter Weg neben dem
Paket ist die Einzeldatei (`--einzeln datei.md|json`), die es nur in der CLI
gibt.

## CLI

**Technik:** TypeScript 5, Node.js, `commander` für Argumente, `minimatch` für
Muster. Keine weiteren Laufzeit-Abhängigkeiten – Terminal-Ausgabe und
Fortschritt sind eigene Ausgabe, keine Fremdbibliothek.

| Modul | Aufgabe |
|---|---|
| `packages/core/src/` | **@propakt/core**: geteilter Kern (Sprache, Filter, Domänen, Schema) |
| `src/propakt.ts` | Einstieg: Argumente, Ablauf, Ausgabe |
| `src/update.ts` | Git-basierter Auto-Updater: Check + Update-Lauf |
| `src/scanner.ts` | Kandidaten sammeln, sortieren, Guardrails und Zähler |
| `src/slice.ts` | Slice-Selektoren: `--entrypoint`, `--depth`, `--top-files` |
| `src/history.ts` | Delta/History: `~/.propakt/history/`, Root-Commit-Identität |
| `src/zwischenspeicher.ts` | Scan-Cache: Baum-Signatur, `~/.propakt/cache/`, Treffer-Logik |
| `packages/core/src/filters.ts` | Include/Exclude-Muster und Katalog der Ignorierten |
| `src/propaktignore.ts` | `.propaktignore`: projektspezifische Ausschlüsse laden/mergen |
| `src/datei.ts` | Datei lesen, Binär-/Leerdateien erkennen, Zeilen zählen |
| `packages/core/src/sprache.ts` | Sprache nach Endung, Codeblock-Kennung |
| `packages/core/src/domaene.ts` | Domänen-Regel und Dateinamen im Paket |
| `src/paket.ts` | Paket bauen und schreiben |
| `src/paketBasis.ts` | gemeinsame Bausteine der Pakettexte |
| `src/paketKritik.ts` | `Kritik.md` (Godfiles, Mischungen, Artefakte, Doku) |
| `src/paketTexte.ts` | `Zusammenfassung.md`, `Architektur.md` |
| `src/paketQuellen.ts` | `Dokumentation.md`, `Quellen/<Domäne>.md` |
| `packages/core/src/schema.ts` | JSON-Vertrag (`kontext.json`, `--einzeln *.json`) |
| `src/formatter.ts` | Einzeldatei-Markdown |

## Desktop-App

**Technik:** Tauri v2, Rust-Backend, React 19 + TypeScript + Vite, Tailwind v4,
Plugins `dialog` und `opener`. Ein `fs`-Plugin gibt es bewusst nicht: Dateien
schreibt das Backend, Capabilities und Plugins bleiben dadurch deckungsgleich
(`capabilities/default.json` darf nur Permissions registrierter Plugins nennen).

| Modul | Aufgabe |
|---|---|
| `src-tauri/src/main.rs` | Start des Programms |
| `src-tauri/src/lib.rs` | Builder, Plugins, registrierte Kommandos |
| `src-tauri/src/scan.rs` | Kommando `scan`: Kandidaten, Limits, Fortschritt, Zwischenspeicher-Andock |
| `src-tauri/src/filter.rs` | Musterabgleich und Ignorier-Katalog |
| `src-tauri/src/paket.rs` | Kommando `paket_schreiben` |
| `src-tauri/src/domaene.rs` | Domänen-Regel |
| `src-tauri/src/paketbasis.rs`, `pakettexte.rs`, `paketquellen.rs` | Pakettexte |
| `src-tauri/src/kritik_regeln.rs`, `paketkritik.rs` | `Kritik.md` (Schwellwerte, Befunde) |
| `src-tauri/src/history.rs` | Delta/History im Backend: `~/.propakt/history/`, Identität |
| `src-tauri/src/zwischenspeicher.rs` | Scan-Cache: Baum-Signatur, `~/.propakt/cache/`, Treffer-Logik (Spiegel zu `src/zwischenspeicher.ts`) |
| `src-tauri/src/filterignore.rs` | `.propaktignore` im Backend (Spiegel zu `src/propaktignore.ts`) |
| `src-tauri/src/schema.rs` | JSON-Vertrag |
| `src-tauri/src/sprache.rs` | Sprache und Codeblock-Kennung |
| `src-tauri/src/fortschritt.rs` | Ereignis `scan-fortschritt` |
| `src-tauri/src/update.rs` | Auto-Updater: Kommandos `update_check`, `update_ausfuehren` |
| `src-tauri/src/live_store.rs` | Live-Speicher: SQLite-WAL `~/.propakt/live/<identitaet>.db` (Snapshots, Änderungen, Anomalien, Bestand, Kürzung) |
| `src-tauri/src/live_zyklus.rs` | Live-Tick-Kern: Kandidaten, Baum-Signatur, Vergleich, Änderungen (pur, getestet) |
| `src-tauri/src/live_kommandos.rs` | Live-Kommandos `live_start`/`live_stop`/`live_status`, Zyklus-Thread |
| `src-tauri/src/live_takt.rs` | Live-Taktgeber-Loop: Ticks, Ereignisse, Tray-Alarm, Beruhigung |
| `src-tauri/src/live_anomalie.rs` | Anomalie-Erkennung (Spiegel zu `packages/core/src/live.ts`) |
| `src-tauri/src/live_bremse.rs` | Intervall-Bremse: effektive Pause aus der Baum-Größe (Phase 5) |
| `src-tauri/src/live_zeitreihe.rs` | Live-Zeitreihe als Leseansicht: Snapshots → Graph-Punkte, Zeitraum-Filter (Phase 4) |
| `src-tauri/src/tray.rs` | Tray-Icon, Menü, Widget-Vordergrund-Hub, Tooltip-Alarm (Phase 3) |
| `src/HistoryGraph.tsx` | Verlaufs-Graph: JSONL-History + Live-Zeitreihe, zeitbasierte X-Achse, Zeitraum-Wahl (Phase 4) |
| `src/useVerlauf.ts` | Verlaufs-Daten laden: beide Serien + Zeitraum-Wahl (Phase 4) |
| `src/LiveOverlay.tsx` | Live-Widget (Overlay-Fenster): Ampel, Sparkline, Ticker, Badge, Intervall-Eingabe, Start/Stopp |
| `src/main.tsx` | Fenster-Routing: `?fenster=overlay` rendert das Live-Widget |
| `src/EinstellungenPanel.tsx` | Tab „Einstellungen“: alle Scan-Optionen + Start (vollständiger Changelog daneben) |
| `src/ScanStart.tsx`, `ChangelogBereich.tsx` | Start-Karte des Scan-Tabs; Changelog-Bereich im Einstellungen-Tab |
| `src/UpdateBereich.tsx` | Kopfzeile: Statuskreis (grau/gelb/grün) + Versions-Popup mit Notizen |
| `src/ErgebnisTabelle.tsx`, `ExportBereich.tsx` | Bedienung |
| `src/StatistikKarten.tsx`, `Hotspots.tsx`, `ScanHinweise.tsx` | Auswertung |
| `src/StatusLeiste.tsx`, `Fortschrittsbalken.tsx` | Rückmeldung |
| `src/llm.ts` | LLM-Verträge: Anbieter-Katalog (NVIDIA/OpenRouter/Anthropic), URL-Erkennung, Key-Maskierung, Modell-Listen |
| `src/LlmBeratung.tsx`, `LlmVerbindung.tsx`, `LlmFelder.tsx` | Beratungs-Panel: Anbieter-Dropdown, Modellauswahl, maskierter Key, Prompts, Auslöser |
| `src/live_beratung.tsx` | Beratung im Live-Widget je Auslöser (je Tick, periodisch) |
| `src-tauri/src/llm_bruecke.rs` | Kommando `llm_beratung`: HTTPS-only, Key nur im Request, keine Ablage |
| `src/api.ts`, `typen.ts`, `devMock.ts` | Backend-Zugriff, Typen, Vorschau-Mock |

**Kommandos:** `scan` (Rückgabe: `ScanErgebnis`), `paket_schreiben`
(geschriebene Dateinamen), `update_check`/`update_ausfuehren`
(Auto-Updater, Fortschritt per Ereignis `update-fortschritt`),
`live_start`/`live_stop`/`live_status` (Live-Modus, Ereignisse `live-tick`
und `live-anomalie`; Overlay-Widget über `?fenster=overlay` und
Tray-Menü; der Tray-Punkt „Einstellungen“ schaltet das Hauptfenster per
Ereignis `tray-navigieren` auf den Einstellungen-Tab). Der
Fortschritt läuft als Ereignis an der Oberfläche vorbei, damit ein langer
Scan nicht wie ein Hänger aussieht.

## Was beide gleich machen müssen

Die Gleichheit von CLI und App ist keine Absicht, sondern eine Prüfbedingung.
Beide Seiten setzen dieselben Regeln um:

- **Ignorier-Katalog:** Verzeichnisse wie `node_modules`, `.venv`, `target` oder
  `__pycache__` werden nie betreten. Die Liste lebt in
  `packages/core/src/filters.ts` (@propakt/core); das Frontend bezieht die
  Vorbelegung seines Ausschlussfelds von dort, das Rust-Backend spiegelt sie
  (`src-tauri/src/filter.rs`); `npm run pruefen` vergleicht die Kataloge.
- **Muster:** `*` überspannt keinen Verzeichnistrenner, Punktdateien sind
  eingeschlossen, geprüft werden relativer Pfad und Dateiname.
- **Reihenfolge:** Excludes vor Includes, leere Include-Liste bedeutet „alles“.
  Sortierung: Pfade ohne führenden Punkt zuerst, danach die Punktdateien,
  innerhalb der Gruppen aufsteigend.
- **Zähler:** übersprungene Dateien (binär, leer, gesperrt) zählen, Zeichen sind
  Bytes, Zeilen wie `str::lines()`.
- **Guardrails:** Ein Limit bricht den Scan vor der Verarbeitung ab; es gibt
  kein Teilergebnis und keinen Abbruchgrund mehr. Die App zeigt einen Fehler,
  die CLI endet mit Exit-Code 2.

## Bewusste Grenzen

- **Geteilter Kern statt geteilter Baustelle:** TypeScript-Regeln (Sprache,
  Filterkatalog, Domänen, Schema) leben einmal in `@propakt/core`
  (`packages/core/src/`) und werden von der CLI importiert. Das Rust-Backend
  spiegelt sie; der Abgleich bleibt als Prüfung organisiert (`npm run pruefen`).
- **Kein Git-Zugriff im Scan:** PROPAKT liest das Dateisystem. Einzige
  Ausnahme: die Delta-Module (`src/history.ts`, `src-tauri/src/history.rs`)
  fragen für die Identität den Root-Commit-Hash ab (`git rev-list
  --max-parents=0 HEAD`); Version, Branch oder Änderungen im Paket selbst
  bleiben außen vor.
- **Zwei Delta-Umsetzungen, ein Format:** CLI (`--delta`) und App (Checkbox
  „Änderungen zum letzten Lauf melden“) führen dieselbe zentrale History
  (`~/.propakt/history/<identitaet>.jsonl`) mit derselben Identitätslogik;
  der JSON-Vertrag `kontext.json` (Schema v2) bleibt delta-frei.
- **Zwischenspeicher in CLI und App:** `--cache` (CLI) bzw. der Schalter
  „Unveränderten Baum aus dem Cache holen“ (App) überspringen das Lesen,
  wenn die Baum-Signatur (Pfad, Größe, Änderungszeit) unverändert ist;
  der Vertrag lebt in `@propakt/core` (`zwischenspeicher.ts`), die
  Umsetzungen in `src/zwischenspeicher.ts` (CLI) und
  `src-tauri/src/zwischenspeicher.rs` (App). Version und Schema beider
  Seiten vergleicht `npm run pruefen`.
- **Keine Konfigurationsdatei:** Alle Optionen kommen aus Argumenten bzw. der
  Oberfläche; der Standard ist vollständig und nachvollziehbar.
- **Kein Inkognito-Modus:** Das Paket enthält Dateiinhalte im Klartext. Wer
  Zugangsdaten im Projekt liegen hat, schließt sie über Muster aus.
- **Kein GitHub-Import:** Repository-URLs werden nicht geklont; ein Input
  über System-Tokens (`GITHUB_TOKEN`, `gh auth token`) ist geplant und noch
  nicht gebaut.

## Prüfen

Die Kommandos stehen in [docs/wiki/Entwicklung.md](docs/wiki/Entwicklung.md); die Regeln
dahinter in [AGENTS.md](AGENTS.md).

## Lizenz

MIT – siehe [LICENSE](LICENSE).
