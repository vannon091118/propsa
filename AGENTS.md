# AGENTS.md

Dieses Dokument legt die Richtlinien für die Entwicklung in diesem Projekt fest.

## Prinzipien

- **Ausgabe und Dokumentation auf Deutsch**: Alle Ausgaben, Kommentare und Dokumentationen sollen in deutscher Sprache verfasst sein.
- **Modularer Aufbau**: Der Code soll modular aufgebaut sein, um Wartbarkeit und Übersichtlichkeit zu gewährleisten.
- **LOC-Grenze pro Datei**: Um Backdoors zu vermeiden und die Lesbarkeit zu erhöhen, soll jede Datei eine maximale Größe von 200 Zeilen Code (LOC) nicht überschreiten.
- **Eine Aufgabe - Ein Besitzer - Ein Modul**: Jede Aufgabe soll klar einem Besitzer zugewiesen werden und in einem eigenen Modul implementiert werden.
- **Eine Wahrheit je Regel**: Jeder Katalog, jedes Schema und jede Version hat genau eine Quelle; Kopien werden durch `npm run pruefen` verglichen. Der Ausschlusskatalog gehört deshalb immer zusammen geändert: `src/filters.ts`, `tauri-app/src-tauri/src/filter.rs`, `tauri-app/src/typen.ts`.
- **Dokumentation folgt dem Code**: Pfade, Optionen und Versionen in der Dokumentation müssen dem tatsächlichen Stand entsprechen – geplante Funktionen werden nicht als vorhanden beschrieben.
- **Keine erfundenen Angaben**: Keine Zahlen, Badges, Screenshots oder Funktionen in der Präsentation, die nicht gemessen bzw. umgesetzt sind. Lieber einen Abschnitt „Was diese Version nicht kann“.

## Namen und Versionen

- Produktname ist ausschließlich **PROPSA**.
- Die Version steht in `package.json`, `tauri-app/package.json`,
  `tauri-app/src-tauri/Cargo.toml` und `tauri-app/src-tauri/tauri.conf.json` und
  muss überall gleich sein.

## Prüfen

```bash
npm run pruefen                          # LOC-Grenze, Versionen, Namen, Kataloge, Links
npm run build                            # CLI: Typecheck
cd tauri-app && npm run build            # Frontend: tsc + Vite
cd tauri-app/src-tauri && cargo check    # Rust
```

Ein Lauf von `npm run pruefen` gehört vor jede Abgabe. Build-Stolperfallen
stehen in `wiki/Entwicklung.md`.

## Umgebung und Werkzeuge

- **Kein Git-Repository** (auch in keinem Elternverzeichnis): es gibt keinen Diff
  und keinen Rollback. Vor dem Löschen von Dateien bestätigen lassen.
- **Dateiendungen:** `.rs`, `.tsx`, teils auch `.json` liegen mit CRLF vor.
  Muster über Dateiinhalte müssen `\r?\n` zulassen, sonst finden sie nichts.
- **Vite hört auf `[::1]:1420`.** `netstat | grep 1420` (IPv4) zeigt nichts;
  PID und Port über `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 1420"`.
  Diese Portbindung blockiert `npm run tauri dev`.
- **Browser-Vorschau (`cd tauri-app && npm run dev`)** läuft über `src/devMock.ts`
  und beweist nur Layout und Bedienung, nie Backend-Verhalten (Scan, Limits,
  Ausgabe). Wirkliche Abnahme nur in der gestarteten App.
- **App starten und prüfen:** `cd tauri-app/src-tauri/target/release && (nohup ./propsa.exe &)`,
  dann `powershell -NoProfile -Command "Get-Process propsa | Select-Object Id,Responding,MainWindowTitle"`.
- **App fernsteuern ohne Klicks:** die Exe mit
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222"` starten und
  per CDP ein Node-Skript gegen das WebView laufen lassen (Kommandos aufrufen,
  `scan-fortschritt`-Ereignisse mitschreiben). Wegwerfskripte in
  `tauri-app/src-tauri/target/` ablegen und danach löschen.

## Ziel

Durch die Einhaltung dieser Richtlinien bleibt der Codebase sicher, wartbar und leicht verständlich.

---

## Shinon Agent

Shinon ist der passive, read-only Repository-Monitor, der im Hintergrund läuft und:

- Alle **5 Minuten** einen vollständigen Tree-Snapshot mit LOC-Zählung erstellt
- Ab dem **2. Snapshot** werden Änderungen zum vorherigen Snapshot erkannt
- Speichert Diff-Reports und deutsche, funnige Erklärungen der Änderungen
- Nutzt das **Heartbeat-Mechanismus** (`/heartbeat`) für alle 3-Minuten-Checks

### Konfiguration

Die Einstellungen befinden sich in `config.json` unter dem Schlüssel `shinon`:
- `interval_seconds`: Snapshot-Intervall (Standard: 300s / 5 Min)
- `snapshot_path`: Pfad für Snapshot-Dateien
- `diff_path`: Pfad für Diff-Reports
- `german_explanations`: Aktivierung deutscher Erklärungen
- `fun_mode`: Aktivierung des "fun-modus" (funnige Zusatz-Kommentare)

### Nutzung

- **On-Demand**: `!shinon status` oder `!shinon report`
- **Herzschlag**: Andere Bots nutzen `/heartbeat` für alle 3 Minuten einen schnellen Abgleich
- Snapshots finden sich in `snapshots/repo_snapshots/`
- Diffs und Erklärungen in `snapshots/diffs/`

### Wichtige Hinweise

- Shinon arbeitet **read-only** – er schreibt nur in den Snapshot-Ordner
- Alle 3 Minuten führt der Heartbeat einen schnellen Hash-Vergleich durch
- Alle 5 Minuten wird ein vollständiger Tree-Snapshot erstellt
- Deutsche Erklärungen werden bei jeder erkannten Änderung generiert
