# Expense Tracker - PowerShell All Services Launcher
$rootDir = $PSScriptRoot

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   Starting Expense Tracker Application Services" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Start MySQL on port 3307
Write-Host "`n[1/3] Starting MySQL 8.0 on port 3307..." -ForegroundColor Yellow
Start-Process "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" `
    -ArgumentList "--datadir=`"$rootDir\database\mysqldata`" --port=3307 --console"

Start-Sleep -Seconds 3

# 2. Start FastAPI Backend
Write-Host "[2/3] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$rootDir\backend`"; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Start-Sleep -Seconds 2

# 3. Start React Vite Frontend
Write-Host "[3/3] Starting React Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$rootDir\frontend`"; npm.cmd run dev"

Write-Host "`n=========================================================" -ForegroundColor Green
Write-Host "  All services launched successfully!" -ForegroundColor Green
Write-Host "  - Frontend:  http://localhost:5173" -ForegroundColor Green
Write-Host "  - Backend:   http://localhost:8000" -ForegroundColor Green
Write-Host "  - API Docs:  http://localhost:8000/docs" -ForegroundColor Green
Write-Host "  - MySQL DB:  localhost:3307" -ForegroundColor Green
Write-Host "=========================================================`n" -ForegroundColor Green
