#!/bin/bash
# usage: step.sh < answer.json   (writes the answer and shows the filtered next ask)
cd "C:/dev/Claude Experiment/living-world-integrate"
node scripts/inhabit/live.mjs inhabit_mira/bridge say 2>&1 | python inhabit_mira/show.py
