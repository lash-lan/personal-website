@echo off
rem ---------------------------------------------------------------------
rem  Double-click this to start Scicom Axe so your PHONE can reach it,
rem  over the same Wi-Fi as this computer.
rem
rem  There is NO PASSWORD. Anyone else on the same Wi-Fi who knows the
rem  address can open it. Fine at home; think first on an office network.
rem ---------------------------------------------------------------------

title Scicom Axe (phone)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed on this computer, or Windows cannot find it.
  echo   Install it from https://nodejs.org  ^(choose the LTS version^).
  echo.
  pause
  exit /b 1
)

node scripts\phone.js

echo.
echo   Scicom Axe has stopped. Your phone can no longer reach it.
pause
