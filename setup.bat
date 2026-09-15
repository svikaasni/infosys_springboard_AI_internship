@echo off
setlocal enabledelayedexpansion
title BugSense AI - Environment Setup
echo ===================================================
echo     BugSense AI - Complete Local Environment Setup
echo ===================================================
echo.

:: 1. Check Python
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not added to PATH.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo (Make sure to check "Add Python to PATH" during installation)
    pause
    exit /b 1
)
python --version

:: 2. Check Node.js
echo.
echo [2/4] Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not added to PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
node --version

:: 3. Setup Backend Virtual Environment
echo.
echo [3/4] Setting up Python virtual environment and installing backend packages...
cd /d "%~dp0backend"
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment in backend\venv...
    python -m venv venv
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
echo Installing backend requirements from requirements.txt...
pip install -r requirements.txt

:: 4. Setup Frontend Packages
echo.
echo [4/4] Installing frontend npm packages...
cd /d "%~dp0frontend"
call npm.cmd install

echo.
echo ===================================================
echo   Setup Complete!
echo   You can now double-click 'start_all.bat' to launch
echo   BugSense AI at http://localhost:5173
echo ===================================================
pause
