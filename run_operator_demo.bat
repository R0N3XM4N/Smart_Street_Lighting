@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_project.ps1" -SkipDatabaseSetup -OperatorDemo %*
set "exitCode=%ERRORLEVEL%"

if not "%exitCode%"=="0" (
    echo.
    echo Operator demo startup failed with exit code %exitCode%.
    pause
)

exit /b %exitCode%
