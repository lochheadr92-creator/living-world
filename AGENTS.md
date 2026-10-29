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

Current rules version 51 remembers an in-person ask for wood, stone or a workshop good that was turned down for want of spare goods as a customer lead for six days, lets the goods be brought to the asker later (a swap through the barter, a gift through the offer, a walk to where they were last known, or the ordinary haul to the asker's own site), records what came back, closes the open ask as delivered later, and lets the trade review hold a trade whose customers were served and look again at one whose asks all lapsed (`src/sim/customers.ts`, `docs/CUSTOMERS.md`); lab removal `rich-no-customers`; the rules-50 reference was recorded from `7c70fb0` first.

Rules version 50 lets an adult take on one batch at a known workshop as a private plan that persists from input to use (dig or collect the input, bring it, run the recipe, collect the output, haul it to the site; a processed input the same workshop makes is made first, one stage only; a hand-tool or roof plan may run beside the batch), and lets a batch left in its work phase be got back to by its maker at once or by anyone with access after 300 ticks instead of blocking the workshop as busy (`src/sim/batch_plan.ts`, `facilities.ts resumableJob`, `docs/BATCH_PLAN.md`); lab removals `rich-no-batch-plans` and `rich-no-batch-resume`; the rules-49 reference was recorded from `de8af50` first.

Rules version 49 makes a meal from a witnessed public storehouse a personal benefit received, counted once when the meal ends by exactly what left the store (`src/sim/civic_benefit.ts recordCivicFoodBenefit`, `docs/CIVIC_FOOD_BENEFIT.md`); lab removal `rich-no-civic-food-benefit`; the rules-48 reference was recorded from `53b06ec` first.

Rules version 48 lets a promise to a person name the asker's home as the agreed place to leave it when the helper knows that home, keeps it by an ordinary deposit credited once from what moved, and leans a hungry person's choice of whom to ask on remembered trust by at most ±4 (`src/sim/delivery_place.ts`, `docs/DELIVERY_PLACE.md`); lab removal `rich-no-delivery-place`; the rules-47 reference was recorded from `2a05b30` first.

Rules version 47 gives a fed adult's own-home shelter work a pre-winter nudge and, while the winter window is open, lets a household lay its home out past its own workshop site and the open-site cap and keeps its home site through the stale-site sweep (`src/sim/winter_shelter.ts`, `docs/WINTER_SHELTER.md`, adapted from the unmerged `claude/winter-shelter-v34` whose number collided with main's 34); lab removal `rich-no-winter-shelter`; the rules-46 reference was recorded from `80b0fe4` first.

Rules version 46 makes the household's winter reserve two days' eating put by in what keeps: a season plan gathers grain when it knows a wild grain source, takes it to a known granary whose share then counts as reserve, and a household may eat from the granary within its share or the emergency ration (`src/sim/provision.ts`, `docs/WINTER_RESERVE.md`); lab removal `rich-no-winter-reserve` (one strategy, removed together); the rules-45 reference was recorded from `ce50c0a` first.

Rules version 45 lets a food or care helper with nothing to spare promise the food kind they personally know a wild source of, forage that kind and deliver it, and lets a hungry person eat (or bring a dependant) the meat or bread they carry (`src/sim/food_help.ts`, `docs/FOOD_HELP.md`); isolated lab removal `rich-no-food-fetch`; the rules-44 reference was recorded from `7625337` first. The programme register for the dependency-chain work is `docs/DEPENDENCY_CHAIN_PROGRAMME.md`.

Rules version 44 varies creation-time proficiency across all 11 skills and makes adult charcoal knowledge non-universal (`src/sim/background.ts`); founders and arrivals share this path, newborns remain novices, and existing saves are not rewritten. Version 43 connects personally heard material requests to feasible trade choices; version 42 connects actual public-store material receipt to later civic support; version 41 adds learner-requested timed instruction. Contracts, actual manual-panel checks, natural Pia/Hana learning and charcoal output, null results, budget stop and replay limits: `docs/EXPERIENCE_CONNECTIONS.md`. Isolated lab removals: `rich-no-learner-instruction`, `rich-no-civic-benefit`, `rich-no-local-demand`; `rich-uniform-backgrounds` affects future creation only. Predecessor continuation references 40–43 preserve recorded semantics.

Version 40 connects remembered raw material in own homes/public storehouses to personal/building material acquisition, plan viability and voluntary material promises (`src/sim/material_stock.ts`). Physical withdrawal still checks access, stock and capacity; no new knowledge or receipt schema. Isolated lab removals: `rich-no-stored-material-plans` and `rich-no-stored-material-promises`. Rules 39 and earlier retain their recorded semantics. Contract, ordinary occurrence, preserved failures and exact manual replay: `docs/STORED_MATERIAL_CONNECTIONS.md`.

Rules version 39 uses personal trust to choose among otherwise eligible visible helpers for a tool plan's material request (`src/sim/options_social.ts`). Observation 12 / protocols 21-22 explain the choice without guaranteeing help. The isolated lab removal is `rich-no-project-helper-choice`; rules 38 and earlier retain their recorded choice. Staged execution, exact manual replay, ordinary null results and limits: `docs/MEANINGFUL_CONNECTIONS.md`.

Rules version 38 adds locally witnessed construction satisfaction and later aspirations, following rules 36 competing-plan release and 37 partial shelter delivery. Observation 11 exposes personal hopes and truthful plan summaries. Full evidence and compatibility boundaries: `docs/SIX_STAGE_COMPLETION.md`. Earlier rules version 33 lets a person short of wood or stone whose pack has no room leave the heaviest left-over of the other at a storehouse or shared workplace they know (`src/sim/leave_heaviest.ts`, `docs/LEAVE_HEAVIEST.md`; rarely chosen, no measured benefit) after version 32, which makes a stalled site's shortfall text and one belief-outcome log line match the ledger (`docs/OBSERVER_TRUTH.md`; presentation only) after version 31, which adds personal work tastes (`src/sim/temperament.ts`) after version 30, which adds execution-boundary pending-layout claims (one home layout per household, one-tile footprint separation) and a bounded wait for transient footprint occupants; `src/sim/layout_claims.ts` owns this concept. Claims derive from active unexpired activities; paused work must reacquire. Access safety and rules 29/older are preserved. Version 29 snapshots event participant IDs (`src/sim/events.ts`), so later crew joins cannot rewrite historical participants or change story eligibility across save/load. Rules 28 and earlier retain their recorded semantics. Version 28 adds varied spare time (places to go when nothing is pressing, `src/sim/leisure.ts`) after version 27 night wait across conversation after version 26 spatial finite-deposit geology after version 25 bounded cosmetic stump marks and expired pair timers, with indexed historical lookup, after household practices transmitted through real meals after persistent political alignment after personally informed exchange journeys after settlement production/flow observations and household relocation and construction access, following person-held techniques, developmental proficiency, physical markets, competing coordinators, local death news, social history and township projects.
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
- Lab interventions: `nudge:N`, `remove:<types>:<radius>` (aliases no-wood, no-food, no-clay), `random-choice`, `no-wolf-memory`, `rich`, `rich-stakes-only` (stakes, moods change nothing), `rich-mood-only` (moods count, no stakes), `rich-no-plans`, `rich-no-ask`, `rich-no-learning`, `rich-no-trades`, `rich-no-stock` (rules version 2 with household food preparation removed and nothing else; it changes nothing below version 2), `rich-no-defence` (the defensive action only), `rich-no-fatal-hold` (rules version 6 with the fatal-injury hold removed and nothing else; it changes nothing below version 6), `rich-no-shelter` (rules version 7 with only the plan to fetch a household home site's missing material removed; laying the site out, building, ownership and habitation stay, and it changes nothing below version 7), `rich-no-work-tastes` (rules version 31 with only personal work tastes disabled; no effect below 31), `rich-no-leisure` (rules version 28 with the single idle fallback restored and nothing else; it changes nothing below version 28), `rich-no-leave-heaviest` (rules version 33 leaving a left-over to free the hands removed only; it changes nothing below version 33).
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
