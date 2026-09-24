import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { CONFIG_PATH, SNAPSHOT_DIR, DIFF_DIR, LOGS_DIR, readJsonFile } from "../utils/storage";

/**
 * Tool: Get PROPAKT-Status/Betriebsbereitschaft
 */
export const getStatusTool = {
  name: "propakt_get_status",
  description: "Get PROPAKT repository monitor operational status",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const configRaw = readJsonFile(CONFIG_PATH);
      const config = configRaw as { propakt?: any; heartbeat?: any };
      const propaktConfig = config.propakt || {};
      
      // Count files in directories
      const snapshotCount = fs.existsSync(SNAPSHOT_DIR) ? 
        fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith("_snapshot.md")).length : 0;
      const diffCount = fs.existsSync(DIFF_DIR) ? 
        fs.readdirSync(DIFF_DIR).filter(f => f.endsWith("_diff.md") || f.endsWith("_explanation.md")).length : 0;
      const logSize = fs.existsSync(path.join(LOGS_DIR, "propakt.log")) ? 
        fs.statSync(path.join(LOGS_DIR, "propakt.log")).size : 0;
      
      // Check if recent activity (last 10 minutes)
      let lastActivity = "Nie";
      if (fs.existsSync(SNAPSHOT_DIR)) {
        const snapshots = fs.readdirSync(SNAPSHOT_DIR)
          .filter(f => f.endsWith("_snapshot.md"))
          .map(f => {
            const stat = fs.statSync(path.join(SNAPSHOT_DIR, f));
            return { name: f, time: stat.mtime };
          })
          .sort((a, b) => b.time.getTime() - a.time.getTime());
          
        if (snapshots.length > 0) {
          const last = snapshots[0];
          const diffMinutes = (Date.now() - last.time.getTime()) / (1000 * 60);
          lastActivity = `${diffMinutes.toFixed(1)} Minuten ago`;
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: `🥷 PROPAKT Repository Monitor Status\n\n🟢 Status: Aktiv und überwachend\n📁 Konfiguration:\n   - Intervall: ${propaktConfig.interval_seconds || 300}s (${((propaktConfig.interval_seconds || 300) / 60)} min)\n   - Heartbeat: ${config.heartbeat?.interval_seconds || 180}s\n   - Deutsche Erklärungen: ${propaktConfig.german_explanations ? "✅" : "❌"}\n   - Fun-Modus: ${propaktConfig.fun_mode ? "✅" : "❌"}\n\n📊 Statistik:\n   - Snapshots erstellt: ${snapshotCount}\n   - Reports/Erklärungen: ${diffCount}\n   - Log-Dateigröße: ${logSize} bytes\n   - Letzte Aktivität: ${lastActivity}\n\n📂 Verzeichnisse:\n   - Snapshots: ${SNAPSHOT_DIR}\n   - Reports: ${DIFF_DIR}\n   - Logs: ${LOGS_DIR}\n\n💡 Verfügbare MCP-Tools:\n   - propakt_trigger_analysis\n   - propakt_get_latest_snapshot\n   - propakt_get_recent_explanations\n   - propakt_get_status\n\n🥷 PROPAKT behält dein Repository im Blick!`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Fehler beim Abrufen des Status: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
};