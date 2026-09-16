#!/usr/bin/env bash
# PROPSA setup script - cross-platform installer
# Calls the Node.js install script

echo "Setting up PROPSA..."
# Ensure we are in the repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

# Run the Node.js install script
node scripts/install.mjs

echo "Setup completed."