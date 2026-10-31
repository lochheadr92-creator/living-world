# Living World: notes for Claude (read this first)

Current state (31 October 2026): rules 114 hungry ripe-grain harvest (`HUNGRY_HARVEST.md`),
after 113 paid wild-grain seed input; the autonomy/environment programme continues from the register.
Installed inhabitant quantity revisions use protocols 33/34, observation 18 (`PROJECT_REVISION.md`); autonomous rules are 114.
The valid staged recovery now builds and uses a replacement, but later ends in thirst; WS16 viability is not complete.
Handoff provenance: [docs/CLAUDE_AUTONOMY_HANDOFF.md](docs/CLAUDE_AUTONOMY_HANDOFF.md).

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
- Owner workflow decision (2026-10-21): record review findings and their fixes once. A fixed finding with appropriate regression evidence does not automatically require another independent review. Repeat review or verification only for relevant changes, new evidence or unresolved defects. See `WORKFLOW.md`.

## Current civilisation implementation

The current rules version and the one-paragraph record of every version since 40 are kept in [AGENTS.md](AGENTS.md) ("Current civilisation implementation"; rules 64 on 2026-10-30, the dependency-chain programme `docs/DEPENDENCY_CHAIN_PROGRAMME.md` covering rules 45-64 and the expanded viewer/care/upkeep/continuity requirements). The paragraphs below describe rules 39 and earlier and are kept as history.

Rules version 39 uses personal trust to choose among otherwise eligible visible helpers for a tool plan's material request (`src/sim/options_social.ts`). Observation 12 / protocols 21-22 explain the choice without guaranteeing help. The isolated lab removal is `rich-no-project-helper-choice`; rules 38 and earlier retain their recorded choice. Staged execution, exact manual replay, ordinary null results and limits: `docs/MEANINGFUL_CONNECTIONS.md`.

Rules version 33 lets a person short of wood or stone whose pack has no room leave the heaviest left-over of the other at a storehouse or shared workplace they know (`src/sim/leave_heaviest.ts`, `docs/LEAVE_HEAVIEST.md`; rarely chosen, no measured benefit) after version 32, which makes a stalled site's shortfall text and one belief-outcome log line match the ledger (`docs/OBSERVER_TRUTH.md`; presentation only) after version 31, which adds personal work tastes (`src/sim/temperament.ts`) after version 30, which adds execution-boundary pending-layout claims (one home layout per household, one-tile footprint separation) and a bounded wait for transient footprint occupants; `src/sim/layout_claims.ts` owns this concept. Claims derive from active unexpired activities; paused work must reacquire. Access safety and rules 29/older are preserved. Version 29 snapshots event participant IDs (`src/sim/events.ts`), so later crew joins cannot rewrite historical participants or change story eligibility across save/load. Rules 28 and earlier retain their recorded semantics. Version 28 adds varied spare time (places to go when nothing is pressing, `src/sim/leisure.ts`) after version 27 night wait across conversation after version 26 spatial finite-deposit geology after version 25 bounded cosmetic stump marks and expired pair timers, with indexed historical lookup, after household practices transmitted through real meals after persistent political alignment after personally informed exchange journeys after settlement production/flow observations and household relocation and construction access, following person-held techniques, developmental proficiency, physical markets, competing coordinators, local death news, social history and township projects.
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
- `src/sim/intent.ts` private plans (rich only): getting ready for the night, making a tool, mending a roof. Adopt, step, set aside,
  resume, finish or give up with a reason; `freeOf`/`freeInv` keep a plan's materials from being spent twice; `planOfActivity` says
  whether the step is under way. Plan, evidence and the R1-R14 matrix: `docs/AUTONOMY.md`. The demonstrator is `scripts/projects.ts`
  (an ordinary autonomous run, every plan's life read off the records; `--dynamics authored` must report none).
- Stage D1, cooperation on a personal project (rich only): the ask is an option in `src/sim/options_social.ts` (own plan's shortfall,
  minus what is already promised, to someone seen carrying it), the answer is `social.ts evaluateRequest` (precise refusals:
  no_item/committed/making/own_need), the obligation is an ordinary `Commitment`, and `intent.ts planHelp`/`outstandingForPlan` read
  requests plus the promiser's commitment for the explanations. `Request.planId`/`Request.delivered` tie an ask to a project and
  record what really arrived. Tests: `tests/project_cooperation.test.ts`; page check: `scripts/browser/cooperation_check.mjs`.
- Rules version 2, household food preparation (rich + `runsRulesVersion(world, 2)`): `src/sim/provision.ts` (the two cues - what a
  household can SEE of its own food, and the approach of winter, which is deterministic; never the random lean season - the reserve
  target and its arithmetic, and the lab switch) with the `stock` plan kind in `src/sim/intent.ts`. Contract: `docs/RICH_WORLD.md`;
  measurement: `docs/EMERGENCE.md` and `prep_out8/`, `prep_out12/`. Tests: `tests/household_preparation.test.ts`,
  `tests/v1_continuation.test.ts`; page check: `scripts/browser/preparation_check.mjs`.
- A version-1 continuation reference (`tests/v1_continuation.expected.json`, recorded by `scripts/v1_reference.ts` BEFORE version 2
  existed): a version-1 world saved, loaded and continued, hashes and plain counts. Never re-record it to make a change pass.
- `src/sim/decision.ts` ranks options (mood weight applied here). `src/sim/probe.ts` work counters (never saved or hashed).
- Stage 3, second piece (rich only): `src/sim/trade.ts`, the one kind of work a person settles on as theirs, by comparative advantage
  from their own skills, what they can see others doing (`SeenEntity.work`) and what it has paid them; tilts the matching work by at
  most 6 where the ranking is made, shows on the person card, `rich-no-trades` removes it. Measured: `docs/EMERGENCE.md`, Stage 3
  second piece.
- Stage 3, first piece (rich only): `src/sim/learning.ts`, each person's own running estimate of what each kind of gathering has paid
  them (`p.payoff`, got against the option's expectation, learned at `endActivity`), tilting the gather options by at most ±6; the
  inspector shows it under Traits & skills. Lab branch `rich-no-learning`; metrics `specialisation`, `topKindShare`. Plan and
  measure: `docs/EMERGENCE.md`, Stage 3.
- The world pass (rich only; every module says so at its head and returns the neutral value elsewhere; `docs/RICH_WORLD.md` is the
  one-page map of what each adds, where it is read and how to see it): `src/sim/occasions.ts` (funeral, feast, wedding, harvest
  feast, market; `attendOptions`, `marketExchange`/`marketSwap`), `reputation.ts` (`p.heard`: stories with source and age, passed one at
  a time in `social.ts phaseNews`, read by `willingness` and the chat option), `illness.ts` (a fever: onset, spread in talk, meals and
  shared sleep, rest, immunity), `apprentice.ts` (apprenticeship on top of `trade.ts`: offered after a job done together, more taught within reach of the
  master, graduates into a trade of their own; removed with the trade by `rich-no-trades`), `life.ts` (hopes `p.goal` with `goalNudge`, injuries `p.injury`, `elderFactor`),
  `misdeeds.ts` (theft from another store, favours read from `Relation.debt`), `hunting.ts` + deer in `wildlife.ts` (`isThreat` keeps
  deer out of every danger check), `hardship.ts` dry spells and floods, `sources.ts` finite rock, `events.ts chronicleWorthy` +
  `world.chronicle`, `world.ts roadsTick`, `buildings.ts` `builtBy`/`built`, `options_social.ts` the ask worth making. Tests:
  `tests/{occasions,reputation,illness,apprentice,life,misdeeds,environment,settlement_record}.test.ts`.
- The second pass, ways to shape one's own life (rich only, same contract): `temperament.ts` (p.crowd, time alone, the reserved
  decline a crowded table), `lifechanges.ts` (p.lifeEvent: bereaved, new parent, moved, took in; a bereaved concern brings friends to
  look in; `leanOn` in willingness, `companyPull` in the chat), `traditions.ts` (world.traditions from well-attended occasions, held
  yearly, lapse unattended; `pickStory` retells the chronicle in `reputation.ts shareRumour`), `crews.ts` (world.crews; `crewNudge` in the
  ranking), `mediation.ts` (+ conversation purpose 'mediate'; `quarrelsFor`, `mediate`), `responsibilities.ts` (request kinds 'watch'
  and 'fire' for the laid up; the watch is a `visit` with `data.watch`, the fire a `fuel_fire` that fulfils). Tests:
  `tests/{temperament,lifechanges,traditions,crews,mediation,responsibilities}.test.ts`.
- `scripts/lab/` (fork a saved world, change one thing, compare against control and a one-draw "nudge"), `scripts/lab.mjs` (runs the lab on
  every core), `scripts/lab_report.ts` (`--vs A:B` adds a direct paired contrast of two branches), `scripts/gates.ts`, `scripts/cascade.ts` (cascade tracer), `scripts/coupling.ts` (static audit),
  `scripts/activity_mix.ts`, `scripts/novelneed_all.mjs`, `scripts/bench.ts`.
- Lab interventions: `nudge:N`, `remove:<types>:<radius>` (aliases no-wood, no-food, no-clay), `random-choice`, `no-wolf-memory`, `rich`, `rich-stakes-only` (stakes, moods change nothing), `rich-mood-only` (moods count, no stakes), `rich-no-plans` (rich with every private plan removed), `rich-no-ask` (rich with plans kept and only the D1 project ask removed; the D1 attribution branch), `rich-no-learning` (rich with Stage 3's estimates of what pays removed), `rich-no-trades` (rich with the trade people settle on removed), `rich-no-stock` (rules version 2 with household food preparation removed and nothing else; it changes nothing below version 2), `rich-no-defence` (the defensive action only), `rich-no-fatal-hold` (rules version 6 with the fatal-injury hold removed and nothing else; it changes nothing below version 6), `rich-no-shelter` (rules version 7 with only the plan to fetch a household home site's missing material removed; laying the site out, building, ownership and habitation stay, and it changes nothing below version 7), `rich-no-work-tastes` (rules version 31 personal work taste removed only; no effect below 31), `rich-no-leisure` (rules version 28 with the single idle fallback restored and nothing else; it changes nothing below version 28), `rich-no-leave-heaviest` (rules version 33 leaving a left-over to free the hands removed only; it changes nothing below version 33), `rich-no-remembered-need` (rules version 106 with care for an out-of-sight dependant judged from live needs again, as before 106; nothing else), `rich-no-checked-accounts` (rules version 107 with a checked first-hand account no longer held to its teller; nothing else).
- The AI inhabitant (`docs/INHABITANT.md`): `src/sim/external.ts` (the seam in `decide`), `src/sim/proposals.ts` (a proposed production goal, validated and adopted as the ordinary batch plan or refused; `docs/PROPOSED_PROJECTS.md`), `src/agent/` (observation, protocol, memory,
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
