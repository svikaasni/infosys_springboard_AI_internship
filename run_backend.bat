@echo off
title BugSense AI - Backend Server
cd /d "%~dp0backend"

:: Check if local virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [Notice] Virtual environment not found in backend\venv.
    echo Creating virtual environment and installing packages...
    python -m venv venv
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo ===================================================
echo Starting BugSense AI FastAPI Backend Server...
echo API Health: http://127.0.0.1:8000/api/health
echo Swagger Docs: http://127.0.0.1:8000/docs
echo ===================================================
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
