@echo off
echo ===================================================
echo Starting BugSense AI Platform (Backend + Frontend)...
echo ===================================================
start "BugSense AI - Backend" cmd /k "%~dp0run_backend.bat"
start "BugSense AI - Frontend" cmd /k "%~dp0run_frontend.bat"
echo.
echo Both servers have been launched in separate CMD windows!
echo Open your browser to: http://localhost:5173
echo.
pause
