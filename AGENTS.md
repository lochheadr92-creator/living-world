# Living World: notes for Codex (read this first)

Branch lifecycle: [docs/BRANCH_LIFECYCLE.md](docs/BRANCH_LIFECYCLE.md). Use main for active work; listed historical branches are retired, with unique work preserved.

Two files govern how work happens here, and both come before the technical map below.

- **[WORKFLOW.md](WORKFLOW.md) — delivery rules.** The owner's standing workflow: no mandatory
  PR, second reviewer or repeat-approval loop. It supersedes older workflow instructions and must
  not be changed without an explicit owner instruction.
- **[PRODUCT_VISION.md](PRODUCT_VISION.md) — product direction.** What we are building and how to
  judge whether a change delivered it. Read it before planning any behavioural feature.

**What Living World is.** An autonomous world game with few direct controls, supported by a
causal, deterministic simulation in TypeScript/Vite: ~100 people (Large profile) with needs,
relations, building and farming, who live their own lives while the viewer follows individuals,
households, relationships, places and changes over time. The simulation is the foundation; the
observable experience is the product. The goal in progress is a richer, RimWorld/Dwarf
Fortress-style world (individuals differ, consequences last, small events cascade), inspectable
in the app and testable in a lab. Plan, stages and every measured result: `docs/EMERGENCE.md`.
Scaling and performance history: `docs/SCALING.md`.

## Working on behaviour: what counts as delivered
- Consider the observable experience when planning a behavioural feature: what a viewer will
  notice, understand or care about afterwards. Ask that alongside correctness and
  maintainability, not instead of them.
- Internal state or passing tests alone do not establish a complete viewer-facing experience.
  Mechanism evidence and viewer-facing evidence are different claims; which evidence answers
  which claim is set out in `docs/DEVELOPMENT_POLICY.md`, "Matching evidence to the claim".
- Presentation work is legitimate when it helps the viewer understand a real mechanism. It is not
  legitimate when it dresses up state that is not there.
- Behaviour changes still need the appropriate correctness and compatibility checks: determinism,
  resource conservation, save/replay, rules versioning, and the goldens and continuation
  references where they apply.
- Product direction never justifies expanding a bounded task. Write the idea down and raise it.

## Decisions already made (do not reopen without a reason)
- Seeded randomness stays (replay, inspector, the lab). The golden fingerprints (`tests/golden.test.ts`) no longer constrain a change
  meant to alter behaviour: re-record them in the commit that changes rules. Ensemble gates (`scripts/gates.ts`, `docs/gates.json`) are the
  acceptance test for such a change.
- One current simulation: new product worlds use the integrated rules (`settings.dynamics = 'rich'` internally), with no player-facing mode toggle. Accepted improvements become standard. The 2026-10-17 owner decision in `docs/DEVELOPMENT_POLICY.md` supersedes the old rich-only/off-by-default product policy.
- Preserve recorded save/replay semantics; `authored` and absent dynamics remain compatibility/diagnostic values, not a second product to develop indefinitely. Use `currentWorldSettings` for new product worlds. Keep experiments in the lab; require evidence of effectiveness before claiming benefit. Historical goldens protect compatibility, not a freeze on current behavior.
- One branch, one purpose; one commit per problem. Open a PR only when explicitly requested by the owner. Integrate and push normally when the owner authorizes integration; do not invent an additional PR or approval step. Never force-push, rewrite history, expose secrets, or bypass actual repository protections.
- Owner workflow decision (2026-10-21): record review findings and their fixes once. A fixed finding with appropriate regression evidence does not automatically require another independent review. Repeat review or verification only for relevant changes, new evidence or unresolved defects. See `docs/DEVELOPMENT_POLICY.md`.

## Current civilisation implementation

Current rules version 13 adds single-count social consequences and typed request history, after version 12 persistent townships and voluntary public storehouse projects.
`docs/CIVILISATION_IMPLEMENTATION.md` is the execution/continuation register; it records
version collisions, verified scope and unrun measurements. Candidate version 8 courier
and version 9 table eating are applied at version 11 on the local-main lineage.
Untagged 8/9 saves are refused as ambiguous; never relabel them.

## Where things are
- Rules version 7, the household-to-home situation (rich + `runsRulesVersion(world, 7)`): `src/sim/shelter.ts` (the cue -
  what a person can SEE of their own household's home and of the site it laid out - and the one-material, one-trip
  `wants`) with the `shelter` plan kind in `src/sim/intent.ts`. It adds only the MIDDLE of a chain that already worked:
  laying a site out, building, ownership (`buildings.ts completeSite` sets `hh.homeId`) and living in it (`habitation.ts`)
  are untouched; what was missing was anybody going to FETCH what their own home site was short of. Contract, evidence
  and limits: `docs/HOUSEHOLD_HOME.md`. Tests: `tests/household_home.test.ts`, `tests/v6_continuation.test.ts`;
  demonstrator `scripts/household_home.ts`; page check `scripts/browser/household_home_check.mjs`.
- `src/sim/mood.ts` thoughts, mood level, option weights, mourning. `src/sim/hardship.ts` lean seasons, winter, spoilage, wolf nerve.
- Rules version 2, household food preparation (rich + `runsRulesVersion(world, 2)`): `src/sim/provision.ts` (the two cues - what a
  household can SEE of its own food, and the approach of winter, which is deterministic; never the random lean season - the reserve
  target and its arithmetic, and the lab switch) with the `stock` plan kind in `src/sim/intent.ts`. Contract: `docs/RICH_WORLD.md`;
  measurement: `docs/EMERGENCE.md` and `prep_out8/`, `prep_out12/`. Tests: `tests/household_preparation.test.ts`,
  `tests/v1_continuation.test.ts`; page check: `scripts/browser/preparation_check.mjs`.
- A version-1 continuation reference (`tests/v1_continuation.expected.json`, recorded by `scripts/v1_reference.ts` BEFORE version 2
  existed): a version-1 world saved, loaded and continued, hashes and plain counts. Never re-record it to make a change pass.
- `src/sim/decision.ts` ranks options (mood weight applied here). `src/sim/probe.ts` work counters (never saved or hashed).
- `scripts/lab/` (fork a saved world, change one thing, compare against control and a one-draw "nudge"), `scripts/lab.mjs` (runs the lab on
  every core), `scripts/lab_report.ts`, `scripts/gates.ts`, `scripts/cascade.ts` (cascade tracer), `scripts/coupling.ts` (static audit),
  `scripts/activity_mix.ts`, `scripts/novelneed_all.mjs`, `scripts/bench.ts`.
- Lab interventions: `nudge:N`, `remove:<types>:<radius>` (aliases no-wood, no-food, no-clay), `random-choice`, `no-wolf-memory`, `rich`, `rich-stakes-only` (stakes, moods change nothing), `rich-mood-only` (moods count, no stakes), `rich-no-plans`, `rich-no-ask`, `rich-no-learning`, `rich-no-trades`, `rich-no-stock` (rules version 2 with household food preparation removed and nothing else; it changes nothing below version 2), `rich-no-defence` (the defensive action only), `rich-no-fatal-hold` (rules version 6 with the fatal-injury hold removed and nothing else; it changes nothing below version 6), `rich-no-shelter` (rules version 7 with only the plan to fetch a household home site's missing material removed; laying the site out, building, ownership and habitation stay, and it changes nothing below version 7).
- The AI inhabitant (`docs/INHABITANT.md`): `src/sim/external.ts` (the seam in `decide`), `src/agent/` (observation, protocol, memory,
  transcript, model gate, rewind runner, scripted models; no network), `scripts/inhabit.ts` (live | replay | standard; `--memory` keeps notes;
  `--stub goal` needs no key), `src/app/inhabit.ts` + `src/ui/inhabit.ts` (the same run in the page from `?inhabit=<name>&…`; the model
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
cd "C:\dev\Codex Experiment\living-world"
git pull
npm ci
node scripts/lab.mjs --out rich_out --seeds 24 --fork 0 --days 15 --dynamics authored --branches nudge:1,rich
npx vite-node scripts/lab_report.ts -- rich_out
node scripts/lab.mjs --out split_out --seeds 24 --fork 0 --days 15 --dynamics authored --branches nudge:1,nudge:2,rich,rich-stakes-only,rich-mood-only
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
