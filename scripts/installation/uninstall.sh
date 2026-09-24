#!/usr/bin/env bash
# PROPAKT uninstall script - cross-platform uninstaller
# Calls the Node.js deinstall script with --ja flag

echo "Uninstalling PROPAKT..."
# Ensure we are in the repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Run the Node.js deinstall script with confirmation
node scripts/installation/deinstall.mjs --ja

echo "Uninstallation completed."