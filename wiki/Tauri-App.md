# PROPSA – Tauri-App

## Was ist die Tauri-App?

Die Desktop-Oberfläche von PROPSA: Tauri v2 mit Rust-Backend und React-Frontend,
rahmenlos (`decorations: false`) mit eigener Titelzeile in HTML/CSS
(`src/TitleLeiste.tsx`; Fenster-Kniffe über `core:window`-Permissions in
capabilities/default.json). Sie scannt Ordner, filtert Dateien, zeigt Umfang,
Sprachverteilung und Hotspots und schreibt das Kontextpaket in einen gewählten
Ordner.

## Voraussetzungen und Bauen

Node.js 18+, Rust 1.70+ und auf Windows die C++ Build Tools. Alle Schritte,
Ergebnisdateien und Stolperfallen: [Entwicklung.md](Entwicklung.md).

```bash
cd tauri-app
npm install
npm run tauri dev     # Entwicklung (Vite auf Port 1420)
npm run tauri build   # Installer bauen
```

## Bedienung

1. Ordner wählen (Dialog).
2. Einstellungen prüfen: Ausschlüsse (mit Katalog vorbelegt), optional Includes,
   Guardrail-Limits für Dateien und Zeilen sowie die Delta-Checkbox. Ein
   erreichtes Limit bricht den Scan mit Fehlermeldung ab – es gibt kein
   beschnittenes Ergebnis.
3. „Scan starten“ – Fortschrittsanzeige mit aktuellem Pfad, gelesenen Zeilen und
   übersprungenen Dateien.
4. Ergebnis prüfen: Kennzahlen, Sprachverteilung, Dateitabelle mit Sprach-Chips.
   Mit aktiver Delta-Checkbox zeigt ein zusätzlicher Block die Änderungen zum
   letzten Lauf (neu/geändert/entfernt/unverändert) und die Identität
   (Root-Commit-Hash, sonst Pfad). Die History
   (`~/.propsa/history/<identitaet>.jsonl`) führt das Rust-Backend
   (`src-tauri/src/history.rs`), Spiegel des CLI-Moduls `src/history.ts`.
5. Zielordner wählen und Paket schreiben.

Die Aufteilung der Dateien im Frontend und im Rust-Backend steht in
[../ARCHITECTURE.md](../ARCHITECTURE.md).

## Vorschau ohne Rust-Build

```bash
cd tauri-app
npm run dev
```

Im Browser greift `src/devMock.ts`; damit lassen sich Oberfläche und Layout ohne
Rust-Build prüfen. Port 1420 muss dafür frei sein.

## Lizenz

MIT – siehe [../LICENSE](../LICENSE).
