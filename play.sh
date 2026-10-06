#!/usr/bin/env sh
# Launches Living World in your browser (macOS / Linux). Needs Node.js 20+.
cd "$(dirname "$0")" || exit 1
command -v npm >/dev/null 2>&1 || { echo "Node.js (with npm) is required: https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install || exit 1
exec npm run dev -- --open
