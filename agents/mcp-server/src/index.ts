import { McpServer } from "@modelcontextprotocol/sdk";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { triggerAnalysisTool } from "./tools/snapshot";
import { getLatestSnapshotTool } from "./tools/getLatestSnapshot";
import { getRecentExplanationsTool } from "./tools/getRecentExplanations";
import { getStatusTool } from "./tools/getStatus";

// Ensure directories exist on startup
import { ensureDirectories } from "./utils/storage";
ensureDirectories();

// Create MCP server
const server = new McpServer({
  name: "propakt-repository-monitor",
  version: "1.0.0"
}, {
  capabilities: {
    resources: {},
    tools: {}
  }
});

// Register all tools
server.tool(triggerAnalysisTool.name, triggerAnalysisTool.description, triggerAnalysisTool.inputSchema, triggerAnalysisTool.execute);
server.tool(getLatestSnapshotTool.name, getLatestSnapshotTool.description, getLatestSnapshotTool.inputSchema, getLatestSnapshotTool.execute);
server.tool(getRecentExplanationsTool.name, getRecentExplanationsTool.description, getRecentExplanationsTool.inputSchema, getRecentExplanationsTool.execute);
server.tool(getStatusTool.name, getStatusTool.description, getStatusTool.inputSchema, getStatusTool.execute);

// Start the server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🥷 PROPAKT MCP Server läuft auf stdio");
  
  // Log startup
  const { LOGS_DIR } = require("./utils/storage");
  const fs = require("fs");
  const logEntry = `${new Date().toISOString()} | PROPAKT MCP Server gestartet\n`;
  fs.appendFileSync(`${LOGS_DIR}/propakt.log`, logEntry, "utf-8");
}

run().catch(console.error);