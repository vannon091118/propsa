import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { CONFIG_PATH, SNAPSHOT_DIR, DIFF_DIR, LOGS_DIR, readJsonFile } from "../utils/storage";

/**
 * Tool: Get Shinon status/health
 */
export const getStatusTool = {
  name: "shinon_get_status",
  description: "Get SHINON repository monitor operational status",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const configRaw = readJsonFile(CONFIG_PATH);
      const config = configRaw as { shinon?: any; heartbeat?: any };
      const shinonConfig = config.shinon || {};
      
      // Count files in directories
      const snapshotCount = fs.existsSync(SNAPSHOT_DIR) ? 
        fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith("_snapshot.md")).length : 0;
      const diffCount = fs.existsSync(DIFF_DIR) ? 
        fs.readdirSync(DIFF_DIR).filter(f => f.endsWith("_diff.md") || f.endsWith("_explanation.md")).length : 0;
      const logSize = fs.existsSync(path.join(LOGS_DIR, "shinon.log")) ? 
        fs.statSync(path.join(LOGS_DIR, "shinon.log")).size : 0;
      
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
            text: `🥷 SHINON Repository Monitor Status\n\n🟢 Status: Aktiv und überwachend\n📁 Konfiguration:\n   - Intervall: ${shinonConfig.interval_seconds || 300}s (${((shinonConfig.interval_seconds || 300) / 60)} min)\n   - Heartbeat: ${config.heartbeat?.interval_seconds || 180}s\n   - Deutsche Erklärungen: ${shinonConfig.german_explanations ? "✅" : "❌"}\n   - Fun-Modus: ${shinonConfig.fun_mode ? "✅" : "❌"}\n\n📊 Statistik:\n   - Snapshots erstellt: ${snapshotCount}\n   - Reports/Erklärungen: ${diffCount}\n   - Log-Dateigröße: ${logSize} bytes\n   - Letzte Aktivität: ${lastActivity}\n\n📂 Verzeichnisse:\n   - Snapshots: ${SNAPSHOT_DIR}\n   - Reports: ${DIFF_DIR}\n   - Logs: ${LOGS_DIR}\n\n💡 Verfügbare MCP-Tools:\n   - shinon_trigger_analysis\n   - shinon_get_latest_snapshot\n   - shinon_get_recent_explanations\n   - shinon_get_status\n\n🥷 Shinon wacht über dein Repository!`
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