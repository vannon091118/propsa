![PROPAKT – context packages for language models](assets/banner.svg)

# PROPAKT

**PROPAKT** turns a project folder into an **LLM-ready context package**: several
files instead of one giant blob, split by domain, every file complete.

[Deutsche Fassung](README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-3fb950)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.0.18-4aa3ff)](package.json)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-1e5bff)](#desktop-app)
[![Release](https://img.shields.io/github/v/release/vannon091118/propsa?label=Release&color=4aa3ff)](https://github.com/vannon091118/propsa/releases/latest)

Two surfaces, one contract: a **CLI** (`src/`) for scripting and automation and a
**desktop app** (Tauri v2, `tauri-app/`) for clicking.

---

## Why not just `cat`?

Because a model loses the thread on a single 12 MB dump — and with a truncated
export it will not even notice that something is missing. PROPAKT writes

- **complete** – every file in full, never cut off,
- **ordered** – one file per domain so a model can read selectively,
- **honest** – limits are guardrails: they abort the run (exit code 2) instead
  of writing an incomplete package. Fail loud, never truncate silent.

## What you get

| File | Content |
|---|---|
| `Zusammenfassung.md` | Entry point: size, domains, languages, largest files |
| `Architektur.md` | Directory tree and per-file overview |
| `Kritik.md` | Structural findings: god files, mixed concerns, artifacts |
| `Dokumentation.md` | every Markdown file in full |
| `Quellen/<domain>.md` | full source of that domain |
| `kontext.json` | the same data, machine-readable (schema version 2) |

A **domain is the top-level folder** of a relative path: `tauri-app/src-tauri/src/scan.rs`
lands in `Quellen/tauri-app.md`, `README.md` in `Quellen/wurzel.md`.
Details (German): [docs/wiki/Kontextpaket.md](docs/wiki/Kontextpaket.md).

## Quick start

```bash
npm install
npm start /path/to/project     # writes the package to ./propakt-kontext/
```

The complete installation guide is [INSTALL.md](INSTALL.md) (German) – it is the
single binding source; every other document points to it.

## CLI

```bash
# Custom target folder and extra excludes
npm start ~/code/my-project -o paket/ -e "*.min.js,*.log"

# Everything in a single file instead of a package
npm start ~/code/my-project --einzeln context.md
npm start ~/code/my-project --einzeln context.json
```

| Flag | Meaning |
|------|---------|
| `-o, --output <folder>` | Target folder of the package (default `propakt-kontext`) |
| `--einzeln <file>` | Write a single `.md` or `.json` file instead |
| `-e, --exclude <patterns>` | Additional glob patterns to exclude (comma-separated) |
| `-i, --include <patterns>` | Include only these patterns (empty = everything) |
| `-m, --max-files <n>` | Guardrail: hard file limit (aborts with exit code 2) |
| `-l, --max-lines <n>` | Guardrail: hard line limit (aborts with exit code 2) |
| `--no-limits` | Disable all guardrails |
| `--entrypoint <file>` | Slice: entry file plus its local import chain |
| `--depth <n>` | Slice: only files up to this folder depth |
| `--top-files <n>` | Slice: only the n largest files by lines |
| `--delta` | Report the delta against the last run (`~/.propakt/history/`) |
| `--cache` | Reuse the cached result when the tree is unchanged (`~/.propakt/cache/`, German docs) |

The default is a **complete scan**: no limits. Only dependencies, version
control, build artifacts and caches are excluded. `node_modules`,
`__pycache__`, `.venv`, `target` and `dist` are never entered — even with an
empty exclude field.

The former compact mode (`-c`) has been removed. Instead of arbitrary caps
(≤ 500 lines, ≤ 50 files) you pick a target: `--entrypoint` follows the import
chain, `--depth` caps the depth, `--top-files` takes the largest files.

With `--delta` (CLI) or the “Report changes since last run” checkbox (app)
PROPAKT reports the changes since the last run: The history lives centrally
in the user directory (`~/.propakt/history/<identity>.jsonl`); nothing is left
behind in the scanned project. The project is identified via the root commit
hash (`git rev-list --max-parents=0 HEAD`) — stable across branches, paths
and remote URLs; without git the identity falls back to the path. Install
and remove:

```bash
npm run installieren    # build + set up central storage ~/.propakt
npm run deinstallieren  # remove ~/.propakt (with confirmation)
```

`~/.propakt` holds everything PROPAKT keeps between runs — except the output:
context packages and `--einzeln` files go where they are requested.

## Desktop app

Tauri v2 with a Rust backend and a React frontend and its own custom title bar
(`decorations: false`): pick a folder, set guardrail limits, review the table,
choose a target folder, write the package. When a limit is hit the app shows
an error message — never a truncated result.

```bash
cd tauri-app
npm install
npm run tauri dev     # development
npm run tauri build   # installers (Windows: MSI and NSIS setup)
```

Requirements: Node.js 18+, Rust 1.70+ and, on Windows, the **C++ build tools**
(Visual Studio Build Tools or Community with “Desktop development with C++”).
Build pitfalls are documented in [docs/wiki/Entwicklung.md](docs/wiki/Entwicklung.md) (German).

### Live mode (agent watchdog)

The app can sit in the background as a **tray icon** and follow a project
folder in a **live cycle**: scan → compare → next tick, sequential, never
overlapping. A transparent **overlay widget** shows a traffic light, file and
line counts, a sparkline and the change journal; snapshots are persisted in
`~/.propakt/live/<identity>.db` (SQLite, WAL) and add a second time series to
the history graph.

When the cycle detects **anomalies** — flapping, regression, oscillation,
delete storms, growth explosions, guardrail breaches, cohort divergence — the
tray icon blinks subtly and the widget comes to the foreground once for severe
findings. An **interval brake** lengthens the pause for large trees; guardrail
breaches are reported loudly but write nothing.
Details (German): [docs/wiki/Live-Modus.md](docs/wiki/Live-Modus.md).

### LLM advice

In the settings tab, a language model can interpret the project state. Three
providers are available: **NVIDIA NIM**, **OpenRouter** and **Anthropic**; the
provider is recognised from the base URL, unknown URLs stay a manual choice.
Triggers are on demand, after every live tick, or on an interval.

**Security (fail closed):** API keys are never stored in clear text. The Tauri
store holds only the mask (`sk-a…1234`); the real key lives exclusively in the
running process and goes to the backend bridge per request, which forwards it
to the provider and nowhere else.

## Both surfaces agree

CLI and app share not only the **contract** but, since 0.0.17, the **code**:
language detection, filter catalog, domain rule and export schema live once in
`packages/core/src/` (`@propakt/core`), which the CLI imports directly while the
Rust bridge mirrors the same rules. `npm run pruefen` compares both sides
catalog by catalog. The scanner collects all candidates, sorts them and reads
them afterwards — so limits do not depend on filesystem order and always hit
the same files.

## Building blocks

`bausteine/` holds **contracts, not functions**: seven patterns
(negotiation, verification, observation, prompts, runtime, overview,
integration), each with a document covering decision, mechanism and limit, and
each with a contract file. A rule counts as implemented only when all seven
points hold up — `POSITIVE`, `FORBIDDEN`, `FALLBACK`, `ERROR`, `TRACE`,
`REPLAY`, `INVARIANT`.

The state is stated plainly, not flattered: **six building blocks stand at
`STUB`** (deliberately not built — a decision, not an open item); integration
is listed as `IMPLEMENTED`. There are no hidden features here
(German): [docs/wiki/Bausteine.md](docs/wiki/Bausteine.md).

## Releases

Releases are automatic: pushing a `v*` tag triggers the GitHub workflow
(check, build, release with artifacts for Windows/Linux/macOS).
`npm start -- update --nur-pruefen` checks against `origin/main`,
`npm start -- update` fast-forwards and reinstalls.

## Not in this version

So nobody hunts for features that do not exist: no GitHub URL input and no CI
workflows for external projects. PROPAKT works on the filesystem only. The live
mode watches one project at a time and works on timer ticks (no FS watcher):
changes are only visible with the next tick. It reports anomalies but never
intervenes (no kill, no revert) and runs in the app only, not in the CLI. Six
of the seven building blocks are contract, not function.

## Project structure

```text
.
├── src/                CLI (TypeScript), entry: src/propakt.ts
├── packages/core/      Shared core @propakt/core (types, rules, schema)
├── tauri-app/          Desktop app (React frontend, Rust backend)
├── bausteine/          Contracts and patterns (documented, no code)
├── agents/mcp-server/  MCP server for the project overview
├── assets/             Banner and logo
├── docs/wiki/          Contracts and guides
├── scripts/            pruefen.mjs – consistency check
├── tests/              Doc and behaviour tests (ts-node)
├── ARCHITECTURE.md     Modules and data flow
├── INSTALL.md          Canonical installation guide
└── LICENSE             MIT
```

## Rules in the repo

Four rules are checked by machine, not merely asserted:

| Rule | Check |
|---|---|
| Max 300 lines per source file | `npm run pruefen` |
| One version across all manifests | `npm run pruefen` |
| Core catalogs match Rust | `npm run pruefen` |
| Every commit names language, files and LOC | `scripts/pruefen/commit_gate.mjs` (hook) |

```bash
npm run pruefen              # consistency check (LOC, versions, catalogs, links)
npm run architecture:check   # every file assigned to a module
```

## License

MIT – see [LICENSE](LICENSE).

## Author

[@vannon091118](https://github.com/vannon091118)
