@echo off
:: This batch file executes the PowerShell run script with appropriate bypass policy
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if %errorlevel% neq 0 (
    echo.
    echo An error occurred while running the script.
    pause
)
