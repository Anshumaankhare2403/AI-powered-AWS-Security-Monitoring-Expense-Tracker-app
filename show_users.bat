@echo off
setlocal
cd /d "%~dp0"
echo ======================================================================
echo   QUERYING LOCAL DATABASE USERS (SQL)
echo ======================================================================
if exist "backend\venv\Scripts\python.exe" (
    "backend\venv\Scripts\python.exe" "scripts\show_users.py"
) else (
    python "scripts\show_users.py"
)
