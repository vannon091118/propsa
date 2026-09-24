import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { DIFF_DIR, readTextFile } from "../utils/storage";

/**
 * Tool: Get recent explanations
 */
export const getRecentExplanationsTool = {
  name: "propsa_get_recent_explanations",
  description: "Get recent PROPSA explanations (German with fun messages)",
  inputSchema: z.object({
    limit: z.number().min(1).max(10).optional().default(3).describe("Number of recent explanations to return")
  }),
  execute: async (args: { limit?: number }) => {
    try {
      const limit = args.limit ?? 3;
      
      if (!fs.existsSync(DIFF_DIR)) {
        return {
          content: [
            {
              type: "text",
              text: "📭 Noch keine Erklärungen vorhanden. Führen Sie zuerst 'propsa_trigger_analysis' aus."
            }
          ]
        };
      }
      
      const explanations = fs.readdirSync(DIFF_DIR)
        .filter(f => f.endsWith("_explanation.md"))
        .sort()
        .reverse() // Newest first
        .slice(0, limit);
        
      if (explanations.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "📭 Noch keine Erklärungen vorhanden. Führen Sie zuerst 'propsa_trigger_analysis' aus."
            }
          ]
        };
      }
      
      const results = explanations.map(file => {
        const filePath = path.join(DIFF_DIR, file);
        const content = readTextFile(filePath);
        const timestampMatch = content.match(/\*\*Erstellt\*\*: ([^\n]+)/);
        
        return {
          file,
          timestamp: timestampMatch ? timestampMatch[1] : "Unbekannt",
          preview: content.substring(0, Math.min(200, content.length)) + (content.length > 200 ? "..." : ""),
          path: filePath
        };
      });
      
      let response = `📝 Letzte ${explanations.length} PROPSA Erklärungen:\n\n`;
      results.forEach((exp, index) => {
        response += `${index + 1}. ${exp.file}\n`;
        response += `   🕐 ${exp.timestamp}\n`;
        response += `   📄 ${exp.preview}\n\n`;
      });
      
      return {
        content: [
          {
            type: "text",
            text: response.trim()
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Fehler beim Abrufen der Erklärungen: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
};