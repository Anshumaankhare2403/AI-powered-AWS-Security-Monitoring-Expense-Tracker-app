# PowerShell helper to display users from SQLite database
$backendPython = Join-Path $PSScriptRoot "backend\venv\Scripts\python.exe"
$scriptPath = Join-Path $PSScriptRoot "scripts\show_users.py"

if (Test-Path $backendPython) {
    & $backendPython $scriptPath
} else {
    python $scriptPath
}
