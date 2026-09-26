# AGENTS.md

## Arbeitsregeln

- Antworten, Kommentare und Dokumentation auf Deutsch verfassen.
- Vor jedem `npm`- oder `npx`-Befehl Zustimmung einholen; npm-Prozesse wegen der Hardware nie parallel starten.
- Manifeste, Lockfiles, Skripte und CI-Konfiguration sind die ausführbare Wahrheit; bei Widersprüchen these Quellen vor README, `CLAUDE.md` und Wiki-Dokumenten verwenden.
- Das Repository ist ein Git-Repository. Vor dem Löschen, Zurücksetzen, Stashen oder breiten Reinigen Bestätigung einholen und den Arbeitsbaum nicht mit fremden Änderungen überschreiben.
- `npm run pruefen` ist vor jeder Abgabe Pflicht. Die harte Grenze sind 300 Quellzeilen; 200 ist die Zielgröße. Beim Berühren größerer Dateien nach Möglichkeit modularisieren.
- Keine geplanten Funktionen, unbelegten Zahlen oder alten Produktnamen als vorhanden dokumentieren.

## Commit-Gate

Jeder Commit-Text wird von `scripts/pruefen/commit_gate.mjs` geprüft, aufgerufen über den Haken `.githooks/commit-msg` (`core.hooksPath` zeigt auf `.githooks/`). Fünf Regeln, alle maschinell:

1. **PROPAKT-Bildsprache.** Keine englischen Flusswörter, keine ASCII-Umschreibungen deutscher Umlaute. Wörtliches Werkzeugzitat in Anführungszeichen ist erlaubt — es ist eine Tatsache, keine Sprachwahl. Die Liste der Umschreibungen steht im Skript und ist bewusst ein Stammverzeichnis, keine Sprachprüfung: „pruefen" ist der Name des Prüfskripts und bleibt deshalb erlaubt.
2. **Erklärung im Body.** Der Betreff allein zählt nicht als Begründung. Der Body nennt, warum geändert wurde, mindestens 120 Zeichen.
3. **Jede gestagte Datei namentlich.** Das Gate liest die Dateien selbst aus dem Index (`git diff --cached --name-status -M`), bei Umbenennungen zählen alte und neue Pfade. Der Pfad muss wörtlich im Text stehen.
4. **LOC-Zähler im Wortlaut.** Die Zeile `LOC: <Zahl> Dateien, größte <Zahl> Zeilen (Grenze 300)` muss stehen. Erzeugt wird sie aus `scripts/pruefen/loc.mjs` — dieselbe Quelle, die `npm run pruefen` zählt. Bei Abweichung nennt das Gate die erwartete Zeile.
5. **Keine Aufzählungszeichen.** Weder `-`, `*`, `•` noch `1.` am Zeilenanfang. Ausgenommen sind die Trailer-Zeilen (`Co-Authored-By:`, `Reviewed-by:`, `Signed-off-by:`) und die `LOC:`-Zeile. Fließtext statt Liste.

Umgehen lässt sich der Haken mit `git commit --no-verify`. Das ist Absicht: ein Gate, das sich nicht abschalten lässt, wird umgangen, indem man es löscht. Die CI (`release.yml`) läuft erst beim Tag-Push und ersetzt die lokale Prüfung nicht.

### Der Committext wird vorbereitet

Zwei der fünf Regeln sind mechanisch: die LOC-Zeile im Wortlaut und jede gestagte Datei namentlich. Beides schreibt `npm run commit:text` in eine Datei, aus derselben Quelle, gegen die das Gate prüft — `loc.mjs` für die Zahl, `gestagteDateien()` aus `scripts/dateien.mjs` für die Pfade. Der Mensch ersetzt nur Betreff und Begründung und committet mit `git commit -F <datei>`.

Das ist kein Bypass. Das Gate prüft den Text, nicht das Tippen, und prüft ihn unverändert weiter. Was sich ändert, ist die Frage: von „habe ich daran gedacht" zu „widerspreche ich dem Werkzeug". Regel 2 misst ab der Anhangsmarke aus `commit_anhang.mjs` und damit nur den Teil, der dem Menschen gehört — sonst könnten genug Pfade plus LOC-Zeile die Begründung ersetzen, ohne dass jemand schreibt.

Die Vorlage bleibt absichtlich unausgefüllt: leerer Betreff und zu kurze Begründung lassen den Lauf mit zwei Meldungen scheitern, die beide auf die offene Stelle zeigen.

## Paketgrenzen und Einstiegspunkte

- `package.json` ist die npm-Workspace-Wurzel und enthält nur `packages/*`; einziges Workspace-Mitglied ist `@propakt/core` unter `packages/core/`.
- `tauri-app/` ist ein eigenständiges privates npm-Paket mit eigener Lockdatei und **kein** Root-Workspace-Mitglied. Es bindet `@propakt/core` per `file:../packages/core` und baut den Core in `dev` und `build` vorab.
- Das MCP-Paket unter `agents/` ist optional, eigenständig, hat eine eigene Lockdatei und gehört nicht zum Root-Workspace. Seinen genauen Pfad führt `agents/INDEX.json`.
- CLI-Einstieg: `src/propakt.ts`; Core-Einstieg: `packages/core/src/index.ts`; Frontend-Einstieg: `tauri-app/src/main.tsx`; Rust-Start: `tauri-app/src-tauri/src/main.rs` → `lib.rs`.
- Die aktuellen Eigentümer- und Dateiindizes stehen in `INDEX.json` und den jeweiligen Unterordner-`INDEX.json`; bei neuen oder verschobenen Dateien zuerst dort nachsehen. Der Datenfluss ist in `ARCHITECTURE.md` beschrieben.
- Root und Core kompilieren nach CommonJS, das Tauri-Frontend als ESM. Deshalb ist `optimizeDeps.include: ["@propakt/core"]` in `tauri-app/vite.config.ts` nötig.
- Laufzeitdaten liegen zentral unter `~/.propakt/` (`history/`, `cache/`, `live/`); der Output bleibt im angeforderten Ziel. History ist JSONL mit höchstens 50 Einträgen; Identität bevorzugt über den Root-Commit-Hash, sonst über den Pfad.

## Verträge und Spiegel

- `packages/core/src/` ist die einzige TypeScript-Quelle für Sprach-, Filter-, Domänen- und Schema-Regeln. Das Frontend bezieht `STANDARD_AUSSCHLUESSE` in `tauri-app/src/typen.ts` aus `@propakt/core`.
- Diese Core-/Rust-Paare synchron halten: `filters.ts` ↔ `filter.rs`, `sprache.ts` ↔ `sprache.rs`, `schema.ts` ↔ `schema.rs`, `domaene.ts` ↔ `domaene.rs`, `live.ts` ↔ `live_anomalie.rs`.
- Cache: `packages/core/src/zwischenspeicher.ts` ↔ `src/zwischenspeicher.ts` ↔ `tauri-app/src-tauri/src/zwischenspeicher.rs`. History ist **nicht** im Core, sondern `src/history.ts` ↔ `tauri-app/src-tauri/src/history.rs`.
- `npm run pruefen` vergleicht tatsächlich Filterkataloge, Sprach-/Fence-Kataloge, Live-Kataloge, Cache-Version und -Schema sowie die Baustein-Kataloge in `vertrag.ts` ↔ `vertrag.rs` (Gate-Punkte, Status-Werte, Ereignistypen); Schema, Domäne und History werden dort nicht automatisch verglichen.
- Der Prüfer liest die betreffenden TypeScript-Objekte und Rust-`match`-Arme per Regex. Die Form der geprüften Deklarationen und Match-Arme nicht durch Umformatieren oder Umbenennen verändern.
- Changelog-Quelle ist ausschließlich `docs/wiki/Changelog.md`. `npm run changelog:spiegeln` erzeugt daraus die eine Kopie `tauri-app/src-tauri/Changelog.md`; `npm run pruefen` vergleicht sie. Genau diese Datei bündelt `tauri-app/src-tauri/tauri.conf.json` unter `bundle.resources`, und genau sie löst `fetch_changelog` zur Laufzeit auf.
- Produktname ausschließlich `PROPAKT`. Die Versionsprüfung umfasst **fünf** Dateien: `package.json`, `packages/core/package.json`, `tauri-app/package.json`, `tauri-app/src-tauri/Cargo.toml` und `tauri-app/src-tauri/tauri.conf.json`. Das Core-Paket wird mitgeprüft; Lockfiles werden es nicht.

## Befehle

Nach Zustimmung; pro Arbeitsverzeichnis ausführen:

**Root**

```text
npm install
npm run pruefen
npm run build
npm run abnehmen [-- --nur] [-- --starten] [-- --kein-warten] [-- --fortsetzen <lauf>]
npm run commit:text > .git/COMMIT_EDITMSG.propakt
npm start -- <pfad> [optionen]
```

**TypeScript-Tests**

```text
npx ts-node tests/paketKritik.test.ts
npx ts-node tests/zwischenspeicher.test.ts
npx ts-node tests/updateFehler.test.ts
npx ts-node tests/vertrag.test.ts
```

**Tauri-Frontend (`tauri-app/`)**

```text
npm install
npm run build
npm run dev
npm run tauri dev
npm run tauri:exe
npm run tauri build
```

**Rust (`tauri-app/src-tauri/`)**

```text
cargo check
cargo test
cargo build --release --features custom-protocol
```

- `npm run build` im Root baut zuerst `@propakt/core` und danach die CLI. `npm run build` in `tauri-app/` baut den Core, `tsc` und Vite. Es gibt kein separates Root-Lint-, Typecheck- oder Test-Skript; `npm run pruefen` führt keine Tests aus.
- `npm run abnehmen` ist die Abnahme-Routine in `scripts/abnahme/`: neun Schritte, Bericht unter `abnahme/<Zeitstempel>/bericht.md` (nicht versioniert). Sie gibt 0 zurück, wenn alles gelaufen, bestanden und bezeugt ist, 1 bei einem gescheiterten Schritt und 2, wenn Schritte bestanden, aber Belege fehlen oder der Arbeitsbaum verändert war. Der Unterschied zwischen 0 und 2 ist Absicht – siehe `docs/wiki/Abnahme.md`. Ein Lauf auf verändertem Baum prüft einen Zwischenstand, nicht den genannten Commit; wer abnimmt, committet vorher. `npm run pruefen` bleibt davon unberührt Pflicht vor jeder Abgabe.
- `npm run dev` im Tauri-Ordner ist nur Browser-/Layout-Vorschau über `src/devMock.ts`, kein Backend-Test. Für echte App-Funktionen `npm run tauri dev` verwenden.
- `npm run tauri:exe` baut ohne Bundle; `npm run tauri build` erzeugt das konfigurierte Bundle. Für einen manuellen Rust-Release-Build ist `--features custom-protocol` zwingend.
- Icon-Änderungen aus `tauri-app/` mit `node scripts/generate-icons.mjs` erzeugen; `sharp` nicht direkt für `.ico` verwenden.
- Der Delta-Smoke-Test läuft zweimal mit `--delta`; der zweite Lauf muss `0 neu · 0 geändert` melden. `updateFehler.test.ts` überspringt sich bei verschmutztem Git-Arbeitsbaum; `zwischenspeicher.test.ts` benötigt den gebauten Core und legt temporäre Cache-Dateien an.
- Der Root-`tsc` erfasst `tests/` nicht (`include` ist `src/**/*`). Ein Typfehler in einem Test fällt deshalb erst beim `ts-node`-Lauf auf, nicht im Build – nach dem Anlegen eines Tests also `npx ts-node` ausführen, nicht `npm run build`. `vertrag.test.ts` braucht wie `zwischenspeicher.test.ts` den gebauten Core.

## Umgebung und Stolperfallen

- Trotz Node-18-Angaben in README/INSTALL ist lokal mindestens Node `22.12` erforderlich: `commander@15` und `vite@8` fordern diese Untergrenze. CI verwendet derzeit Node 20.
- Vite läuft mit `strictPort` auf Port 1420; die Konfiguration erzwingt keine IPv6-Familie. Vor `tauri dev` Port und laufende Vite-Prozesse prüfen.
- In Node-Skripten unter Windows `npm` über `execFileSync`/`execSync` nur mit `shell: true` aufrufen, weil npm eine `.cmd`-Datei ist. Für Git-Bash-Pfade in Node `$TMP`/`$HOME` statt `/tmp/...` verwenden.
- Zeilenumbrüche in Suchmustern als `\r?\n` behandeln. In JSX-Text Pfadnamen wie `<identitaet>` als `&lt;identitaet&gt;` schreiben, sonst interpretiert TypeScript sie als Tag.
- Zahlen gegen `origin/*` erst nach einem Abruf nennen. Ein lokaler Verweis auf einen gelöschten Remote-Branch bleibt stehen und rechnet weiter: `git log origin/geloescht..HEAD` liefert eine wohlgeformte Zahl gegen einen Zustand, den es nicht mehr gibt. Am 26. September entstand so die Aussage über acht Commits, die keinen Gegenstand hatte, während `git ls-remote` den Branch nicht mehr kannte. `git fetch --prune` und `git remote prune origin` entfernen solche Verweise; ein nicht abgerufener Stand lässt sich aber grundsätzlich nicht erkennen, weshalb hier eine Prüfung in `npm run pruefen` bewusst fehlt — sie würde entweder beim ersten Lauf ohne Netz fehlschlagen oder eine Zusage sein, die nichts prüft.
- Tauri-Konfiguration und Capabilities gehören unter `tauri-app/src-tauri/`; dort müssen Plugin-Abhängigkeiten und Capability-Permissions zusammenpassen.

## CI und Skriptstatus

- `.github/workflows/release.yml` läuft ausschließlich bei einem Push auf ein `v*`-Tag. Er installiert mit `npm install`, prüft mit `npm run pruefen`, baut das Core und führt **alle vier** `ts-node`-Tests aus (`paketKritik`, `zwischenspeicher`, `updateFehler`, `vertrag`). `vertrag.test.ts` fehlte hier bis zum 27. September — ein Test, den die CI nie ausführt, ist dieselbe stille Zusage wie eine Funktion ohne Aufrufer; jetzt läuft er im Entwurfs-Workflow als Matrix und hier.
- Die Desktop-App baut in einer Matrix über `windows-latest`, `ubuntu-latest` und `macos-latest`. **Nur auf Windows** läuft `npm run tauri build` und liefert NSIS **und** MSI; auf Linux und macOS läuft `tauri:exe` ohne Bundle. `bundle.targets` in `tauri.conf.json` nennt neben `msi` und `nsis` auch `deb` und `appimage`, und `npm run tauri build` läuft unter Windows trotzdem durch — Tauri filtert die Ziele selbst nach Plattform. Ein zusätzliches `--bundles nsis` ist damit nicht nötig; es lässt nur das MSI weg.
- **Die Rust-Tests laufen im Windows-Job mit Release-Profil, nicht in einem eigenen Job.** `Cargo.lock` nennt 2461 Pakete, und die werden sonst zweimal übersetzt: einmal debug für die Tests, einmal release für die App — auf zwei Betriebssystemen, in zwei Workflows, rund zwölf Minuten für dieselbe Kette. `cargo test --release` direkt vor `npm run tauri build` im selben Job nutzt dasselbe Profil, dasselbe Zielverzeichnis und dieselbe Maschine; die Abhängigkeiten werden dadurch einmal übersetzt. Der Preis ist Release-Optimierung auf Testcode und schlechtere Backtraces — bei Tests, die nur prüfen, ein günstiger Tausch.
- Ein eigener Job baut die CLI samt Smoke-Test, der Release-Job hängt alle Artefakte an den Tag und zieht die Release-Notiz aus dem `##`-Abschnitt des getaggten Changelog. Die Releases tragen deshalb `PROPAKT_<version>_x64-setup.exe` und `PROPAKT_<version>_x64_en-US.msi`; aus einem Release lässt sich eine Installation herunterladen und prüfen, ohne lokal zu bauen — sie beschreibt allerdings den getaggten Commit, nicht einen Arbeitsbaum.
- `.github/workflows/installer.yml` läuft bei jedem Push auf einen Branch in fünf Stufen: `tier` (Wächter, ~4 s), `regeln` (`npm run pruefen`), `tests` (alle vier `ts-node`-Tests als **Matrix**, parallel statt nacheinander), `aenderung` (entscheidet per `git diff origin/main...HEAD`, ob `tauri-app/src-tauri/` oder `tauri-app/src/` berührt wurde) und `nsis` (übersetzt und bündelt nur bei `true`). Ein reiner Doku-Commit kostet damit Sekunden statt acht Minuten. Der Installer wird als **Entwurfsartefakt** `propakt-entwurf-<Commit>` abgelegt (sieben Tage); veröffentlicht wird nichts, ein Release bleibt Sache von `release.yml`. Der Trigger nennt `branches` ohne `tags`, sonst liefe der Lauf beim Release ein zweites Mal.
- **`shared-key: propakt-rust` ist der eigentliche Hebel am Cache.** Ohne ihn legt `swatinem/rust-cache` je Branch und Profil einen eigenen Schlüssel an, und der Arbeitszweig findet den Cache des Hauptzweigs nicht — er übersetzt dann jedes Mal alle 2461 Pakete von Grund auf. Im ersten Lauf beider Workflows dauerte der Restore vier Sekunden und die Übersetzung 6 min 51 s; das war ein kalter Lauf, keine Bauzeit. Beide Workflows teilen sich denselben Schlüssel, damit der Vorgewinn nicht an einer Branchgrenze hängen bleibt.
- **Kostenlos nur bei öffentlichem Repository.** GitHub-hosted Runner sind für öffentliche Repositories gratis und unbegrenzt, auf allen drei Betriebssystemen; für private Repositories rechnet GitHub ein Monatskontingent ab, und selbst gestellte Runner kosten seit dem 1. März 2026 0,002 USD je Minute. Der erste Job `tier` in `installer.yml` bricht deshalb bei privatem Repository ab, **bevor** eine Windows-Minute angefordert wird; er läuft auf Linux und braucht Sekunden. Jede weitere Stufe und jeder weitere Push bleiben bei öffentlichem Repository kostenlos — die Ersparnis ist Zeit, nicht Geld.
- `npm run changelog:spiegeln`, `npm run installieren`, `npm run validate` und `npm run architecture:check` laufen unter Windows zuverlässig. `scripts/architecture-check.mjs` nutzt `fileURLToPath` und verarbeitet den Projektpfad korrekt.
- Was `architecture:check` **nicht** leistet: Es prüft keine Index-Vollständigkeit. Es verlangt, dass jede Datei einem im Root-`INDEX.json` eingetragenen Modulpfad zugeordnet ist, und prüft nur für die ersten drei Module stichprobenartig, ob eingetragene Dateien existieren — als Warnung, ohne Abbruch. Fehlt eine Datei in einem Unter-`INDEX.json`, fällt es nicht auf. Index-Pflege bleibt Sorgfalt, nicht Gate.
- `CLAUDE.md` ist eine ausführlichere, aber teilweise veraltete Zweitquelle; insbesondere alte Skriptpfade, `packages/core/src/history.ts` und Node-18-Angaben nicht ungeprüft übernehmen.

## Optionales Agenten-MCP

- Das Paket unter `agents/` stellt einen stdio-MCP-Server mit vier Tools bereit: Analyse auslösen, letzten Snapshot lesen, jüngste Erklärungen lesen, Status abfragen. Die Werkzeugnamen stehen in `agents/INDEX.json` und in `agents/*/src/tools/`.
- Es legt `snapshots/repo_snapshots/`, `snapshots/diffs/` und `logs/` relativ zum Start-CWD an und schreibt dort; es ist **nicht** read-only.
- Es ist **nicht** in den Root-Workspace aufgenommen und wird von `npm install` im Root nicht mitinstalliert.
- Ein Scheduler, ein `/heartbeat`-Kommando oder eine sonstige Einbindung in den Ablauf ist im Quelltext **nicht** vorhanden.
