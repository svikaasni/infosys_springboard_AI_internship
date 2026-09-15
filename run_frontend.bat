@echo off
title BugSense AI - Frontend Server
cd /d "%~dp0frontend"

:: Check if node_modules exists; if not, install automatically
if not exist "node_modules" (
    echo [Notice] node_modules not found in frontend.
    echo Running npm install...
    call npm.cmd install
)

echo ===================================================
echo Starting BugSense AI Vite Frontend Server...
echo Web Application: http://localhost:5173
echo ===================================================
call npm.cmd run dev
pause
