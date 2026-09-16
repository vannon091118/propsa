# PROPSA – Desktop-App

Dieser Ordner enthält die Oberfläche von PROPSA: Tauri v2 mit einem
Rust-Backend (`src-tauri/`) und einem React-Frontend (`src/`).

```bash
npm install
npm run dev           # nur Frontend im Browser (Mock, Port 1420)
npm run tauri dev     # Anwendung starten
npm run tauri build   # Installer bauen (Windows: MSI und NSIS-Setup)
```

Voraussetzungen, Kommandos und Stolperfallen beim Bauen:
[../wiki/Tauri-App.md](../wiki/Tauri-App.md) und
[../wiki/Entwicklung.md](../wiki/Entwicklung.md).

Lizenz: MIT – siehe [../LICENSE](../LICENSE).
