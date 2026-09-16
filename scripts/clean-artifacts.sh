#!/usr/bin/env bash
# Script to remove build artifacts while preserving dependencies and source code.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Cleaning build artifacts..."

# Directories to remove entirely
rm -rf .agents .freebuff dist logs snapshots test-output

# Remove dist/build inside node_modules (keep node_modules themselves)
find . -type d -name "node_modules" -prune -o -type d \( -name "dist" -o -name "build" -o -name "out" -o -name "target" \) -print0 | while IFS= read -r -d $'\0' dir; do
  echo "Removing $dir"
  rm -rf "$dir"
done

# Also remove mcp-server/dist and tauri-app/dist already covered above
echo "Artifact cleanup complete."