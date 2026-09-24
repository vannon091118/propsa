import * as fs from "fs";
import * as path from "path";

// Configuration paths
export const CONFIG_PATH = path.join(process.cwd(), "config.json - Konfiguration.code.json");
export const SNAPSHOT_DIR = path.join(process.cwd(), "snapshots", "repo_snapshots");
export const DIFF_DIR = path.join(process.cwd(), "snapshots", "diffs");
export const LOGS_DIR = path.join(process.cwd(), "logs");

// Ensure directories exist
export function ensureDirectories(): void {
  [SNAPSHOT_DIR, DIFF_DIR, LOGS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Simple file utility functions
 */
export function readJsonFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

export function writeJsonFile<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function readTextFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return ""; // Return empty string if file doesn't exist yet
  }
  return fs.readFileSync(filePath, "utf-8");
}

export function writeTextFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, "utf-8");
}

export function appendTextFile(filePath: string, content: string): void {
  fs.appendFileSync(filePath, content, "utf-8");
}