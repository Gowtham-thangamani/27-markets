@echo off
setlocal enabledelayedexpansion
title 27 Markets launcher
echo ============================================================
echo   27 Markets - database + backend + frontend
echo ============================================================
echo.

REM ---- 1) Ensure Docker is running (Postgres runs in a container) ----
docker info >nul 2>&1
if %errorlevel%==0 goto dockerok
echo Docker not running - launching Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
set /a tries=0
:waitdocker
timeout /t 3 >nul
docker info >nul 2>&1
if %errorlevel%==0 goto dockerok
set /a tries+=1
if !tries! geq 60 (
  echo Docker did not start in time. Open Docker Desktop, then re-run this file.
  pause
  exit /b 1
)
echo   ...waiting for Docker to start ^(!tries!/60^)
goto waitdocker
:dockerok
echo Docker is ready.

REM ---- 2) Start the Postgres database container ----
echo Starting Postgres...
pushd "%~dp0server"
docker compose up -d
popd

REM ---- 3) Backend (NestJS :4000) + 4) Frontend (Vite :5173) ----
start "27 Markets - Backend"  cmd /k "cd /d "%~dp0server" && npm run start:dev"
start "27 Markets - Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Two windows opened. When both say "ready", open http://localhost:5173
echo (Press Ctrl+C in a window or close it to stop that server.)
echo.
pause
