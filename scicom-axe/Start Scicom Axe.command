#!/bin/bash
# ---------------------------------------------------------------------
#  Double-click this file to start Scicom Axe on a Mac or Linux machine.
#  (On Windows, use "Start Scicom Axe.cmd" instead.)
#
#  A terminal window opens and stays open. That is the system running.
#  Close the window, or press Ctrl+C in it, when you are finished.
# ---------------------------------------------------------------------

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed on this computer, or this terminal cannot find it."
  echo
  echo "  Install it from https://nodejs.org  (choose the LTS version),"
  echo "  then double-click this file again."
  echo
  read -r -p "  Press Enter to close. "
  exit 1
fi

if [ ! -f server.js ]; then
  echo
  echo "  This file has been moved out of the scicom-axe folder."
  echo "  Put it back next to server.js and try again."
  echo
  read -r -p "  Press Enter to close. "
  exit 1
fi

OPEN=1 node server.js

echo
echo "  Scicom Axe has stopped. You can close this window."
read -r -p "  Press Enter to close. "
