@echo off
rem Launches Living World in your browser (Windows). Needs Node.js 20+.
cd /d "%~dp0"
where npm >nul 2>nul || (echo Node.js with npm is required: https://nodejs.org & pause & exit /b 1)
if not exist node_modules call npm install || (pause & exit /b 1)
call npm run dev -- --open
pause
