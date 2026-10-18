# Rules version 2: household food preparation for scarcity and winter

<!--
The prepared pull request for `claude/household-preparation-v2` -> `main`. It exists as a file because the PR could not
be opened from the session that wrote it: the GitKraken MCP tool asked for a sign-in, `gh` is not installed and no token
is set. The title is the heading above; the body is everything below the line. Delete this file once the PR is open.
Open it at: https://github.com/lochheadr92-creator/living-world/pull/new/claude/household-preparation-v2
-->

---

An adult may now decide to put a **modest food reserve** into their own household's home store, and then do it with the actions that already existed: gather food, carry it home, put it down. Nothing new was built underneath — the decision is an ordinary private plan (`Intention`, kind `stock`), the work is the ordinary stockpile forage and the ordinary deposit, and the reserve is ordinary food in the ordinary store, which spoils and is eaten like any other.

This is **rules version 2**. A world running version 1, and an unversioned world, have none of it.

## The two cues, and the one thing they may not do

* **Hardship** — what the person can actually see of their own household: the home store as they remember it, plus what they are carrying, coming to under half a day's eating for its members; or their own memory of having gone hungry within the last day (`mood.ts`'s `hungry` thought).
* **Season** — winter, the one hardship here that is not a roll: the last 4 days of every 12-day year, the same days each year, announced when it arrives and when it goes. The window is the 2 days before it.

**Nothing reads the lean season.** It is a one-in-five daily roll, unannounced, and `src/sim/provision.ts` touches neither `world.hardship` nor any draw behind it. A lean season reaches people only through the hardship cue, once their store has actually emptied. Hardship is tested first, so `season` means the narrow thing: nothing visibly wrong, and winter close. The cue is recorded on the plan so a measurement can tell anticipation from reaction.

## The size of it

Hunger falls 0.03 a tick and a day is 2400 ticks → 72 hunger a day; the foods people eat are worth 12–28 and average about 18; 72/18 = 4 units a person a day, and a measured Large run gave 3.8. Target: **one day's eating per member** (4 each), capped at **12** (three members' worth, and exactly a lean-to's capacity, so the poorest household can hold one), clipped again by the room the person believes their home has. A cushion of about one day; winter is four days. **Nothing here prevents starvation and nothing claims to.**

## How version 1 is proved not to have changed

A test that checks the version *label* is not enough: a gate that leaked would keep the label and change the world. So the **first commit on this branch**, made before any of the behaviour was written, records `tests/v1_continuation.expected.json` — two rich worlds stamped `rulesVersion: 1`, run, written out and read back through the real save path, then continued, with the compact and deep hashes **and** plain counts (people alive, live plans by kind, food in home stores) at each checkpoint. One case sits in the window before winter, where a seasonal behaviour would be adopted. `tests/v1_continuation.test.ts` compares against it on every pass, and asserts the only plan kinds in the reference are `night`, `repair` and `tool`.

Re-recording that file to make a change pass would delete the only evidence of a leak.

## What was measured — including what was not shown

24 seeds, profile `normal`, rules version 2, forked at day 0. Arms: `control` (preparation on), `rich-no-stock` (preparation off and nothing else), `nudge:1`/`nudge:2` (the noise floor). Question, metrics, window and interpretation were written into `prep_out8/RUN.md` **before** either run. Full precision in `prep_out8/PAIRED.md`.

| | control | no preparation | diff | 95% CI | of 24 seeds |
|---|---|---|---|---|---|
| preparations taken on (8 d) | 37.3 | 0 | −37.3 | [−39.6, −35.1] | 24 lower |
| from the season / from hardship | 6.3 / 31.0 | 0 / 0 | | | |
| finished / given up (8 d) | 16.0 / 13.5 | 0 / 0 | | | |
| units really put into home stores (8 d) | 166.5 | 0 | −166.5 | [−183.2, −149.7] | 24 lower |
| **home-store food per person entering winter** | **1.62** | **0.83** | **−0.80** | **[−1.05, −0.54]** | **22 lower** |
| the same after winter (12 d) | 0.73 | 0.29 | −0.44 | [−0.66, −0.22] | 18 lower |
| hunger exposure (8 d) | 0.00303 | 0.00261 | −0.00043 | [−0.00156, +0.00071] | 8 lower, 8 higher |
| hunger exposure (12 d) | 0.00973 | 0.00882 | −0.00091 | [−0.00355, +0.00173] | 11 lower, 12 higher |
| person-days preparing (8 d / 12 d) | 8.1 / 12.4 | 0 / 0 | | | 24 lower |
| tool/repair projects STARTED (12 d) | 86.0 | 101.3 | +15.3 | [+12.2, +18.4] | 24 higher |

**Reading the table:** every `diff` is **the arm minus `control`**, and `control` is the run *with* preparation enabled. So `homeFoodPerPerson −0.80` means removing preparation leaves 0.80 units a head *less* — preparation raises it; `projectsAdopted +15.3` means removing preparation *raises* project starts — preparation costs that many.

Nudge floor: 0.04–0.16 for `homeFoodPerPerson`, 0.00024–0.00158 for `hungerExposure`.

**Established** — the mechanism runs on its own, by both cues, and roughly doubles the food within a household's reach when winter arrives.

**Not established** — any welfare benefit. Hunger exposure, `belowCritical`, mean hunger, deaths and mood are all indistinguishable from chance in both windows.

Why it was not detected is **not** established. Reserve size, timing, access to the store at the moment of need, the work the preparation displaces, low baseline hardship in these runs, and plain statistical power are all live explanations, and nothing here separates them. “No welfare benefit was demonstrated” is the whole of the claim — not “the feature does nothing”, since it demonstrably moves food.

**The cost, measured** — about 3.6% of all person-time, and 15.3 fewer tool and repair projects *started* over 12 days, in all 24 seeds. Projects finished and tools held did not move.

The one outstanding run (a `town`-profile ensemble, where a village is actually short) is beyond the in-session budget and is left as an exact command in `HANDOFF.md`. A second null there would *not* establish that the reserve is too small; it would be consistent with that and with every other explanation above, and separating them needs a test designed for it.

## The reproducible example, autonomous, in the running app

Seed `river`, profile `normal`, arrivals off, page clock stopped and the world advanced by an exact number of ticks. Nothing is placed and nobody's option is picked.

At tick 2567, **Ben of household 1109** takes on 8 units because "there is next to nothing at home to fall back on". By about tick 5000 he has put **3 units into his own home, building 1110**, which held 0. The card reads:

> Put 8 units of food by for the household. Step: gather food to put by (5 more) — under way (Gathering wild grain). 3 of 8 units put by so far. Why: there is next to nothing at home to fall back on.

Another household's preparation finishes in the same window: *"done: put 5 units of food by; the store holds 13"*. Ten preparations then survive a save and a load with cue, target and units intact (tick 5567, state `92fe5e72`), and the world comes back as version 2. A version-1 world made in the same page forms 0 preparations while its 77 other plans carry on.

`scripts/browser/preparation_check.mjs` asserts behaviour and displayed text only. A headless Chrome renders in software: nothing here says anything about how any of it looks.

## Acceptance criteria

`tests/household_preparation.test.ts`, one `describe` group per criterion (43 tests): 1 evidence that may start a preparation · 2 situations that may not · 3 the action is an ordinary one and really moves food · 4 completion is about the food, not the label · 5 urgency, absence and staleness end it safely · 6 determinism and save/load · 7 version-1 and unversioned worlds · 8 the lab switch · 9 the app and the command line agree. A tenth group holds the reserve arithmetic to the documented numbers.

## The acceptance gate

AGENTS.md names the ensemble gates as the acceptance test for a behavioural change. Resolved here, with the evidence in `gate_v2_unversioned/` (`FINDING.md` has the full argument).

**No recorded gate can accept a version-2 change.** `scripts/gates.ts` refuses a comparison across rules versions, and both baselines are unversioned (`docs/gates.json`, authored; `docs/gates-rich.json`, rich). A version-2 run is refused with *"rules version unversioned vs 2"* — the guard working, not a defect. Recording a version-2 baseline from this candidate and then checking the candidate against it would be comparing it with itself, so that was not done.

**The gate that does apply was run** — an unversioned rich Large world, 24 seeds, 12 days, against `docs/gates-rich.json`. Ten of eleven gated metrics pass. `tools` **FAILS**: 140.8 against the band [143.9, 178.7], recorded 161.3.

**That failure belongs to `main`, not to this branch.** The same ensemble and gate were run on `main` (`5b7a941`) in a temporary worktree (removed; its output kept under `gate_v2_unversioned/main_5b7a941/`). `main` fails identically — 140.8, same band, every other line the same to the digit. `docs/gates-rich.json` was recorded 56 commits before `main` (`e8118fe`) and is stale. Re-recording it on this branch would look like a candidate recording its own pass, so it is left for merged `main`, with the command written down in `FINDING.md`.

**And the same run is new preservation evidence.** All 24 seeds have identical final hashes on the two revisions, and every metric both record is equal on all 24; the only difference is the ten metric *fields* this branch adds. So an unversioned rich Large world at 12 days is bit-for-bit unchanged — a profile and duration neither the goldens (80×80 and scenes) nor the version-1 continuation reference (`normal`) reaches.

**What acceptance therefore rests on,** since the repository's gate cannot be applied to a version-2 run: the older generation provably unchanged (goldens, the continuation reference, and the Large ensemble above); the test suite; the preparation ensembles with their ablation and nudge floor; and the two browser checks. Two baselines should be recorded **after** merge and explicitly not as evidence for it — a refresh of the stale `docs/gates-rich.json`, and a new `docs/gates-v2.json`.

## Verification (at `26a6d18`, the branch head at the time of writing)

| | result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 79 files, **793 tests**, all passing |
| `npm run build` | clean |
| `git diff --check` | clean |
| `npx vite-node scripts/golden.ts` | all fingerprints match (**not** re-recorded) |
| `npx vite-node scripts/v1_reference.ts` | version-1 continuation unchanged |
| `node scripts/browser/current_world_check.mjs …` | 15/15 |
| `node scripts/browser/preparation_check.mjs …` | 19/19 |
| `scripts/gates.ts` against `docs/gates-rich.json` | 10 of 11 pass; `tools` fails **identically on `main`** (see above) |

## Review of the implementation (self-review — no independent reviewer saw this)

A first pass over the completed diff found one real defect, fixed in `9cfad02` with a test: `optDepositFood` stores only grain, fish, fruit and berries, but the step threshold counted all six foods — so somebody carrying five units of meat settled on "take the food home", a step the engine never offers, and stayed on it until the deadline. Both ensembles were re-run at the fix into emptied directories; 23 of 24 seeds were byte-identical and no conclusion changed.

A second, focused pass over the areas the closeout brief names:

| area | verdict | evidence |
|---|---|---|
| version-1 and unversioned preservation | **PASS** | goldens unchanged; `tests/v1_continuation.test.ts`; and 24/24 Large unversioned seeds identical to `main` (above) |
| food ownership | **PASS** | `provision.ts:149` filters `b.hh !== p.hhId`; new test puts a neighbour's larger, fuller `house` next door and the plan still targets her own hut — it fails if the filter is removed |
| storage access | **PASS** | `facilities.ts mayDeposit` returns true for a home (no `ops`); the deposit is the ordinary option, matched by its own key |
| physical delivery | **PASS** | `creditStocked` is called from the deposit handler as each kind transfers, so only food that moved is credited |
| contribution vs claimed completion | **PASS** | `done` needs `inStore >= want` **and** `worked > 0`; a store filled otherwise ends the plan as "came to hold N without their doing" |
| judged on belief, not the world | **PASS** | new test fills her store while she is away: the plan stays active until she has seen it — it fails if `stockOutcome` reads the building |
| urgent-need interruption | **PASS** | `reviewIntentions` sets it aside with a reason; tested |
| stale plans, impossible actions | **PASS, with one noted limit** | the deadline always ends it; the "gave up after 3 tries" path needs `stepTarget`, which a `forage` step does not have, so a plan with no food anywhere is ended by the deadline alone (1–2 days), not sooner |
| several members, no double counting | **PASS** | the target is a *level* the store should reach, not a quota each owes; tested |
| save/load, deterministic continuation | **PASS** | tested in-process and in the page (10 preparations restored with cue, target and units) |
| lab-switch isolation, incl. forks with live plans | **PASS** | `runBranch` restores in a `finally`; a live plan at a fork ends with "no longer part of these rules"; tested |
| inspector claims match recorded state | **PASS, after a fix** | the browser check compares the card's figure with the world's; `76dbfdf` fixes "1 units" → "1 unit" in the card and the record |

Two commits came out of the second pass: `76dbfdf` (the singular) and `26a6d18` (discriminating tests for the two areas that had been settled only by reading). Each new test was confirmed to fail when its rule is removed.

## Commits

| commit | what |
|---|---|
| `2a4a704` | A version-1 continuation reference, recorded before version 2 exists |
| `91705f1` | A lab-guard test said "the current rules version is 1" in numbers |
| `6819a2a` | Rules version 2: a household puts a little food by, for a bad day or for winter |
| `9018d65` | The lab can take food preparation out and leave everything else in |
| `83c770e` | The lab can see what food preparation does, and what it costs |
| `3c71703` | The measurement: the mechanism works, the food is real, the benefit is not shown |
| `7d7197c` | A viewer can follow a preparation from the evidence to the food, in the page |
| `4e629c9` | Document what was built, what was measured and what was not shown |
| `9cfad02` | Review of the diff: a reserve could settle on a trip home it could not make |
| `335d91d` | The measurement re-run at `9cfad02`, and the documented numbers brought to it |
| `72640d7` | The PR blocker and the prepared body, written down |
| `76dbfdf` | Review of the inspector text: "1 units" → "1 unit" |
| `26a6d18` | Discriminating tests for two review areas: whose store, whose knowledge |
| `571a404` | The acceptance gate resolved: none can accept version 2, and the one that runs already failed on `main` |
| `eaca9f4` | Claims the experiments do not support, taken back out |

`2a4a704` is the only commit without the required "Existing modules touched, and why" line: it touched no existing modules (four new files), and it was not amended because rewriting history is a hard rail for this task.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
