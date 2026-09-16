# PROPSA – Installation (kanonisch)

Diese Datei ist die **einzige** verbindliche Installationsanleitung. Andere
Dokumente verweisen auf sie, statt Schritte zu kopieren – so kann nur hier
ein Stand von einem anderen abweichen.

## Voraussetzungen

| Werkzeug | Version | Wofür |
|---|---|---|
| Node.js | 18 oder neuer | CLI und Frontend-Build |
| npm | 9 oder neuer | Paketverwaltung (liegt Node bei) |
| Rust | 1.70 oder neuer | Tauri-Backend (nur für die Desktop-App) |
| Git | beliebig | optional: Root-Commit-Identität für `--delta` |

Windows: zusätzlich die **C++ Build Tools** (Visual Studio Build Tools oder
Visual Studio Community mit „Desktopentwicklung mit C++“).

## CLI installieren

```bash
git clone <repository-url> propsa    # oder Ordner herunterladen
cd propsa
npm install                          # Abhängigkeiten (commander, minimatch)
npm run installieren                 # Build + zentrale Ablage ~/.propsa
```

Danach steht der Befehl auf zwei Wegen bereit:

```bash
npm start -- <pfad> [optionen]       # aus dem Projektordner
# oder global verlinken:
npm link                             # danach: propsa <pfad> [optionen]
```

Prüfen der Installation:

```bash
npm run pruefen                      # LOC-Grenze, Versionen, Namen, Kataloge, Links
npm start -- . --einzeln kontext.md  # erster Lauf gegen das Projekt selbst
```

## Desktop-App installieren

```bash
cd tauri-app
npm install
npm run tauri build                  # Installer bauen (Windows: MSI und NSIS)
```

Der fertige Installer liegt unter `tauri-app/src-tauri/target/release/bundle/`.
Für die Entwicklung genügt `npm run tauri dev`; für eine reine Layout-Vorschau
ohne Rust-Build `npm run dev` (läuft über `src/devMock.ts` und beweist nur
Layout und Bedienung, nie Backend-Verhalten).

## Zentrale Ablage `~/.propsa`

`npm run installieren` baut CLI und Core und richtet die zentrale Ablage im
Benutzerverzeichnis ein:

```text
~/.propsa/
├── history/        Delta-History je Projekt-Identität (<hash>.jsonl)
└── version.json    Installations-Metadaten (Version, Zeitstempel)
```

Dort liegt alles, was PROPSA zwischen den Läufen behält – **außer dem
Output**: Kontextpakete und `--einzeln`-Dateien landen, wo sie angefordert
werden. Im gescannten Projekt bleibt nichts zurück.

**Entfernen:** `npm run deinstallieren` löscht `~/.propsa` nach Bestätigung
und löst ein vorhandenes `npm link`. Ausgaben (Output) und der Projektordner
selbst werden nicht angerührt.

## History/Delta einschalten (optional)

Nichts zu konfigurieren: Ab dem ersten Lauf mit `--delta` legt PROPSA
`~/.propsa/history/<identitaet>.jsonl` an – eine Datei je Projekt-Identität.
Ohne Git-Repository arbeitet die Identität über den normierten Pfad
(Fallback), mit Git über den stabilen Root-Commit-Hash.

## Fehlerbehebung

- **`npm run tauri dev` blockiert am Port 1420:** Vite hört auf `[::1]:1420`;
  IPv4-Werkzeuge zeigen nichts. Belegung prüfen mit
  `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 1420"`.
- **Rust-Build schlägt fehl:** C++ Build Tools fehlen (siehe Voraussetzungen).
- **`git rev-list` findet nichts:** Das Projekt hat keinen Commit – die
  Delta-Identität fällt auf den Pfad zurück; das Delta bleibt funktionsfähig.

## Version

Die Version steht in `package.json`, `tauri-app/package.json`,
`tauri-app/src-tauri/Cargo.toml` und `tauri-app/src-tauri/tauri.conf.json` und
ist überall gleich (`npm run pruefen` prüft das).

## Lizenz

MIT – siehe [LICENSE](LICENSE).