@echo off
REM PROPAKT uninstall script for Windows
REM Calls the Node.js deinstall script with --ja flag

echo Uninstalling PROPAKT...
REM Ensure we are in the repository root
cd /d "%~dp0..\.."
node scripts\installation\deinstall.mjs --ja

echo Uninstallation completed.