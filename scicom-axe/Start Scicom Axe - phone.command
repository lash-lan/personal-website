#!/bin/bash
# ---------------------------------------------------------------------
#  Double-click this to start Scicom Axe so your PHONE can reach it,
#  over the same Wi-Fi as this computer. (Mac or Linux.)
#
#  There is NO PASSWORD. Anyone else on the same Wi-Fi who knows the
#  address can open it. Fine at home; think first on an office network.
# ---------------------------------------------------------------------

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed. Get it from https://nodejs.org (LTS version)."
  echo
  read -r -p "  Press Enter to close. "
  exit 1
fi

node scripts/phone.js

echo
echo "  Scicom Axe has stopped. Your phone can no longer reach it."
read -r -p "  Press Enter to close. "
