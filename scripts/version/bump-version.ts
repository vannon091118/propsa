#!/usr/bin/env ts-node
/** Bump version in all relevant files.
 * Usage: ts-node scripts/bump-version.ts <newVersion>
 * Updates:
 *   - package.json (root)
 *   - packages/core/package.json (geteilter Kern, eigener Workspace)
 *   - tauri-app/package.json
 *   - tauri-app/src-tauri/Cargo.toml
 *   - tauri-app/src-tauri/tauri.conf.json
 *   - README.md, README.en.md (Versions-Badge)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Usage: ts-node scripts/bump-version.ts <newVersion>");
  process.exit(1);
}
const newVersion = args[0];
// Validate version format (simple)
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error("Version must be in format X.Y.Z (semver)");
  process.exit(1);
}

const WURZEL = resolve(__dirname, "..", "..");
const files = [
  {
    path: join(WURZEL, "package.json"),
    updater: (content: string): string => {
      const obj = JSON.parse(content);
      obj.version = newVersion;
      return JSON.stringify(obj, null, 2) + "\n";
    },
  },
  {
    path: join(WURZEL, "packages/core/package.json"),
    updater: (content: string): string => {
      const obj = JSON.parse(content);
      obj.version = newVersion;
      return JSON.stringify(obj, null, 2) + "\n";
    },
  },
  {
    path: join(WURZEL, "tauri-app/package.json"),
    updater: (content: string): string => {
      const obj = JSON.parse(content);
      obj.version = newVersion;
      return JSON.stringify(obj, null, 2) + "\n";
    },
  },
  {
    path: join(WURZEL, "tauri-app/src-tauri/Cargo.toml"),
    updater: (content: string): string => {
      // Replace version = "X.Y.Z"
      return content.replace(/^version = "([^"]+)"$/gm, `version = "${newVersion}"`);
    },
  },
  {
    path: join(WURZEL, "tauri-app/src-tauri/tauri.conf.json"),
    updater: (content: string): string => {
      const obj = JSON.parse(content);
      obj.version = newVersion;
      return JSON.stringify(obj, null, 2) + "\n";
    },
  },
  {
    // Das Badge steht als shields.io-URL im Text – nur die Ziffernfolge
    // wechselt, Farbe und Zielpfad bleiben.
    path: join(WURZEL, "README.md"),
    updater: (content: string): string => {
      return content.replace(/Version-\d+\.\d+\.\d+-/, `Version-${newVersion}-`);
    },
  },
  {
    path: join(WURZEL, "README.en.md"),
    updater: (content: string): string => {
      return content.replace(/Version-\d+\.\d+\.\d+-/, `Version-${newVersion}-`);
    },
  },
];

for (const file of files) {
  let content: string;
  try {
    content = readFileSync(file.path, "utf8");
  } catch (err) {
    console.error(`Failed to read ${file.path}: ${err}`);
    process.exit(1);
  }
  let newContent: string;
  try {
    newContent = file.updater(content);
  } catch (err) {
    console.error(`Failed to update ${file.path}: ${err}`);
    process.exit(1);
  }
  try {
    writeFileSync(file.path, newContent, "utf8");
    console.log(`✅ Updated ${file.path}`);
  } catch (err) {
    console.error(`Failed to write ${file.path}: ${err}`);
    process.exit(1);
  }
}

console.log(`\n🎉 Version bumped to ${newVersion} in all files.`);