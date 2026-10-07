#!/usr/bin/env bash
# Run the whole novel-need test (scripts/novelneed.ts) on all the cores this machine has, then print the report.
#   scripts/novelneed_all.sh [output-dir] [number-of-seeds (default 20)]
# Needs: node 22+, `npm ci` done. On Windows use Git Bash or WSL.
# Each seed = 6 simulated days + four branches of 10 days. Roughly 13 CPU-minutes a seed on a 2.1 GHz Xeon.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-nn_out}"
N="${2:-20}"
CORES=$( (nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "${NUMBER_OF_PROCESSORS:-4}") | head -1)
mkdir -p "$OUT"
SEEDS=(meadow river fern aspen birch cedar gen-1 gen-2 gen-3 gen-4 gen-5 gen-6 nov-1 nov-2 nov-3 nov-4 nov-5 nov-6 nov-7 nov-8 nov-9 nov-10 nov-11 nov-12 nov-13 nov-14 nov-15 nov-16 nov-17 nov-18 nov-19 nov-20)
echo "running ${N} seeds on ${CORES} cores into ${OUT}/"
run() { npx vite-node scripts/novelneed.ts -- --seed "$1" --fork 6 --days 10 > "$2/nn_$1.jsonl" 2> "$2/err_$1.txt" && echo "done $1"; }
export -f run
printf '%s\n' "${SEEDS[@]:0:$N}" | xargs -P "$CORES" -I{} bash -c 'run {} '"$OUT"
npx vite-node scripts/novelneed_report.ts -- "$OUT" | tee "$OUT/report.txt"
