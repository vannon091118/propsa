# PROPSA – Entwicklung

## Bauen

### CLI

```bash
npm install
npm run build                      # Typecheck und Übersetzung nach dist/
npm start ~/Code/mein-projekt      # Lauf über ts-node
```

### Desktop-App

```bash
cd tauri-app
npm install
npm run build          # Frontend (tsc + Vite)
npm run tauri build    # Anwendung und Installer
```

Ergebnis eines erfolgreichen Builds:

- `tauri-app/src-tauri/target/release/propsa.exe`
- `tauri-app/src-tauri/target/release/bundle/msi/PROPSA_0.1.0_x64_en-US.msi`
- `tauri-app/src-tauri/target/release/bundle/nsis/PROPSA_0.1.0_x64-setup.exe`

## Prüfen

```bash
npm run pruefen                          # Regeln des Projekts
npm run build                            # CLI: Typecheck
cd tauri-app && npm run build            # Frontend: tsc + Vite
cd tauri-app/src-tauri && cargo check    # Rust
```

`npm run pruefen` kontrolliert: Zeilenbegrenzung (200 LOC), eine Version in allen
Manifesten, keine alten Produktnamen, gleicher Ignorier-Katalog in CLI, Rust und
Frontend sowie alle relativen Links in den Dokumenten.

## Stolperfallen (jede kostet sonst einen Build-Zyklus)

1. **Laufende App blockiert den Build.** `propsa.exe` muss vor
   `npm run tauri build` beendet sein, sonst scheitert das Überschreiben mit
   `failed to remove propsa.exe`.
2. **Icons niemals mit `sharp` erzeugen.** `sharp` kann kein ICO und legt
   PNG-Daten unter `icon.ico` ab; der Build bricht dann mit
   `RC2175: resource file icon.ico is not in 3.00 format` ab. Stattdessen
   `node scripts/generate-icons.mjs` in `tauri-app/` verwenden – das Skript
   rendert ein 1024×1024-PNG und ruft `tauri icon` auf.
3. **`tauri.conf.json` muss in `src-tauri/` liegen.** Daneben sucht die
   Tauri-CLI ein `Cargo.toml` im falschen Verzeichnis
   (`failed to watch … Cargo.toml`) und `frontendDist: "../dist"` zeigt ins Leere.
4. **Capabilities und Plugins müssen zusammenpassen.** In
   `src-tauri/capabilities/default.json` dürfen nur Permissions von Plugins
   stehen, die auch in `src-tauri/Cargo.toml` als Dependency auftauchen – sonst
   scheitert das Build-Script mit `Permission fs:default not found`.
5. **Port 1420 muss frei sein.** Läuft dort noch ein Vite-Prozess (etwa die
   Browser-Vorschau), startet `npm run tauri dev` nicht sauber.

## Voraussetzungen

- Node.js 18+
- Rust 1.70+
- Windows: C++ Build Tools (Visual Studio Build Tools oder Community mit
  „Desktopentwicklung mit C++“)

## Tests

- Automatisiert geprüft wird über `npm run pruefen` (Regeln und Konsistenz).
- Der Abgleich zwischen CLI und App ist ein manueller Lauf: denselben Ordner
  einmal per CLI, einmal per App scannen und die Paketdateien vergleichen.
- Unit-Tests gibt es derzeit nicht.

## Deploy

- **CLI:** über npm (`bin: propsa`) oder direkt über `ts-node`.
- **App:** Tauri-Bundle; aktiviert sind MSI und NSIS-Setup. Weitere Ziele lassen
  sich in `tauri.conf.json` unter `bundle.targets` ergänzen.

## Lizenz

MIT – siehe [../../LICENSE](../../LICENSE).
