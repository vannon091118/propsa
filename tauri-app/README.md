# PROPAKT – Desktop-App

Dieser Ordner enthält die Oberfläche von PROPAKT: Tauri v2 mit einem
Rust-Backend (`src-tauri/`) und einem React-Frontend (`src/`).

```bash
npm install
npm run dev           # nur Frontend im Browser (Mock, Port 1420)
npm run tauri dev     # Anwendung starten
npm run tauri build   # Installer bauen (Windows: MSI und NSIS-Setup)
```

Voraussetzungen, Kommandos und Stolperfallen beim Bauen:
[../docs/wiki/Tauri-App.md](../docs/wiki/Tauri-App.md) und
[../docs/wiki/Entwicklung.md](../docs/wiki/Entwicklung.md).

Lizenz: MIT – siehe [../LICENSE](../LICENSE).
