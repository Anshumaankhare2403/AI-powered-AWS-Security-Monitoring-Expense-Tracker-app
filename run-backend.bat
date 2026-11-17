@echo off
title Expense Tracker - Backend (FastAPI)
echo Starting FastAPI Backend on http://localhost:8000 ...
cd /d "%~dp0backend"
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
