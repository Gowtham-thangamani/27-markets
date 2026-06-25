@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==================================================
echo   27 Markets - local launcher
echo ==================================================
echo.

echo [1/5] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
  echo       Docker not running - launching Docker Desktop...
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  set /a tries=0
  :waitdocker
  timeout /t 3 >nul
  docker info >nul 2>&1
  if errorlevel 1 (
    set /a tries+=1
    if !tries! lss 30 goto waitdocker
    echo       Docker did not start. Open Docker Desktop manually, then re-run this file.
    pause
    exit /b 1
  )
)
echo       Docker is up.

echo [2/5] Starting Postgres...
docker compose -f server\docker-compose.yml up -d

echo [3/5] Waiting for Postgres...
:waitpg
docker exec apex_postgres pg_isready -U apex -d apex_markets >nul 2>&1
if errorlevel 1 ( timeout /t 2 >nul & goto waitpg )
echo       Postgres ready.

echo [4/5] Migrations + demo data...
pushd server
call npx prisma migrate deploy
call npm run db:seed
popd

echo [5/5] Launching API and Web (two new windows)...
start "27 Markets API" cmd /k "cd /d %~dp0server && npm run start:dev"
start "27 Markets Web" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ==================================================
echo   Ready in ~20 seconds. Then open:
echo       http://localhost:5173
echo.
echo   Client portal:  client@27markets.io / Client123!
echo   Admin CRM:      admin@27markets.io  / Admin123!   then go to /admin
echo   Agent (staff):  agent@27markets.io  / Agent123!
echo.
echo   KEEP the two new windows open while using the app.
echo ==================================================
echo.
pause
