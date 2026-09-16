# PROPSA – CLI-Usage

## Was ist die CLI?

Ein TypeScript-Programm (Node.js 18+, `commander`, `minimatch`), das ein
Projektverzeichnis scannt, filtert und als Kontextpaket schreibt.

## Installation

```bash
npm install
```

## Aufruf

```bash
npm start <pfad> [optionen]
# oder direkt:
npx ts-node src/propsa.ts <pfad> [optionen]
```

`<pfad>` ist ein Verzeichnis; ein Dateipfad wird mit Fehlermeldung abgelehnt.

## Grundprinzip: Fail Loud, Never Truncate Silent

- Der Scan ist standardmäßig **vollständig** – jede Datei kommt mit ganzem
  Inhalt ins Paket.
- `-m` und `-l` sind **Guardrails**: Wird ein Limit erreicht, bricht der Scan
  mit einer klaren Fehlermeldung und **Exit-Code 2** ab. Es wird kein
  unvollständiges Paket geschrieben.
- `--no-limits` schaltet alle Guardrails ab (OOM-Risiko bewusst übernommen).

## Optionen

| Flag | Bedeutung |
|------|-----------|
| `-o, --output <ordner>` | Zielordner des Pakets (Standard: `propsa-kontext`) |
| `--einzeln <datei>` | Statt des Pakets eine einzelne Datei (`.md` oder `.json`) |
| `-e, --exclude <muster>` | Weitere Glob-Muster zum Ausschließen (Komma-getrennt) |
| `-i, --include <muster>` | Nur diese Muster einbeziehen (leer = alles) |
| `-m, --max-files <n>` | Guardrail: hartes Dateilimit (Abbruch mit Exit-Code 2) |
| `-l, --max-lines <n>` | Guardrail: hartes Zeilenlimit (Abbruch mit Exit-Code 2) |
| `--no-limits` | Alle Guardrails abschalten |
| `--entrypoint <datei>` | Slice: Einstiegsdatei plus lokale Import-Kette |
| `--depth <n>` | Slice: nur Dateien bis zu dieser Ordnertiefe (≥ 1) |
| `--top-files <n>` | Slice: nur die n größten Dateien nach Zeilen |
| `--delta` | Delta zum letzten Lauf melden (`.propsa/history.json`) |

## Slice-Selektoren statt Kompaktmodus

Der frühere Kompaktmodus (`-c`, ≤ 500 Zeilen, ≤ 50 Dateien) ist entfernt.
Statt arbiträrer Grenzen wählt man ein **Ziel**:

```bash
# Alles, was der Einstiegspunkt über relative Imports erreicht
npm start ~/Code/mein-projekt --entrypoint src/main.ts

# Nur die oberste Ordnerebene
npm start ~/Code/mein-projekt --depth 1

# Die 20 größten Dateien
npm start ~/Code/mein-projekt --top-files 20

# Kombiniert: Einstiegspunkt, dann auf 30 Dateien kappen
npm start ~/Code/mein-projekt --entrypoint src/main.ts --top-files 30
```

Selektoren dürfen kombiniert werden und schneiden Schritt für Schritt zurück;
die kanonische Scan-Reihenfolge bleibt immer erhalten.

## Delta: `--delta` und `.propsa/history.json`

```bash
npm start ~/Code/mein-projekt --delta
```

Nach jedem Lauf mit `--delta` hängt PROPSA einen Eintrag (Zeitstempel,
Identität, Inhalts-Hash je Datei) an `.propsa/history.json` in der
Scan-Basis an und trägt `.propsa/` automatisch in deren `.gitignore` ein.
Beim nächsten Lauf meldet die CLI:

- **Erstlauf:** History angelegt, Identität notiert.
- **Folgeläufe:** je Datei `+` neu, `~` geändert, `-` entfernt
  (je Kategorie maximal 20 Zeilen, Rest als Summe).

**Identität:** primär der Root-Commit-Hash (`git rev-list --max-parents=0
HEAD`), der über Branches, Pfade und Remote-URLs stabil bleibt. Ohne
Git-Repository/Commit wird der normierte Pfad als Fallback gehasht; die
Herkunft steht in jedem Eintrag (`herkunft: "root-commit" | "pfad"`).

Die History wird auf 50 Einträge gekürzt und gehört nie in ein Paket:
`.propsa` steht im Ignorier-Katalog von CLI, Rust und Frontend.
Ein abweichender Scan (andere Includes/Limits/Slices) erzeugt ein Delta
genau so, wie die Dateien dann eben stehen.

## Projektspezifische Ausschlüsse: `.propsaignore`

Im Projekt-Root kann eine **versionierbare** `.propsaignore` liegen:

```text
# eine Zeile = ein Glob-Muster, # = Kommentar
geheim.txt
intern/**/*.md

# Negation: hebt einen Standard-Ausschluss auf
!vendor/
```

Semantik (identisch in CLI und App):

- positive Zeilen ergänzen die eingebauten Ausschlüsse (Katalog,
  Lockfiles, `-e`-Muster) – sie schließen zusätzlich aus,
- `!muster` **negiert**: eingebaute Muster mit demselben Pfad-Präfix
  werden entfernt (`!vendor/` hebt `vendor/**` auf) und ein
  Katalog-Verzeichnis desselben Namens wird wieder betreten,
- gematcht wird gegen relativen Pfad und Dateinamen wie bei `-e`,
- die Datei selbst und `.propsa/` werden nie gescannt.

Die CLI meldet einen aktiven Ausschluss mit
`📜 .propsaignore eingelesen`. Das Gegenstück in der GUI liegt in
`tauri-app/src-tauri/src/filterignore.rs`.

## Beispiele

```bash
# Paket nach ./propsa-kontext/
npm start ~/Code/mein-projekt

# Eigener Zielordner und zusätzliche Ausschlüsse
npm start ~/Code/mein-projekt -o paket/ -e "*.min.js,*.log"

# Nur Rust- und TypeScript-Dateien
npm start ~/Code/mein-projekt -i "*.rs,*.ts"

# Alles in einer Datei
npm start ~/Code/mein-projekt --einzeln kontext.md
npm start ~/Code/mein-projekt --einzeln kontext.json
```

## Ausgabe

Standard ist das **Kontextpaket**; Aufbau und Vertrag stehen in
[Kontextpaket.md](Kontextpaket.md), das JSON in
[Export-Schema.md](Export-Schema.md). Die CLI meldet beim Lauf:

- Anzahl gefundener Dateien,
- Anzahl übersprungener Dateien (binär, leer, gesperrt),
- bei Slice-Selektoren die gewählte Menge,
- die geschriebenen Dateien.

Bei einem Guardrail-Treffer gibt es **keine** Ausgabedateien, sondern nur die
Fehlermeldung und Exit-Code 2.

## Filter-Logik

1. Verzeichnisse aus dem Ignorier-Katalog (`node_modules`, `.git`, `dist`,
   `target`, `__pycache__`, `.venv` …) werden gar nicht erst betreten.
2. **Excludes** schließen aus – zuerst geprüft.
3. **Includes**: leere Liste bedeutet „alles“, sonst bleibt nur, was passt.
4. Gematcht wird gegen relativen Pfad und Dateinamen; `*` überspannt keinen
   Verzeichnistrenner, Punktdateien sind eingeschlossen.

## Prüfen

```bash
npm run build      # Typecheck und Übersetzung
```

Die Regeln des Projekts prüft `npm run pruefen` (siehe
[Entwicklung.md](Entwicklung.md)).

## Lizenz

MIT – siehe [../LICENSE](../LICENSE).
