@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

echo Building and testing HeartGCN...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%build_app.ps1"
if errorlevel 1 (
    echo.
    echo BUILD FAILED. The application was not started.
    pause
    exit /b 1
)

set "APP=%SCRIPT_DIR%deploy\HeartGCNApp.exe"
if not exist "%APP%" (
    echo ERROR: Built application was not found at:
    echo %APP%
    pause
    exit /b 1
)

echo.
echo Build passed. Starting HeartGCN...
start "HeartGCN" "%APP%"
exit /b 0
