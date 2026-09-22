@echo off
rem ---------------------------------------------------------------------
rem  Double-click this file to start Scicom Axe.
rem
rem  It opens your browser by itself. Leave this black window open while
rem  you are using the system, and close it when you are finished.
rem ---------------------------------------------------------------------

title Scicom Axe
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed on this computer, or Windows cannot find it.
  echo.
  echo   Install it from https://nodejs.org  ^(choose the LTS version^),
  echo   then double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist "server.js" (
  echo.
  echo   This file has been moved out of the scicom-axe folder.
  echo   Put it back next to server.js and try again.
  echo.
  pause
  exit /b 1
)

set OPEN=1
node server.js

echo.
echo   Scicom Axe has stopped. You can close this window.
pause
