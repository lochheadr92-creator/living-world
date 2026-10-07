# Living World: notes for Claude (read this first)

A deterministic village simulation in TypeScript/Vite: ~100 people (Large profile) with needs, relations, building and farming. Goal in
progress: a richer, RimWorld/Dwarf Fortress-style world (individuals differ, consequences last, small events cascade), inspectable in
the app and testable in a lab. Plan, stages and every measured result: `docs/EMERGENCE.md`. Scaling and performance history: `docs/SCALING.md`.

## Decisions already made (do not reopen without a reason)
- Seeded randomness stays (replay, inspector, the lab). The golden fingerprints (`tests/golden.test.ts`) no longer constrain a change
  meant to alter behaviour: re-record them in the commit that changes rules. Ensemble gates (`scripts/gates.ts`, `docs/gates.json`) are the
  acceptance test for such a change.
- New behaviour goes behind `settings.dynamics = 'rich'` (off by default; authored worlds must stay exactly as they were, and the golden,
  determinism and save tests check that). The rules sets are in `src/sim/rules.ts`.
- One branch, one purpose; one commit per problem. Branch `claude/epic-franklin-469omp`, draft PR; never merge, never force-push.

## Where things are
- `src/sim/mood.ts` thoughts, mood level, option weights, mourning. `src/sim/hardship.ts` lean seasons, winter, spoilage, wolf nerve.
- `src/sim/decision.ts` ranks options (mood weight applied here). `src/sim/probe.ts` work counters (never saved or hashed).
- `scripts/lab/` (fork a saved world, change one thing, compare against control and a one-draw "nudge"), `scripts/lab.mjs` (runs the lab on
  every core), `scripts/lab_report.ts`, `scripts/gates.ts`, `scripts/cascade.ts` (cascade tracer), `scripts/coupling.ts` (static audit),
  `scripts/activity_mix.ts`, `scripts/novelneed_all.mjs`, `scripts/bench.ts`.
- Lab interventions: `nudge:N`, `remove:<types>:<radius>` (aliases no-wood, no-food, no-clay), `random-choice`, `no-wolf-memory`, `rich`.

## Expensive runs: give the user PowerShell lines, do not run them here
The cloud container has 4 cores; the user has a 24-core Windows machine. Anything over about 3 minutes of wall time here, or that needs many
Large-profile seeds (a Large world costs about 15 CPU-seconds per simulated day), goes to the user's machine. Unit tests, `tsc`, one-seed
smoke runs and short checks stay here. When a run belongs on the user's machine:
1. Push the code first (they pull it), then give the lines below, adjusted. One line per code block, no `&&` (Windows PowerShell 5.1).
2. Say roughly how long it will take on 24 cores and what to paste back: only `<out>\report.txt`, never the progress lines.
3. Tell them re-running the same command resumes unfinished seeds (`lab.mjs` skips finished ones).

```
cd "C:\dev\Claude Experiment\living-world"
git pull
npm ci
node scripts/lab.mjs --out rich_out --seeds 24 --fork 0 --days 15 --branches nudge:1,rich
npx vite-node scripts/lab_report.ts -- rich_out
node scripts/novelneed_all.mjs --out nn_out --seeds 24 --fork 6 --days 10
```
(`npm ci` only the first time or when `package.json` changed. The second `lab_report` line re-renders a report from existing data, which
takes seconds.) Cost: seeds x (fork days + branches x days) x about 15 CPU-seconds, divided by cores.

## Gotchas
- The cloud container restarts when the session is idle: background jobs die. Stay in an active turn while waiting (poll with
  `until`/`for` loops under 10 minutes), keep output small.
- `pkill -f` / `pgrep -f` with a pattern that appears in your own command line kills your own shell. Use the bracket trick (`'[l]ab_seed'`).
- Node `fetch` refuses port 4190. Chromium: `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome CHROME_FLAGS=--no-sandbox`.
- Compare a lab branch with the mean of the control and the nudges, never one control alone (one control is one chaotic draw).
- The two-draw nudge ends identical to the control in some seeds: the world's random state re-synchronises within about 60 ticks; cause unknown.

## Keep token cost down
Write long output to a file and show only the table that matters; read one line of a baseline, not a whole report; do not re-explore code the
section above already maps.
