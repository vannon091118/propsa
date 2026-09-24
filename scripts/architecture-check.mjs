/**
 * Architecture-Check für das PROPAKT-Repository.
 * Prüft, ob die Ownership- und Index-Struktur konsistent ist:
 * - Jede Datei gehört zu einem Modul (außer einer Whitelist von Dateien in der Wurzel).
 * - Jedes Modul besitzt eine INDEX.json-Datei.
 * - Der Root-INDEX listet alle Module auf.
 * - Optional: Prüfe, dass die im INDEX aufgeführten Dateien existieren.
 */

import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WURZEL = resolve(__dirname, ".."); // Projekt-Wurzel

const WHITELIST_ROOT_FILES = new Set([
  "package.json",
  "tsconfig.json",
  ".gitignore",
  "LICENSE",
  "README.md",
  "README.en.md",
  "INSTALL.md",
  "package-lock.json",
  "AGENTS.md",
  "ARCHITECTURE.md",
  "CLAUDE.md",
  "INDEX.json",
  "INDEX_MATRIX.json"
]);

const WHITELIST_ROOT_DIRS = new Set([
  "node_modules",
  "dist",
  "target",
  "gen",
  ".freebuff",
  ".agents",
  "test-output",
  "snapshots",
  ".git"
]);

/**
 * Prüft, ob ein Pfad eine Whitelist-Datei oder -Verzeichnis in der Wurzel ist.
 */
function isWhitelistedRootItem(itemPath) {
  const itemName = relative(WURZEL, itemPath);
  // Datei
  if (WHITELIST_ROOT_FILES.has(itemName)) {
    return true;
  }
  // Verzeichnis
  if (WHITELIST_ROOT_DIRS.has(itemName)) {
    return true;
  }
  return false;
}

/**
 * Lädt eine JSON-Datei sicher.
 */
function loadJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (e) {
    console.error(`Fehler beim Laden von ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * Hauptprüfung.
 */
function runArchitectureCheck() {
  console.log("=== Architecture-Check gestartet ===\n");

  // 1. Lade den Root-INDEX
  const rootIndexPath = join(WURZEL, "INDEX.json");
  const rootIndex = loadJsonFile(rootIndexPath);
  if (!rootIndex) {
    console.error("❌ Root-INDEX.json nicht gefunden oder ungültig.");
    process.exit(1);
  }
  console.log("✅ Root-INDEX.json geladen.");

  // 2. Sammle alle Module aus dem Root-INDEX
  const modules = rootIndex.modules || [];
  if (modules.length === 0) {
    console.error("❌ Keine Module im Root-INDEX gefunden.");
    process.exit(1);
  }
  console.log(`✅ ${modules.length} Module im Root-INDEX gefunden: ${modules.map(m => m.name).join(", ")}`);

  // 3. Für jedes Modul prüfe, dass sein INDEX existiert und lesbar ist
  for (const module of modules) {
    const moduleIndexPath = join(WURZEL, module.index);
    if (!existsSync(moduleIndexPath)) {
      console.error(`❌ INDEX für Modul "${module.name}" nicht gefunden unter ${module.index}`);
      process.exit(1);
    }
    const moduleIndex = loadJsonFile(moduleIndexPath);
    if (!moduleIndex) {
      console.error(`❌ INDEX für Modul "${module.name}" ist ungültig (kein gültiges JSON).`);
      process.exit(1);
    }
  }
  console.log("✅ Alle Modul-INDEX-Dateien existieren und sind gültig.");

  // 4. Durchlaufe alle Dateien im Projekt (ausgenommen Whitelist und ignorierte Ordner) und prüfe, dass sie zu einem Modul gehören
  const allFiles = [];
  function collectFiles(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (isWhitelistedRootItem(fullPath)) {
        continue;
      }
      if (entry.isDirectory()) {
        // Rekursiv in Unterverzeichnisse gehen, außer ignorierte
        if (!WHITELIST_ROOT_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          collectFiles(fullPath);
        }
        continue;
      }
      if (entry.isFile()) {
        allFiles.push(fullPath);
      }
    }
  }
  collectFiles(WURZEL);

  // Für jede Datei ermittle, zu welchem Modul sie gehört (basierend auf dem längsten gemeinsamen Pfad mit den Modulpfaden)
  let unassignedFiles = [];
  for (const filePath of allFiles) {
    let assigned = false;
    for (const module of modules) {
      const modulePath = join(WURZEL, module.path);
      if (filePath.startsWith(modulePath)) {
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      unassignedFiles.push(filePath);
    }
  }

  if (unassignedFiles.length > 0) {
    console.error(`❌ ${unassignedFiles.length} Dateien sind keinem Modul zugeordnet:`);
    for (const f of unassignedFiles.slice(0, 10)) { // zeige zuerst 10
      console.error(`   - ${relative(WURZEL, f)}`);
    }
    if (unassignedFiles.length > 10) {
      console.error(`   ... und ${unassignedFiles.length - 10} weitere`);
    }
    process.exit(1);
  } else {
    console.log(`✅ Alle ${allFiles.length} Dateien sind einem Modul zugeordnet.`);
  }

  // 5. Optional: Prüfe, dass die im INDEX aufgeführten Dateien tatsächlich existieren (Stichprobe)
  // Wir können das für ein paar Module machen, um sicherzugehen, dass die INDICES gepflegt werden.
  const sampleModules = modules.slice(0, 3); // erste drei Module prüfen
  for (const module of sampleModules) {
    const moduleIndexPath = join(WURZEL, module.index);
    const moduleIndex = loadJsonFile(moduleIndexPath);
    if (!moduleIndex || !moduleIndex.contents) continue;
    for (const item of moduleIndex.contents) {
      if (item.type === "file") {
        const filePath = join(WURZEL, module.path, item.path);
        if (!existsSync(filePath)) {
          console.warn(`⚠️ Datei im INDEX von Modul "${module.name}" nicht gefunden: ${item.path}`);
        }
      }
    }
  }
  console.log("✅ Stichprobenkontrolle der Modul-INDEX-Dateien abgeschlossen.");

  console.log("\n=== Architecture-Check erfolgreich abgeschlossen ===\n");
  process.exit(0);
}

runArchitectureCheck();