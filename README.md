![PROPSA – Kontextpakete für Sprachmodelle](assets/banner.svg)

# PROPSA

**PROPSA** (Parser für Repomix Organisiert Prompt-Systeme für Analysen) macht aus
einem Projektordner ein **Kontextpaket für Sprachmodelle**: mehrere Dateien statt
eines Riesenblobs, aufgeteilt nach Domänen, jeweils mit vollständigem Inhalt.

[English version](README.en.md)

[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-3fb950)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.0.18-4aa3ff)](package.json)
[![Plattform](https://img.shields.io/badge/Plattform-Windows%20%7C%20macOS%20%7C%20Linux-1e5bff)](#desktop-app)
[![Release](https://img.shields.io/github/v/release/vannon091118/propsa?label=Release&color=4aa3ff)](https://github.com/vannon091118/propsa/releases/latest)

Zwei Oberflächen, ein Vertrag: eine **CLI** (`src/`) für Skripte und
Automatisierung, eine **Desktop-App** (Tauri v2, `tauri-app/`) zum Klicken.

---

## Warum nicht einfach `cat`?

Weil ein Modell bei einem einzigen 12-MB-Dump den Zusammenhang verliert. Und
weil eine still gekürzte Ausgabe gar nicht merken lässt, dass etwas fehlt.
PROPSA folgt deshalb einem Prinzip: **Fail loud, never truncate silent.**

- **vollständig** – jede Datei mit ganzem Inhalt, nie abgeschnitten,
- **geordnet** – eine Datei je Domäne, damit ein Modell gezielt lesen kann,
- **ehrlich** – Limits sind Guardrails: Sie brechen ab (Exit-Code 2), statt
  ein unvollständiges Paket zu schreiben.

## Was drin ist

| Datei im Paket | Inhalt |
|---|---|
| `Zusammenfassung.md` | Einstieg: Umfang, Domänen, Sprachen, größte Dateien |
| `Architektur.md` | Verzeichnisbaum und Dateiübersicht je Domäne |
| `Kritik.md` | Struktur-Befunde: Godfiles, Logikmischung, Artefakte |
| `Dokumentation.md` | alle Markdown-Dateien im Volltext |
| `Quellen/<Domäne>.md` | vollständiger Code der Domäne |
| `kontext.json` | dieselben Daten maschinenlesbar (Schema-Version 2) |

Eine Domäne ist der **oberste Ordner** eines relativen Pfads: `tauri-app/src-tauri/src/scan.rs`
landet in `Quellen/tauri-app.md`, `README.md` in `Quellen/wurzel.md`.
Details: [docs/wiki/Kontextpaket.md](docs/wiki/Kontextpaket.md).

## Schnellstart

```bash
npm install
npm start /pfad/zu/meinem-projekt     # Paket nach ./propsa-kontext/
```

Die vollständige Installationsanleitung steht in [INSTALL.md](INSTALL.md) – sie ist
die einzige verbindliche Quelle, alle anderen Dokumente verweisen auf sie.

## CLI

```bash
# Eigener Zielordner, zusätzliche Ausschlüsse
npm start ~/Code/mein-projekt -o paket/ -e "*.min.js,*.log"

# Alles in eine einzige Datei statt in ein Paket
npm start ~/Code/mein-projekt --einzeln kontext.md
npm start ~/Code/mein-projekt --einzeln kontext.json
```

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
| `--depth <n>` | Slice: nur Dateien bis zu dieser Ordnertiefe |
| `--top-files <n>` | Slice: nur die n größten Dateien nach Zeilen |
| `--delta` | Delta zum letzten Lauf melden (`~/.propsa/history/`) |
| `--cache` | Ergebnis aus dem Zwischenspeicher holen, wenn der Baum unverändert ist (`~/.propsa/cache/`) |

Standard ist ein **vollständiger Scan**: kein Limit. Die Vorgabe schließt nur
Abhängigkeiten, Versionsverwaltung, Build-Artefakte und Caches aus.
`node_modules`, `__pycache__`, `.venv`, `target` und `dist` werden nie betreten
– auch dann nicht, wenn das Ausschlussfeld leer ist.

Projektspezifische, versionierbare Ausschlüsse gehören in eine
**`.propsaignore`** im Projekt-Root (Glob-Muster je Zeile, `!muster` hebt
einen Standard-Ausschluss auf). Details: [docs/wiki/CLI-Usage.md](docs/wiki/CLI-Usage.md).

### Delta und Zwischenspeicher

Mit `--delta` (CLI) bzw. der Checkbox „Änderungen zum letzten Lauf melden“
(App) meldet PROPSA die Änderungen zum letzten Lauf. Die History wohnt
zentral im Benutzerverzeichnis (`~/.propsa/history/<identitaet>.jsonl`),
im gescannten Projekt bleibt nichts zurück. Identifiziert wird das Projekt
über den Root-Commit-Hash (`git rev-list --max-parents=0 HEAD`) – stabil
über Branches, Pfade und Remote-URLs; ohne Git fällt die Identität auf den
Pfad zurück.

`--cache` prüft vorher die Baum-Signatur (Pfad, Größe, Änderungszeit) und
liefert das gespeicherte Ergebnis, wenn der Baum unverändert ist. Installieren
und entfernen:

```bash
npm run installieren    # Build + zentrale Ablage ~/.propsa einrichten
npm run deinstallieren  # ~/.propsa entfernen (mit Bestätigung)
```

`~/.propsa` nimmt alles auf, was PROPSA zwischen den Läufen behält – außer
dem Output: Kontextpakete und `--einzeln`-Dateien landen dort, wo sie
angefordert werden.

### Auswahl per Ziel statt per Limit

Der frühere Kompaktmodus (`-c`) ist entfernt. Statt arbiträrer Grenzen
(≤ 500 Zeilen, ≤ 50 Dateien) wählt man ein Ziel: `--entrypoint` folgt der
Import-Kette, `--depth` begrenzt die Tiefe, `--top-files` nimmt die größten
Dateien. Details: [docs/wiki/CLI-Usage.md](docs/wiki/CLI-Usage.md).

## Desktop-App

Tauri v2, Rust-Backend und React-Frontend mit eigener Titelzeile
(`decorations: false`): Ordner wählen, Guardrail-Limits setzen,
Ergebnis-Tabelle ansehen, Zielordner wählen, Paket schreiben. Wird ein Limit
erreicht, zeigt die App eine Fehlermeldung – niemals ein beschnittenes
Ergebnis.

```bash
cd tauri-app
npm install
npm run tauri dev     # Entwicklung
npm run tauri build   # Installer bauen (Windows: MSI und NSIS-Setup)
```

Voraussetzungen: Node.js 18+, Rust 1.70+ und auf Windows die **C++ Build Tools**
(Visual Studio Build Tools oder Visual Studio Community mit „Desktopentwicklung
mit C++“). Stolperfallen beim Bauen stehen in [docs/wiki/Entwicklung.md](docs/wiki/Entwicklung.md).

### Live-Modus (Agenten-Wächter)

Die App kann sich als **Tray-Icon in den Hintergrund** setzen und einen
beobachteten Projektordner im **Live-Zyklus** verfolgen: Scan → Abgleich →
nächster Tick, sequenziell, nie überlappend. Ein transparentes
**Overlay-Widget** zeigt Ampel, Datei-/Zeilen-Zahlen, Sparkline und das
Änderungs-Journal; Snapshots landen persistent in
`~/.propsa/live/<identitaet>.db` (SQLite, WAL) und erweitern den
History-Graphen um eine zweite Zeitreihe.

Erkennt der Zyklus **Anomalien** – Flattern, Regression, Pendeln, Löschsturm,
Explosion, Limitbruch, Kohorten-Differenzen – blinkt das Tray-Icon dezent und
das Widget holt sich bei schweren Befunden einmalig in den Vordergrund. Eine
**Intervall-Bremse** verlängert die Pause bei großen Bäumen stufenweise;
Guardrail-Brüche werden laut gemeldet, schreiben aber nichts.
Details: [docs/wiki/Live-Modus.md](docs/wiki/Live-Modus.md).

### LLM-Beratung

Im Einstellungen-Tab kann ein Sprachmodell den Projektzustand deuten lassen.
Eingetragen sind **NVIDIA NIM**, **OpenRouter** und **Anthropic**; der
Anbieter wird aus der Basis-URL erkannt, unbekannte URLs bleiben zur manuellen
Wahl. Auslöser sind auf Knopfdruck, nach jedem Live-Tick oder periodisch.

**Sicherheit (fail closed):** API-Keys werden nie im Klartext gespeichert. Im
Tauri-Store liegt nur die Maske (`sk-a…1234`); der echte Key lebt
ausschließlich im laufenden Prozess und geht je Beratungsauftrag an die
Backend-Brücke, die ihn nur an den Provider schickt.

## Beide Oberflächen liefern dasselbe

CLI und App teilen nicht nur den **Vertrag**, sondern seit 0.0.17 auch den
**Code**: Sprach-Erkennung, Filterkatalog, Domänen-Regel und Export-Schema
liegen einmal in `packages/core/src/` (`@propsa/core`), die CLI importiert sie
direkt, die Rust-Brücke bildet dieselben Regeln nach. `npm run pruefen`
vergleicht beide Seiten Katalog für Katalog.

Der Scanner sammelt erst alle Kandidaten, sortiert sie und liest sie dann –
dadurch hängt die Auswahl nicht von der Reihenfolge des Dateisystems ab und ein
Guardrail trifft immer dieselben Dateien.

## Bausteine

`bausteine/` hält **Verträge, keine Funktionen**: sieben Muster
(Vermittlung, Prüfung, Beobachtung, Prompts, Laufzeit, Übersicht, Integration),
je eine Dokumentation mit Entscheidung, Mechanik und Grenze, und je eine
Vertragsdatei. Eine Regel gilt erst als implementiert, wenn alle sieben
Punkte belegbar sind – `POSITIVE`, `FORBIDDEN`, `FALLBACK`, `ERROR`, `TRACE`,
`REPLAY`, `INVARIANT`.

Der Stand ist ausgewiesen und nicht beschönigt: **sechs Bausteine stehen auf
`STUB`** (bewusst nicht gebaut – eine Entscheidung, keine offene Stelle), der
Baustein Integration ist als `IMPLEMENTED` geführt. Es gibt hier keine
versteckten Features: [docs/wiki/Bausteine.md](docs/wiki/Bausteine.md).

## Beispiele und Artefakte

Releases entstehen automatisch: Ein Push eines `v*`-Tags löst die
GitHub-Action aus (prüfen, bauen, Release mit Artefakten für
Windows/Linux/macOS). `npm start -- update --nur-pruefen` prüft gegen
`origin/main`, `npm start -- update` übernimmt neue Commits per
Fast-Forward und installiert neu. Die App zeigt in der Kopfzeile denselben
Check und einen Update-Button.

## Projekt-Struktur

```text
.
├── src/                CLI (TypeScript), Einstieg: src/propsa.ts
├── packages/core/      Geteilter Kern @propsa/core (Typen, Regeln, Schema)
├── tauri-app/          Desktop-App (React-Frontend, Rust-Backend)
├── bausteine/          Verträge und Muster (dokumentiert, kein Code)
├── agents/mcp-server/  MCP-Server für den Projektüberblick
├── assets/             Banner und Logo
├── docs/wiki/          Verträge und Anleitungen
├── scripts/            pruefen.mjs – Konsistenzprüfung
├── tests/              Doku- und Verhaltenstests (ts-node)
├── ARCHITECTURE.md     Module und Datenfluss
├── INSTALL.md          kanonische Installationsanleitung
└── LICENSE             MIT
```

## Was diese Version nicht kann

Damit niemand nach Funktionen sucht, die es nicht gibt: **kein**
GitHub-URL-Import und **keine** CI-Workflows für externe Projekte. PROPSA arbeitet
ausschließlich auf dem lokalen Dateisystem. Der Live-Modus beobachtet ein Projekt
gleichzeitig und arbeitet mit Timer-Ticks (kein FS-Watcher): Änderungen
sind erst mit dem nächsten Tick sichtbar. Er meldet Anomalien, greift
aber nie ein (kein Kill, kein Revert) und läuft nur in der App, nicht in
der CLI. Sechs der sieben Bausteine sind Vertrag, nicht Funktion.

## Regeln im Repo

Vier Regeln werden maschinell geprüft, nicht nur behauptet:

| Regel | Prüfung |
|---|---|
| Maximal 300 Zeilen je Quelldatei | `npm run pruefen` |
| Eine Version in allen Manifesten | `npm run pruefen` |
| Core-Kataloge deckungsgleich zu Rust | `npm run pruefen` |
| Jeder Commit nennt Bildsprache, alle Dateien und LOC | `scripts/pruefen/commit_gate.mjs` (Haken) |

```bash
npm run pruefen              # Konsistenzprüfung (LOC, Versionen, Kataloge, Links)
npm run architecture:check   # jede Datei einem Modul zugeordnet
```

## Installation

Die kanonische Installationsanleitung steht in [INSTALL.md](INSTALL.md);
sie ist die einzige verbindliche Quelle für Installations-Schritte.

## Lizenz

MIT – siehe [LICENSE](LICENSE).

## Autor

[@vannon091118](https://github.com/vannon091118)
