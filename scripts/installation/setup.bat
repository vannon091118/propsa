@echo off
REM PROPAKT setup script for Windows
REM Calls the Node.js install script

echo Setting up PROPAKT...
REM Ensure we are in the repository root
cd /d "%~dp0..\.."
node scripts\installation\install.mjs

echo Setup completed.