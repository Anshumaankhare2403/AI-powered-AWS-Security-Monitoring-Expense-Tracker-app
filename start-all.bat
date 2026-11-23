@echo off
title Expense Tracker - All Services Launcher
echo =========================================================
echo   Starting Expense Tracker Application Services
echo =========================================================

set ROOT_DIR=%~dp0

:: 1. Start MySQL on port 3307 if installed
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" (
    echo [1/3] Starting MySQL 8.0 on port 3307...
    start "Expense Tracker - MySQL Database (Port 3307)" "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --datadir="%ROOT_DIR%database\mysqldata" --port=3307 --console
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] MySQL server not installed; using SQLite database.
)

:: 2. Start FastAPI Backend
echo [2/3] Starting FastAPI Backend on http://localhost:8000 ...
start "Expense Tracker - FastAPI Backend" cmd /k "cd /d %ROOT_DIR%backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Brief pause before frontend
timeout /t 2 /nobreak >nul

:: 3. Start React Vite Frontend
echo [3/3] Starting React Vite Frontend on http://localhost:5173 ...
start "Expense Tracker - React Frontend" cmd /k "cd /d %ROOT_DIR%frontend && npm.cmd run dev"

echo.
echo =========================================================
echo All services launched!
echo - Frontend:  http://localhost:5173
echo - Backend:   http://localhost:8000
echo - API Docs:  http://localhost:8000/docs
echo =========================================================
echo.
