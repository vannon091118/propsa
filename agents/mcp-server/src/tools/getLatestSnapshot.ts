import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { SNAPSHOT_DIR, readTextFile } from "../utils/storage";

/**
 * Tool: Get information about the most recent PROPAKT snapshot
 */
export const getLatestSnapshotTool = {
  name: "propakt_get_latest_snapshot",
  description: "Get information about the most recent PROPAKT snapshot",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) {
        return {
          content: [
            {
              type: "text",
              text: "📭 Noch keine Snapshots vorhanden. Führen Sie zuerst 'propakt_trigger_analysis' aus."
            }
          ]
        };
      }
      
      const snapshots = fs.readdirSync(SNAPSHOT_DIR)
        .filter(f => f.endsWith("_snapshot.md"))
        .sort()
        .reverse(); // Newest first
        
      if (snapshots.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "📭 Noch keine Snapshots vorhanden. Führen Sie zuerst 'propakt_trigger_analysis' aus."
            }
          ]
        };
      }
      
      const latest = snapshots[0];
      const snapshotPath = path.join(SNAPSHOT_DIR, latest);
      const content = readTextFile(snapshotPath);
      
      // Extract basic info from the markdown
      const timestampMatch = content.match(/\*\*Zeitstempel\*\*: ([^\n]+)/);
      const idMatch = content.match(/\*\*Snapshot-ID\*\*: ([^\n]+)/);
      const filesMatch = content.match(/\*\*Dateien gesamt\*\*: (\d+)/);
      const locMatch = content.match(/\*\*Zeilen Code\*\*: (\d+)/);
      
      return {
        content: [
          {
            type: "text",
            text: `📸 Neuster PROPAKT Snapshot\n\n🆔 ID: ${idMatch ? idMatch[1] : "Unbekannt"}\n🕐 Zeit: ${timestampMatch ? timestampMatch[1] : "Unbekannt"}\n📁 Dateien: ${filesMatch ? filesMatch[1] : "Unbekannt"}\n🔢 LOC: ${locMatch ? locMatch[1] : "Unbekannt"}\n\n📍 Pfad: ${snapshotPath}\n\n📄 Vorschau:\n${content.substring(0, Math.min(500, content.length))}${content.length > 500 ? "..." : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Fehler beim Abrufen des Snapshots: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
};