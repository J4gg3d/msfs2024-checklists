@echo off
title MSFS Checklist - Bridge Server

echo.
echo ==========================================
echo   MSFS Checklist - Bridge Server
echo ==========================================
echo.

cd /d "%~dp0bridge-server\MSFSBridge"

:: Pruefen ob dotnet verfuegbar ist
where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] .NET SDK nicht gefunden!
    echo.
    echo Bitte installiere das .NET 8 SDK von:
    echo https://dotnet.microsoft.com/download/dotnet/8.0
    echo.
    pause
    exit /b 1
)

:: Pruefen ob bereits kompiliert
if exist "bin\Debug\net8.0\MSFSBridge.exe" (
    echo [INFO] Starte Bridge...
    echo.
    bin\Debug\net8.0\MSFSBridge.exe
) else (
    echo [INFO] Kompiliere Bridge...
    dotnet build
    if %errorlevel% neq 0 (
        echo [FEHLER] Build fehlgeschlagen!
        pause
        exit /b 1
    )
    echo.
    echo [INFO] Starte Bridge...
    echo.
    bin\Debug\net8.0\MSFSBridge.exe
)

pause
