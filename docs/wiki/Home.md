# PROPSA Wiki – Startseite

**PROPSA** (Parser für Repomix Organisiert Prompt-Systeme für Analysen) macht aus
einem Projektordner ein **Kontextpaket für Sprachmodelle**: eine Datei je Domäne,
vollständiger Inhalt, maschinenlesbar als `kontext.json`.

## Begriffe

| Begriff | Bedeutung |
|---|---|
| **Domäne** | Oberster Ordner eines relativen Pfads; Unterordner gehören dazu |
| **Kandidat** | Datei, die Filter und Ignorier-Katalog passiert hat |
| **Übersprungen** | Datei, die nicht gelesen werden konnte (binär, leer, gesperrt) |
| **Guardrail** | Hartes Limit (`-m`/`-l`); wird es erreicht, bricht der Scan ab |
| **Slice-Selektor** | Zielbasierte Auswahl: `--entrypoint`, `--depth`, `--top-files` (nur CLI) |
| **Delta** | Vergleich zum letzten Lauf (`--delta` bzw. Checkbox in der App, `~/.propsa/history/`) |
| **Identität** | Root-Commit-Hash; ohne Git der normierte Pfad (Fallback) |
| **Einzeldatei** | Alternative Ausgabe `--einzeln datei.md\|json` (nur CLI) |

## Zwei Oberflächen, ein Vertrag

- **CLI** (`src/`): Einstieg `src/propsa.ts`, Argumente über `commander`.
- **App** (`tauri-app/`): Rust-Kommandos `scan` und `paket_schreiben`, React mit
  Vite und Tailwind v4.

Der Code wird nicht geteilt – der Vertrag schon: gleicher Ordner und gleiche
Optionen ergeben dieselben Dateien. Verbindlich sind
[Kontextpaket.md](Kontextpaket.md) und [Export-Schema.md](Export-Schema.md).

## Dokumente

- [INSTALL](../../INSTALL.md) – kanonische Installationsanleitung
- [CLI-Usage](CLI-Usage.md) – Befehle, Optionen, Beispiele
- [Kontextpaket](Kontextpaket.md) – der Vertrag für die Ausgabedateien
- [Export-Schema](Export-Schema.md) – der Vertrag für `kontext.json`
- [Tauri-App](Tauri-App.md) – Voraussetzungen, Bauen, Bedienung
- [Entwicklung](Entwicklung.md) – Bauen, Prüfen, Stolperfallen
- [Changelog](Changelog.md) – Versionshistorie
- [Architektur](../../ARCHITECTURE.md) – technischer Aufbau (liegt in der Wurzel)

## Version

**0.1.0** – dieselbe Version in `package.json`, `tauri-app/package.json`,
`tauri-app/src-tauri/Cargo.toml` und `tauri-app/src-tauri/tauri.conf.json`.
`npm run pruefen` prüft das.

## Lizenz

MIT – siehe [../../LICENSE](../../LICENSE).

## Autor

[@vannon091118](https://github.com/vannon091118)