#!/usr/bin/env bash
# Script to verify version consistency across project files.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Function to extract version
get_version() {
  local file="$1"
  if [[ -f "$file" ]]; then
    if [[ "$file" == *.json ]]; then
      # For package.json etc.
      node -p "JSON.parse(require('fs').readFileSync('$file', 'utf8')).version" 2>/dev/null || echo ""
    elif [[ "$file" == *.toml ]]; then
      # Simple grep for version line
      grep '^version' "$file" | sed -E 's/^version\s*=\s*"?([^"]+)"?\s*$/\1/' | head -n1
    else
      echo ""
    fi
  else
    echo ""
  fi
}

VERSION_ROOT_PKG=$(get_version "package.json")
VERSION_TAURI_PKG=$(get_version "tauri-app/package.json")
VERSION_CARGO=$(get_version "tauri-app/src-tauri/Cargo.toml")
VERSION_TAURI_CONF=$(get_version "tauri-app/src-tauri/tauri.conf.json")

echo "Root package.json version: $VERSION_ROOT_PKG"
echo "Tauri app package.json version: $VERSION_TAURI_PKG"
echo "Cargo.toml version: $VERSION_CARGO"
echo "Tauri conf version: $VERSION_TAURI_CONF"

if [[ "$VERSION_ROOT_PKG" == "$VERSION_TAURI_PKG" && "$VERSION_ROOT_PKG" == "$VERSION_CARGO" && "$VERSION_ROOT_PKG" == "$VERSION_TAURI_CONF" && -n "$VERSION_ROOT_PKG" ]]; then
  echo "✅ All versions match: $VERSION_ROOT_PKG"
  exit 0
else
  echo "❌ Version mismatch!"
  exit 1
fi