import * as fs from "fs";
import * as path from "path";

/**
 * Scan repository for files and lines of code
 */
export interface ScanResult {
  totalFiles: number;
  totalLines: number;
  byType: Record<string, number>;
}

/**
 * Count lines of code in a file (excluding empty lines and comment-only lines)
 */
export function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    let codeLines = 0;
    for (const line of content.split("\n")) {
      const stripped = line.trim();
      if (stripped && !stripped.startsWith("#")) {
        codeLines++;
      }
    }
    return codeLines;
  } catch {
    return 0;
  }
}

/**
 * Check if a file should be ignored based on extension and path
 */
export function shouldIgnoreFile(filePath: string, ignorePatterns: string[], includeExtensions: string[]): boolean {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);
  
  // Check ignore patterns
  for (const pattern of ignorePatterns) {
    if (filePath.includes(pattern) || fileName === pattern) {
      return true;
    }
  }
  
  // Check if extension is in include list
  if (includeExtensions.length > 0 && !includeExtensions.includes(ext)) {
    return true;
  }
  
  return false;
}

/**
 * Scan a directory recursively
 */
export function scanDirectory(
  dir: string, 
  ignorePatterns: string[], 
  includeExtensions: string[]
): ScanResult {
  let totalFiles = 0;
  let totalLines = 0;
  const byType: Record<string, number> = {};
  
  function scanDir(currentDir: string): void {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common directories to avoid
          const skipDirs = [".git", "node_modules", "dist", "build", "snapshots", "logs", ".venv"];
          if (!skipDirs.includes(entry.name) && !shouldIgnoreFile(fullPath, ignorePatterns, includeExtensions)) {
            scanDir(fullPath);
          }
        } else {
          if (!shouldIgnoreFile(fullPath, ignorePatterns, includeExtensions)) {
            try {
              const loc = countLines(fullPath);
              totalFiles++;
              totalLines += loc;
              const ext = path.extname(entry.name);
              byType[ext] = (byType[ext] || 0) + 1;
            } catch (e) {
              // Skip unreadable files
            }
          }
        }
      }
    } catch (e) {
      // Directory might not exist or be inaccessible
    }
  }
  
  scanDir(dir);
  return { totalFiles, totalLines, byType };
}

/**
 * Get a simple file tree representation (limited depth)
 */
export function getFileTree(
  dir: string, 
  ignorePatterns: string[], 
  includeExtensions: string[], 
  maxDepth: number = 2
): string[] {
  const lines: string[] = [];
  
  function scan(currentDir: string, depth: number) {
    if (depth >= maxDepth) return;
    
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      const sortedEntries = entries
        .filter(entry => 
          ![
            ".git", "node_modules", "dist", "build", "snapshots", "logs", 
            ".venv", ".idea", ".vscode", ".gitignore", "package-lock.json", 
            "yarn.lock", "pnpm-lock.yaml"
          ].includes(entry.name) &&
          !shouldIgnoreFile(path.join(currentDir, entry.name), ignorePatterns, includeExtensions)
        )
        .sort((a, b) => {
          // Directories first, then files
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });
      
      for (const entry of sortedEntries) {
        const fullPath = path.join(currentDir, entry.name);
        const indent = "  ".repeat(depth);
        
        if (entry.isDirectory()) {
          lines.push(`${indent}📁 ${entry.name}/`);
          scan(fullPath, depth + 1);
        } else {
          const ext = path.extname(entry.name);
          const loc = countLines(fullPath);
          lines.push(`${indent}📄 ${entry.name} (${ext} - ${loc} LOC)`);
        }
      }
    } catch (e) {
      // Directory might not exist or be inaccessible
    }
  }
  
  scan(dir, 0);
  return lines;
}