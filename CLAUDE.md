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
- `src/sim/intent.ts` private plans (rich only): getting ready for the night, making a tool, mending a roof. Adopt, step, set aside,
  resume, finish or give up with a reason; `freeOf`/`freeInv` keep a plan's materials from being spent twice; `planOfActivity` says
  whether the step is under way. Plan, evidence and the R1-R14 matrix: `docs/AUTONOMY.md`. The demonstrator is `scripts/projects.ts`
  (an ordinary autonomous run, every plan's life read off the records; `--dynamics authored` must report none).
- Stage D1, cooperation on a personal project (rich only): the ask is an option in `src/sim/options_social.ts` (own plan's shortfall,
  minus what is already promised, to someone seen carrying it), the answer is `social.ts evaluateRequest` (precise refusals:
  no_item/committed/making/own_need), the obligation is an ordinary `Commitment`, and `intent.ts planHelp`/`outstandingForPlan` read
  requests plus the promiser's commitment for the explanations. `Request.planId`/`Request.delivered` tie an ask to a project and
  record what really arrived. Tests: `tests/project_cooperation.test.ts`; page check: `scripts/browser/cooperation_check.mjs`.
- `src/sim/decision.ts` ranks options (mood weight applied here). `src/sim/probe.ts` work counters (never saved or hashed).
- Stage 3, first piece (rich only): `src/sim/learning.ts`, each person's own running estimate of what each kind of gathering has paid
  them (`p.payoff`, got against the option's expectation, learned at `endActivity`), tilting the gather options by at most ±6; the
  inspector shows it under Traits & skills. Lab branch `rich-no-learning`; metrics `specialisation`, `topKindShare`. Plan and
  measure: `docs/EMERGENCE.md`, Stage 3.
- The world pass (rich only; every module says so at its head and returns the neutral value elsewhere; `docs/RICH_WORLD.md` is the
  one-page map of what each adds, where it is read and how to see it): `src/sim/occasions.ts` (funeral, feast, wedding, harvest
  feast, market; `attendOptions`, `marketExchange`/`marketSwap`), `reputation.ts` (`p.heard`: stories with source and age, passed one at
  a time in `social.ts phaseNews`, read by `willingness` and the chat option), `illness.ts` (a fever: onset, spread in talk, meals and
  shared sleep, rest, immunity), `trades.ts` (a calling from the best skill, `tradeNudge` in the ranking, apprenticeship from shared
  work; switch `setTrades`, lab `rich-no-trades`), `life.ts` (hopes `p.goal` with `goalNudge`, injuries `p.injury`, `elderFactor`),
  `misdeeds.ts` (theft from another store, favours read from `Relation.debt`), `hunting.ts` + deer in `wildlife.ts` (`isThreat` keeps
  deer out of every danger check), `hardship.ts` dry spells and floods, `sources.ts` finite rock, `events.ts chronicleWorthy` +
  `world.chronicle`, `world.ts roadsTick`, `buildings.ts` `builtBy`/`built`, `options_social.ts` the ask worth making. Tests:
  `tests/{occasions,reputation,illness,trades,life,misdeeds,environment,settlement_record}.test.ts`.
- `scripts/lab/` (fork a saved world, change one thing, compare against control and a one-draw "nudge"), `scripts/lab.mjs` (runs the lab on
  every core), `scripts/lab_report.ts`, `scripts/gates.ts`, `scripts/cascade.ts` (cascade tracer), `scripts/coupling.ts` (static audit),
  `scripts/activity_mix.ts`, `scripts/novelneed_all.mjs`, `scripts/bench.ts`.
- Lab interventions: `nudge:N`, `remove:<types>:<radius>` (aliases no-wood, no-food, no-clay), `random-choice`, `no-wolf-memory`, `rich`, `rich-stakes-only` (stakes, moods change nothing), `rich-mood-only` (moods count, no stakes), `rich-no-plans` (rich with every private plan removed), `rich-no-ask` (rich with plans kept and only the D1 project ask removed; the D1 attribution branch), `rich-no-learning` (rich with Stage 3's estimates of what pays removed), `rich-no-trades` (rich with trades and apprenticeship removed).
- The AI inhabitant (`docs/INHABITANT.md`): `src/sim/external.ts` (the seam in `decide`), `src/agent/` (observation, protocol, memory,
  transcript, model gate, rewind runner, scripted models; no network), `scripts/inhabit.ts` (live | replay | standard; `--memory` keeps notes;
  `--stub goal` needs no key), `scripts/inhabit_diff.ts` (two runs: same world or not), `scripts/inhabit_attribute.ts` (which decisions
  rested on the notes) and `scripts/inhabit_counterfactual.ts` (re-ask with and without notes), `src/app/inhabit.ts` + `src/ui/inhabit.ts` (the same run in the page from `?inhabit=<name>&…`; the model
  is reached through `scripts/inhabit/devserver.ts`, a Vite dev-server endpoint, so the key stays in the shell), `tests/inhabitant*.test.ts`,
  `tests/inhabit_app.test.ts`, `experiments/` (recorded runs).

## Expensive runs: give the user PowerShell lines, do not run them here
The cloud container has 4 cores; the user has a 24-core Windows machine. Anything over about 3 minutes of wall time here, or that needs many
Large-profile seeds (a Large world costs about 15 CPU-seconds per simulated day on an idle core, and about 30 when every core is busy,
which is the case that matters here), goes to the user's machine. Unit tests, `tsc`, one-seed smoke runs and short checks stay here.
When a run belongs on the user's machine:
1. Push the code first (they pull it), then give the lines below, adjusted. One line per code block, no `&&` (Windows PowerShell 5.1).
2. Say roughly how long it will take on 24 cores and what to paste back: only `<out>\report.txt`, never the progress lines.
3. Tell them re-running the same command resumes unfinished seeds (`lab.mjs` skips finished ones).

```
cd "C:\dev\Claude Experiment\living-world"
git pull
npm ci
node scripts/lab.mjs --out rich_out --seeds 24 --fork 0 --days 15 --branches nudge:1,rich
npx vite-node scripts/lab_report.ts -- rich_out
node scripts/lab.mjs --out split_out --seeds 24 --fork 0 --days 15 --branches nudge:1,nudge:2,rich,rich-stakes-only,rich-mood-only
node scripts/novelneed_all.mjs --out nn_out --seeds 24 --fork 6 --days 10
```
(`npm ci` only the first time or when `package.json` changed. The second `lab_report` line re-renders a report from existing data, which
takes seconds.) Cost: seeds x (fork days + branches x days) x about 30 CPU-seconds, divided by cores - measured twice on the
24-core machine, at 28.1 and 29.8 CPU-seconds per simulated day with all 24 busy. The older figure of 15 is an idle-core rate and
halves every estimate: the plans ensemble was predicted at 20 minutes and took 28.

## Gotchas
- The cloud container restarts when the session is idle: background jobs die. Stay in an active turn while waiting (poll with
  `until`/`for` loops under 10 minutes), keep output small.
- A job backgrounded through the harness also dies when the *session* ends, which costs a whole ensemble. On the user's Windows
  machine launch a long run detached instead, so it outlives the session and the next one just reads `<out>/report.txt`:
  `Start-Process node -ArgumentList 'scripts/lab.mjs','--out',... -WorkingDirectory <repo> -RedirectStandardOutput <log> -WindowStyle Hidden -PassThru`.
- Do not test a lab run's liveness by the mtime of its `lab_*.jsonl`. Each seed's file is a buffered stream that only touches disk
  when an arm finishes, so a healthy run looks untouched for minutes, and an mtime check cries stall seconds before the seeds all
  land together. Check the process (`tasklist //FI "PID eq <pid>"`); 24 parallel seeds finish in a burst, not a trickle.
- `pkill -f` / `pgrep -f` with a pattern that appears in your own command line kills your own shell. Use the bracket trick (`'[l]ab_seed'`).
- Node `fetch` refuses port 4190. Chromium: `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome CHROME_FLAGS=--no-sandbox`.
- Compare a lab branch with the mean of the control and the nudges, never one control alone (one control is one chaotic draw).
- The two-draw nudge ends identical to the control in some seeds: the world's random state re-synchronises within about 60 ticks; cause unknown.

## Keep token cost down
Write long output to a file and show only the table that matters; read one line of a baseline, not a whole report; do not re-explore code the
section above already maps.
