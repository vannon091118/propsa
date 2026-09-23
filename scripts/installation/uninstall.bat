@echo off
REM PROPSA uninstall script for Windows
REM Calls the Node.js deinstall script with --ja flag

echo Uninstalling PROPSA...
REM Ensure we are in the repository root
cd /d "%~dp0..\.."
node scripts\installation\deinstall.mjs --ja

echo Uninstallation completed.