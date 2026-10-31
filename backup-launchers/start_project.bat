@echo off
setlocal

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\start_project.ps1" %*
set "exitCode=%ERRORLEVEL%"

if not "%exitCode%"=="0" (
    echo.
    echo Project startup failed with exit code %exitCode%.
    pause
)

exit /b %exitCode%
