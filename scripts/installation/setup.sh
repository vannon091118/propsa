#!/usr/bin/env bash
# PROPSA setup script - cross-platform installer
# Calls the Node.js install script

echo "Setting up PROPSA..."
# Ensure we are in the repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Run the Node.js install script
node scripts/installation/install.mjs

echo "Setup completed."