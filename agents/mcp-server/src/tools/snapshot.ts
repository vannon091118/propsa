import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { CONFIG_PATH, SNAPSHOT_DIR, DIFF_DIR, LOGS_DIR, ensureDirectories, readJsonFile, writeTextFile, appendTextFile } from "../utils/storage";
import { scanDirectory, getFileTree } from "../utils/scanner";

/**
 * Tool: Trigger a manual snapshot and analysis
 */
export const triggerAnalysisTool = {
  name: "propakt_trigger_analysis",
  description: "Manually trigger a PROPAKT repository snapshot and generate analysis explanation",
  inputSchema: z.object({
    force: z.boolean().optional().default(false).describe("Force snapshot even if recent one exists")
  }),
  execute: async (args: { force?: boolean }) => {
    try {
      ensureDirectories();
      
      // Load configuration
      const configRaw = readJsonFile(CONFIG_PATH);
      const config = configRaw as { propakt?: any; repository?: any };
      const propaktConfig = config.propakt || {};
      const repoConfig = config.repository || {};
      
      const ignorePatterns = repoConfig.ignore_patterns || [".git", "node_modules", "__pycache__", ".venv", "dist", "build"];
      const includeExtensions = repoConfig.include_extensions || [".py", ".ts", ".tsx", ".js", ".md", ".json", ".yaml", ".yml"];
      
      // Scan repository
      console.log("🔍 Scanning repository...");
      const scanResult = scanDirectory(process.cwd(), ignorePatterns, includeExtensions);
      
      // Generate snapshot ID and timestamp
      const timestamp = new Date().toISOString();
      const snapshotId = new Date().toLocaleString("sv-SE").replace(/[/: .]/g, "-").replace(/^-/, "").replace(/-$/, "");
      
      // Create snapshot markdown
      const snapshotLines: string[] = [];
      snapshotLines.push("# Repository-Snapshot (PROPAKT)");
      snapshotLines.push(`**Zeitstempel**: ${timestamp}`);
      snapshotLines.push(`**Snapshot-ID**: ${snapshotId}`);
      snapshotLines.push("");
      snapshotLines.push("## Zusammenfassung");
      snapshotLines.push(`- **Dateien gesamt**: ${scanResult.totalFiles}`);
      snapshotLines.push(`- **Zeilen Code**: ${scanResult.totalLines}`);
      snapshotLines.push(`- **Größe**: Geschätzt für Demo-Zwecke`);
      snapshotLines.push("");
      snapshotLines.push("## Nach Dateityp");
      for (const [ext, count] of Object.entries(scanResult.byType).sort()) {
        snapshotLines.push(`- \`${ext}\`: ${count} Dateien`);
      }
      snapshotLines.push("");
      snapshotLines.push("## Dateibaum");
      snapshotLines.push("```");
      const treeLines = getFileTree(process.cwd(), ignorePatterns, includeExtensions, 3);
      snapshotLines.push(...treeLines.slice(0, 30)); // Limit to first 30 entries
      if (getFileTree(process.cwd(), ignorePatterns, includeExtensions, 3).length > 30) {
        snapshotLines.push("... und weitere Dateien");
      }
      snapshotLines.push("```");
      snapshotLines.push("");
      
      const snapshotMarkdown = snapshotLines.join("\n");
      
      // Save snapshot
      const snapshotPath = path.join(SNAPSHOT_DIR, `${snapshotId}_snapshot.md`);
      writeTextFile(snapshotPath, snapshotMarkdown);
      
      // Generate German explanation
      const funMessages = [
        " 🐱 Die Code-Katzen sind heute besonders aktiv!",
        " 🌱 Der Wachstumshormon-Cocktail fürs Repository hat gewirkt.",
        " ⚡ Elektronen fließen durch die Leitungen wie ein Fischschwarm.",
        " 📜 Die Code-Zauberer haben ihre Tränke angerührt.",
        " 🚀 Die Raumschiff-Triebwerke sind auf Warmlauf geschaltet."
      ];
      const funIdx = Math.floor(Math.random() * funMessages.length);
      
      const explanationLines: string[] = [];
      explanationLines.push("# PROPAKT Analyse-Erklärung");
      explanationLines.push(`**Erstellt**: ${new Date().toLocaleString()}`);
      explanationLines.push("");
      explanationLines.push("Seit dem letzten Snapshot wurde der Repository-Zustand aktualisiert.");
      explanationLines.push("");
      explanationLines.push(`- **Dateien gesamt**: ${scanResult.totalFiles}`);
      explanationLines.push(`- **Zeilen Code**: ${scanResult.totalLines}`);
      explanationLines.push("");
      explanationLines.push("**Erkannte Struktur**:");
      explanationLines.push("- Repository wird kontinuierlich alle 5 Minuten gescannt");
      explanationLines.push("- Neue Dateien werden erkannt bei Veränderungen");
      explanationLines.push("- Änderungen werden in Diff-Reports gespeichert");
      explanationLines.push("");
      explanationLines.push("**Aktuelle Status-Infos**:");
      explanationLines.push(`- Gesamtzahl der überwachten Dateien: ${scanResult.totalFiles}`);
      explanationLines.push(`- Gesamtzeilen des Codes: ${scanResult.totalLines}`);
      explanationLines.push(`- Letzte Änderung: ${new Date().toLocaleTimeString()}`);
      explanationLines.push("");
      explanationLines.push(funMessages[funIdx]);
      explanationLines.push("");
      explanationLines.push("---");
      explanationLines.push("*Diese Erklärung wurde automatisch von PROPAKT generiert.*");
      
      const explanation = explanationLines.join("\n");
      const explPath = path.join(DIFF_DIR, `${snapshotId}_explanation.md`);
      writeTextFile(explPath, explanation);
      
      // Create simple diff report
      const snapshots = fs.existsSync(SNAPSHOT_DIR) ? 
        fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith("_snapshot.md")).sort() : [];
      let diffReport = "# Change Report\n\n**Vergleich**: PROPAKT Analysis Execution\n\n";
      
      if (snapshots.length >= 2) {
        diffReport += `## Letzte Aktivitäten\n- Aktueller Snapshot: ${snapshotId}\n- Vorheriger Snapshot: ${snapshots[snapshots.length - 2].replace("_snapshot.md", "")}\n- Gesamte Snapshots: ${snapshots.length}\n\n`;
      } else {
        diffReport += `## Status\n- Dies ist der erste PROPAKT Snapshot\n- Keine vorherigen Snapshots zum Vergleich verfügbar\n\n`;
      }
      
      diffReport += "---\n";
      const diffPath = path.join(DIFF_DIR, `${snapshotId}_diff.md`);
      writeTextFile(diffPath, diffReport);
      
      // Log the activity
      const logEntry = `${new Date().toISOString()} | PROPAKT Manual Trigger | ${scanResult.totalFiles} files | ${scanResult.totalLines} LOC\n`;
      appendTextFile(path.join(LOGS_DIR, "propakt.log"), logEntry);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ PROPAKT Analysis Triggered Successfully!\n\n📊 Snapshot erstellt: ${snapshotId}\n📁 Dateien: ${scanResult.totalFiles}\n🔢 LOC: ${scanResult.totalLines}\n😊 Fun-Message: ${funMessages[funIdx]}\n\n📁 Dateien erstellt:\n- Snapshot: ${snapshotPath}\n- Erklärung: ${explPath}\n- Diff-Report: ${diffPath}\n\nDie Analyse ist jetzt über die PROPAKT-MCP-Tools verfügbar.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ PROPAKT Analysis Failed: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
};