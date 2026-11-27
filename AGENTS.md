# Living World: notes for every agent (read this first)

This is the one instruction file for Codex, Claude and any other agent. `CLAUDE.md` only points here. It is read at the start of
every session, so it stays short.

## Current state: look it up, it is not copied here
- Rules version: `CURRENT_RULES_VERSION` in `src/sim/rulesversion.ts`. Claimed ranges: `docs/RULES_RANGES.md`.
- What each rules version changed and what was measured: `docs/RULES_LOG.md`, newest first. Search it for "Rules N checkpoint".
  Do not read it whole.
- Where work stopped: the newest `docs/HANDOFF_*.md`, then the last section of the brain note `projects/claude-living-world`
  (`basic-memory-local`, project `brain`).
- Branch, HEAD and uncommitted work: check git live. Notes are dated evidence, not the present state.

## Recording a rules version
Add one paragraph at the top of "Checkpoints (newest first)" in `docs/RULES_LOG.md`, and write the feature's own file under `docs/`.
Add nothing per version to this file. Older documents that cite `AGENTS.md` or `CLAUDE.md` for a "Rules N checkpoint" or for
"Current civilisation implementation" now mean `docs/RULES_LOG.md`. `tests/agent_docs.test.ts` fails when this file passes
32,000 bytes, when it holds a per-version checkpoint paragraph, or when `CLAUDE.md` stops being a pointer.

**Before planning, editing, committing or pushing:** read `WORKFLOW.md` and `PRODUCT_VISION.md`, including
[Feature increments: new capability and stronger connections](PRODUCT_VISION.md#feature-increments-new-capability-and-stronger-connections).
Owner decision, 1 November 2026: each feature increment must add one meaningful new
inhabitant mechanic/capability and strengthen existing systems through the same observable
causal chain. Name both outcomes, complete the necessary connecting implementation and
repairs, and verify both. Dedicated repairs, compatibility, performance and documentation
tasks stay focused; they do not require an added mechanic. This is no extra approval gate.

Branch lifecycle: [docs/BRANCH_LIFECYCLE.md](docs/BRANCH_LIFECYCLE.md). Use main for active work; listed historical branches are retired, with unique work preserved.

Two files govern how work happens here, and both come before the technical map below.

- **[WORKFLOW.md](WORKFLOW.md) — delivery rules.** The owner's standing workflow: no mandatory
  PR, second reviewer or repeat-approval loop. It supersedes older workflow instructions and must
  not be changed without an explicit owner instruction.
- **[PRODUCT_VISION.md](PRODUCT_VISION.md) — product direction.** What is being built and how to
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

## Unfamiliar technical pieces
- For unfamiliar technical pieces (algorithms, libraries, tooling), not Living World's own behaviour rules, briefly check how established open-source projects do it before writing from scratch, and note what you compared in the commit or relevant doc. Anything borrowed must stay deterministic (seeded RNG, no wall-clock time), and check the licence before copying code.

## Decisions already made (do not reopen without a reason)
- Rules support floor (Ryan, 20 November 2026): the project keeps rules 250 and up (`RULES_SUPPORT_FLOOR` in `src/sim/support_floor.ts`).
  The continuation pins of versions below the floor stay in `tests/` but are left out of `npm test`; `npm run test:archive` runs them.
  `npm run test:quick` leaves out the kept pins, the `zz_review` files and the files named in `tests/helpers/slow_tests.ts`; use it while
  working. `npm test` is the full suite and must pass before a merge to `main`. Two review tests that read gitignored evidence are left out
  of both and run with `npm run test:evidence` (`tests/helpers/evidence_tests.ts`; Ryan, 28 November 2026).
  Two later steps are decided and not built: refusing a save below the floor on load, then removing the gates of those versions from
  `src/sim`, one area at a time. Until the refusal lands a save below the floor still loads, and nothing in `npm test` checks that it
  runs as it did. Once it lands, the save and replay line below covers only versions at or above the floor. Record: brain note
  `decisions/manual/claude-living-world/2026-11-20-rules-support-floor-250`.
- Seeded randomness stays (replay, inspector, the lab). The golden fingerprints (`tests/golden.test.ts`) no longer constrain a change
  meant to alter behaviour: re-record them in the commit that changes rules. Ensemble gates (`scripts/gates.ts`, `docs/gates.json`) are the
  acceptance test for such a change.
- One current simulation: new product worlds use the integrated rules (`settings.dynamics = 'rich'` internally), with no player-facing mode toggle. Accepted improvements become standard. The 2026-10-17 owner decision in `docs/DEVELOPMENT_POLICY.md` supersedes the old rich-only/off-by-default product policy.
- Preserve recorded save/replay semantics; `authored` and absent dynamics remain compatibility/diagnostic values, not a second product to develop indefinitely. Use `currentWorldSettings` for new product worlds. Keep experiments in the lab; require evidence of effectiveness before claiming benefit. Historical goldens protect compatibility, not a freeze on current behavior.
- One branch, one purpose; one commit per problem. Open a PR only when explicitly requested by the owner. Integrate and push normally when the owner authorizes integration; do not invent an additional PR or approval step. Never force-push, rewrite history, expose secrets, or bypass actual repository protections.
- Owner workflow decision (2026-10-21): record review findings and their fixes once. A fixed finding with appropriate regression evidence does not automatically require another independent review. Repeat review or verification only for relevant changes, new evidence or unresolved defects. See `docs/DEVELOPMENT_POLICY.md`.
- Decision D-1 (2026-11-10, answers HANDOFF Q1): The foreground lab rule is withdrawn. The empty-food prompt's requirement of a foreground run, at most two `lab_seed` workers and no hidden launch no longer applies. The lab procedure in this file governs: long labs may run hidden, on all cores, through `scripts/lab.mjs`. The ground rules in section 11 of the 9 November 2026 review packet (a chat deliverable, not stored in the repo: ask before running, two-worker cap, no scheduled tasks, no resuming suspended threads, no deleting worktrees) are withdrawn as constraints, and labs and suites may be run as the agent sees fit. The 72-cell empty-food matrix was produced under the withdrawn procedure and remains valid as measured (see `docs/EMPTY_FOOD_CORRECTIONS.md`).
- Decision D-2 (2026-11-10, answers HANDOFF Q2): Measurement from a frozen separate worktree is permitted, and "touch no worktree but integrate" no longer forbids measurement checkouts. Decision D2 (2026-11-02, one rules-changing stream at a time) is withdrawn. The 2026-11-02 entry stays, and the brain record `decisions/manual/claude-living-world/2026-11-10-parallel-streams-supersede-d2` supersedes it and states how parallel streams avoid colliding on `CURRENT_RULES_VERSION` (claimed ranges), immutable continuation pins (a per-stream "record the pin before the successor", with unlanded pins re-recorded after a lower range lands) and lab baselines (named by stream). This unblocks the throwaway-worktree-per-commit bisect of the nine failing test files (review packet H1). It does not authorise running it.
- Decision D-3 (2026-11-10, answers HANDOFF Q4): The Stage B zero-failure full-suite requirement is withdrawn. The known `zz_review_e_famine_trace` gitignored-fixture failure and the nine assertion files failing at `e019cb33` no longer block Stage B on their own. A stage passes when (1) the full suite was run and its result is recorded (count, duration, workers); (2) every failure is listed and classified as known fixture, timeout under load, or regression; (3) no failure is new relative to the previous accepted baseline unless it has a first-bad commit and a named stream or task responsible for it; (4) the fixture test is either skipped explicitly or a tiny fixture is committed, so "known" does not mean machine-specific. It was adopted provisionally and stands unless a later dated decision revises it. The per-commit rule (a failing test is allowed only if it also fails at the previous commit) is unchanged and is not the Stage B rule.
- Decision D-4 (2026-11-10): The section 11 ground rules of the 9 November 2026 review packet are withdrawn, per D-1. Do not treat the packet's ground rules as constraints.
- Decision (2026-11-10, answers HANDOFF Q3): Adopting `empty-food-corrections` stands, and Q3 is closed. Rules 174 to 176 were fast-forwarded into main at `a9e6b98d` (`e019cb33..10d3adf2`) under the 9 November gap-stream prompt, and rules 177 to 184 were built on them, so reimplementation on main is not pursued. The branch `empty-food-corrections` is kept.

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
  every core; `--saves A.save.json,B.save.json [--rules-up N]` runs it from saved settlements instead of fresh seeds), `scripts/lab_report.ts` (`--vs A:B` adds a direct paired contrast of two branches), `scripts/gates.ts`, `scripts/cascade.ts` (cascade tracer), `scripts/coupling.ts` (static audit),
  `scripts/activity_mix.ts`, `scripts/novelneed_all.mjs`, `scripts/bench.ts`.
- Lab interventions: `nudge:N`, `remove:<types>:<radius>` (aliases no-wood, no-food, no-clay), `random-choice`, `no-wolf-memory`, `rich`, `rich-stakes-only` (stakes, moods change nothing), `rich-mood-only` (moods count, no stakes), `rich-no-plans` (rich with every private plan removed), `rich-no-ask` (rich with plans kept and only the D1 project ask removed; the D1 attribution branch), `rich-no-learning` (rich with Stage 3's estimates of what pays removed), `rich-no-trades` (rich with the trade people settle on removed), `rich-no-stock` (rules version 2 with household food preparation removed and nothing else; it changes nothing below version 2), `rich-no-defence` (the defensive action only), `rich-no-fatal-hold` (rules version 6 with the fatal-injury hold removed and nothing else; it changes nothing below version 6), `rich-no-shelter` (rules version 7 with only the plan to fetch a household home site's missing material removed; laying the site out, building, ownership and habitation stay, and it changes nothing below version 7), `rich-no-work-tastes` (rules version 31 personal work taste removed only; no effect below 31), `rich-no-leisure` (rules version 28 with the single idle fallback restored and nothing else; it changes nothing below version 28), `rich-no-leave-heaviest` (rules version 33 leaving a left-over to free the hands removed only; it changes nothing below version 33), `rich-no-remembered-need` (rules version 106 with care for an out-of-sight dependant judged from live needs again, as before 106; nothing else), `rich-no-checked-accounts` (rules version 107 with a checked first-hand account no longer held to its teller; nothing else).
- The AI inhabitant (`docs/INHABITANT.md`): `src/sim/external.ts` (the seam in `decide`), `src/sim/proposals.ts` (a proposed production goal, validated and adopted as the ordinary batch plan or refused; `docs/PROPOSED_PROJECTS.md`), `src/agent/` (observation, protocol, memory,
  transcript, model gate, rewind runner, scripted models; no network), `scripts/inhabit.ts` (live | replay | standard; `--memory` keeps notes;
  `--stub goal` needs no key), `scripts/inhabit_diff.ts` (two runs: same world or not), `scripts/inhabit_attribute.ts` (which decisions
  rested on the notes) and `scripts/inhabit_counterfactual.ts` (re-ask with and without notes), `src/app/inhabit.ts` + `src/ui/inhabit.ts` (the same run in the page from `?inhabit=<name>&…`; the model
  is reached through `scripts/inhabit/devserver.ts`, a Vite dev-server endpoint, so the key stays in the shell), `tests/inhabitant*.test.ts`,
  `tests/inhabit_app.test.ts`, `experiments/` (recorded runs).
- Removal arms added after rules 107 are named in each version's paragraph in `docs/RULES_LOG.md` and registered in `scripts/lab/lab.ts`.

## Expensive runs: give the user PowerShell lines, do not run them here
The cloud container has 4 cores; the user has a 24-core Windows machine. Anything over about 3 minutes of wall time here, or that needs many
Large-profile seeds (a Large world costs about 15 CPU-seconds per simulated day on an idle core, and about 30 when every core is busy,
which is the case that matters here), goes to the user's machine. Unit tests, `tsc`, one-seed smoke runs and short checks stay here.
When a run belongs on the user's machine:
1. Push the code first (they pull it), then give the lines below, adjusted. One line per code block, no `&&` (Windows PowerShell 5.1).
2. Say roughly how long it will take on 24 cores and what to paste back: only `<out>\report.txt`, never the progress lines.
3. Tell them re-running the same command resumes unfinished seeds (`lab.mjs` skips finished ones).

```
cd "C:\dev\Claude Experiment\living-world-integrate"
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
