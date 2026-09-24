# Repo cleanup and analysis script for PROPAKT
# This script runs various checks and cleanup tasks.

Write-Host "Running pruefen..."
npm run pruefen
Write-Host "
Cleaning artifacts..."
.\clean-artifacts.sh
Write-Host "
Cleaning node modules cache..."
.\clean-node.js
Write-Host "
Repo cleanup and analysis workflow completed.
