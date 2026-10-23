---
name: lab-run-dispatcher
description: Turn an experiment request for the living-world lab (scripts/lab.mjs, gates, novelneed_all) into a ready-to-paste Windows PowerShell command block with a wall-time estimate and the one file to paste back. Use whenever the user asks to run, plan, size or estimate a lab run, ensemble, gates run, nudge/branch comparison or multi-seed Large-profile experiment, or asks "how long will this take" - even if they do not say "lab".
---

# Lab run dispatcher

Large-profile ensembles never run in the cloud container (4 cores). They run on the user's 24-core Windows machine. Your job is to decide where a run belongs, then hand over exact lines.

## 1. Estimate cost

CPU-seconds = seeds x (fork days + branch-days) x 30
branch-days = (listed branches + 1) x days — the control is always run in addition to the listed branches (`runLab` runs the control and every branch from the same save). If `--branches` is omitted, `lab_seed.ts` defaults to DEFAULT_BRANCHES (nudge:1, nudge:2, no-wolf-memory, random-choice, no-wood, no-food, no-clay): 7 + control = 8 branch-days.
Wall time = CPU-seconds / cores. First run `nproc`: 24 means you are on the user's machine and the lines are for here; 4 means the cloud container and the run is handed over instead.

- One `--dynamics` per run: to compare rich against authored, run twice with two `--out` directories. Never mix dynamics in one ensemble.
- Use 30 CPU-s per simulated day (measured 28.1 and 29.8 with all 24 cores busy). Never use the idle-core 15; it halves every estimate. Past check: plans ensemble predicted 20 min, took 28.
- Over about 3 minutes of wall time here, or many Large seeds: give lines for the user's machine. Unit tests, `tsc`, one-seed smoke runs and short checks run here.

## 2. Build the command block

Rules for Windows PowerShell 5.1: one command per code block, no `&&`, no bash syntax.

Always start with the sync lines (each its own block): `cd "C:\dev\Claude Experiment\living-world"`, `git pull`, and `npm ci` only the first time or if `package.json` changed. Remind that the code must be pushed first.

Then the run, from this template:

```
node scripts/lab.mjs --out <out> --seeds <N> --fork <F> --days <D> --dynamics <authored|rich|rich-unversioned> --branches <list>
```

and the report line:

```
npx vite-node scripts/lab_report.ts -- <out>
```

Facts to respect:
- `--seeds` max is 32 (12 named seeds + nov-1..nov-20). `--dynamics` must be one of rich, authored, rich-unversioned.
- Branch names come from AGENTS.md: `nudge:N`, `remove:<types>:<radius>` (aliases no-wood, no-food, no-clay), `random-choice`, `no-wolf-memory`, `rich`, `rich-stakes-only`, `rich-mood-only`, `rich-no-plans`, `rich-no-ask`, `rich-no-learning`, `rich-no-trades`, `rich-no-stock`. Reject anything else.
- Always include at least `nudge:1` (better `nudge:1,nudge:2`): compare a branch against the mean of control and nudges, never one control alone.
- Use a fresh `--out` directory after any source revision change; the resume guard checks rules version only, not source provenance.
- Novel-need runs use `node scripts/novelneed_all.mjs --out <out> --seeds N --fork F --days D` instead.

## 3. Tell the user

Always end with:
1. Estimated wall time on 24 cores, with the arithmetic shown, labelled as an estimate.
2. Paste back only `<out>\report.txt`, never progress lines.
3. Re-running the same command resumes unfinished seeds (finished seeds are skipped).
4. For anything over about 10 minutes, point them to the `windows-detached-launch` skill so the run survives the session.
