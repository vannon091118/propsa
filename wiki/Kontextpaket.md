# Kontextpaket

PROPSA legt seinen Kontext als **Ordner mit mehreren Dateien** an. Statt einer
großen Datei entsteht je Domäne eine eigene Datei; ein Sprachmodell kann damit
gezielt nur die Teile lesen, die es braucht.

Die Umsetzung steht in `src/paket*.ts` (CLI) und
`tauri-app/src-tauri/src/paket*.rs` (GUI). Beide Seiten erzeugen dieselben
Dateien mit demselben Inhalt.

## Aufbau

```text
<Zielordner>/
├── Zusammenfassung.md      Einstieg: Umfang, Domänen, Sprachen, größte Dateien
├── Architektur.md          Verzeichnisbaum und Dateiübersicht je Domäne
├── Kritik.md               Struktur-Befunde: Godfiles, Mischungen, Artefakte, Doku-Lügen
├── Dokumentation.md        alle Markdown-Dateien im Volltext
├── Quellen/
│   ├── <Domäne>.md         vollständiger Code der Domäne
│   └── wurzel.md           Dateien direkt in der Scan-Basis
└── kontext.json            dieselben Daten maschinenlesbar (siehe Export-Schema.md)
```

## Domänen

Eine **Domäne ist der oberste Ordner** eines relativen Pfads. Unterordner
gehören zur Domäne ihres Root-Ordners:

| Pfad | Domäne | Datei im Paket |
|---|---|---|
| `src/scanner.ts` | `src` | `Quellen/src.md` |
| `tauri-app/src/App.tsx` | `tauri-app` | `Quellen/tauri-app.md` |
| `tauri-app/src-tauri/src/scan.rs` | `tauri-app` | `Quellen/tauri-app.md` |
| `README.md` | `wurzel` | `Quellen/wurzel.md` |

Der Dateiname ist der Domänenname, bereinigt auf `A-Z a-z 0-9 . _ -`; alle
anderen Zeichen werden zu `-`. Zwei Domänen, die sich nur in Groß- und
Kleinschreibung unterscheiden, landen dadurch in einer Datei.

Reihenfolge: Domänen alphabetisch, `wurzel` zuletzt (es ist der Rest, nicht der
Einstieg). Innerhalb einer Domäne bleibt die Scan-Reihenfolge erhalten.

## Eine Datei, ein Inhalt

Jede gescannte Datei erscheint im Paket **genau einmal** mit vollständigem
Inhalt:

- Markdown-Dateien stehen in `Dokumentation.md` (die Doku-Linse).
- Alle anderen Dateien stehen in `Quellen/<Domäne>.md`.

`Architektur.md`, `Zusammenfassung.md` und `Kritik.md` enthalten keinen
Dateiinhalt, sondern Landkarte, Kennzahlen und Struktur-Befunde. `kontext.json`
enthält alle Dateien mit Inhalt, damit ein Werkzeug das Paket maschinell
weiterverarbeiten kann.

## Vollständigkeit

Ein Paket ist immer vollständig: Limits sind Guardrails und brechen den Scan
**vor** der Verarbeitung ab – dann gibt es gar kein Paket, sondern einen
Fehler (CLI: Exit-Code 2). Im Kopf der Paketdateien steht nur noch der
Hinweis `nicht lesbar`, wenn das Dateisystem Dateien nicht hergab.
Fail Loud, Never Truncate Silent.

`Kritik.md` ist eine Linse, keine Domäne: sie gruppiert dieselben Dateien
nach Schwere (Godfiles, Logikmischung, Artefakte, Doku-Wahrheit) und ist
maschinenunabhängig aus vorhandenen LOC-/Regex-/Pfadlisten gebaut – kein AST.

Zahlen stehen ohne Tausendertrenner und Datumsangaben als lokale Zeit
`YYYY-MM-DD HH:MM:SS` – sonst hinge die Ausgabe vom Gebietsschema ab.

## Erzeugen

```bash
# CLI: Paket (Standard), Zielordner optional
npx ts-node src/propsa.ts . -o propsa-kontext

# CLI: alles in eine Datei
npx ts-node src/propsa.ts . --einzeln kontext.md
npx ts-node src/propsa.ts . --einzeln kontext.json

# App: Ordner wählen, dann „Zielordner wählen und Paket schreiben“
```

Gleicher Ordner und gleiche Optionen ⇒ gleiche Dateinamen und gleiche Inhalte.
Unterschiedlich sind nur der Projektpfad in `**Projekt:**` (die App übernimmt ihn
aus dem Ordnerdialog, die CLI den übergebenen Pfad) und der Zeitstempel.
