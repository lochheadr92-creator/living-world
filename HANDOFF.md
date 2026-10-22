# Living World Repository Handoff

Updated: 2026-10-22

A continuation guide for this checkout. The repository and the current Git state are authoritative; this is a map, not a
replacement for them.

## Where things stand

**Wolf defence is built, fixed and committed on this branch, and the branch is now closed as
superseded (2026-10-22).** This checkout is the independent `claude/wolf-defence-v3`
line, cut from `main` at `1a13408`. Rules version 3 here means the spear and the active defence, and nothing else. What it
is, the staged and autonomous evidence, and the version-number collision with main are written down in
`docs/WOLF_DEFENCE.md` - read that first. The rest of this file is history from the household-preparation pass and other
earlier work; it records what was true then, not what is true now.

- Checkout: `C:\dev\Claude Experiment\living-world`, branch `claude/wolf-defence-v3`.
- Committed in this pass: `a5157f8` (a spear, wanted only by somebody who has met a wolf), `b204cb7` (rules version 3:
  an armed adult can stand and drive a wolf off), `a99fbfd` (the standoff fix: the wolf hesitates before somebody squared
  up to it, the defender holds her ground, ATTEMPT_TICKS measured down to 10). Before version 3 existed, `b0dd770`
  recorded the version-2 continuation reference, including a `v2-wolves` case - old behaviour, new instruments.
- Working tree: clean. Evidence: `encounters_out/` (staged encounters comparison, 40 seeds) and `scripts/encounters.ts`.
- The branch is pushed as `origin/claude/wolf-defence-v3` and is **closed as superseded**: main moved past this line
  (habitation as its version 3, wolf defence integrated as its version 4, then versions 6 and 7). The two lines'
  version-3 saves are not interchangeable - see `docs/WOLF_DEFENCE.md`. No further work belongs on this branch.

## What inhabitants can now do

An adult may decide to put a **modest food reserve** into their own household's home store, and then do it with the actions
that already existed: gather food, carry it home, put it down. Nothing new was built underneath - the decision is an ordinary
private plan (`Intention`, kind `stock`), the work is the ordinary stockpile forage and the ordinary deposit, and the reserve
is ordinary food in the ordinary store, which spoils and is eaten like any other.

This is **rules version 2**. A world running version 1, and an unversioned world, have none of it.

### The two cues, and the one thing they may not do

* **Hardship** - what the person can actually see of their own household: the home store as they remember it, plus what they
  are carrying, coming to under half a day's eating for its members; or their own memory of having gone hungry within the
  last day (`mood.ts`'s `hungry` thought).
* **Season** - winter, the one hardship here that is not a roll: the last 4 days of every 12-day year, the same days each
  year, announced when it arrives and when it goes. The window is the 2 days before it.

**Nothing reads the lean season.** It is a one-in-five daily roll, unannounced, and `src/sim/provision.ts` touches neither
`world.hardship` nor any draw behind it. A lean season reaches people only through the hardship cue, once their store has
actually emptied. Hardship is tested first, so `season` means the narrow thing: nothing visibly wrong, and winter close. The
cue is recorded on the plan so a measurement can tell anticipation from reaction.

### The size of it

Hunger falls 0.03 a tick and a day is 2400 ticks, so 72 hunger a day; the foods people eat are worth 12 to 28 and average
about 18; 72/18 = 4 units a person a day, and a measured Large run gave 3.8. Target: **one day's eating per member** (4
each), capped at **12** (three members' worth, and exactly a lean-to's capacity, so the poorest household can hold one),
clipped again by the room the person believes their home has. It is a cushion of about one day; winter is four days.
**Nothing here prevents starvation and nothing claims to.**

## The reproducible example, in the running app

Autonomous, not staged: nothing is placed, nobody's option is picked.

```
npx vite --port 5184
node scripts/browser/preparation_check.mjs "http://127.0.0.1:5184/"      ->  19/19 passed
```

Seed `river`, profile `normal`, arrivals off, the page's own clock STOPPED and the world advanced by an exact number of
ticks (so nothing races requestAnimationFrame and the tick numbers mean something).

* At tick 2567, **Ben of household 1109** takes on 8 units because "there is next to nothing at home to fall back on"
  (cue `hardship`). His step is gathering.
* By about tick 5000 he has put **3 units into his own home, building 1110**, which held 0 when the example started. The card
  reads: *"Put 8 units of food by for the household. Step: gather food to put by (5 more) - under way (Gathering wild
  grain). 3 of 8 units put by so far. Why: there is next to nothing at home to fall back on."*
* Another household's preparation reaches a verdict in the same window: *"done: put 5 units of food by; the store holds 13"*.
* Ten preparations then survive a save and a load with their cue, target and units intact (tick 5567, state `92fe5e72`), and
  the world comes back as rules version 2.
* A version-1 world made in the same page forms **0** preparations while its 77 other plans carry on; a world started after
  it is version 2 again; and loading the version-1 save puts it back on version 1, not on the latest.

The check asserts behaviour and displayed text only. A headless Chrome renders in software: **nothing here says anything
about how any of it looks.**

## What was measured, including what was not shown

24 seeds, profile `normal`, rules version 2, forked at day 0. Arms: `control` (preparation on), `rich-no-stock` (preparation
off and nothing else), `nudge:1` and `nudge:2` (the noise floor). The question, metrics, window and how a result would be
read were written into `prep_out8/RUN.md` **before** either run. Full-precision paired differences are in
`prep_out8/PAIRED.md`, because the report rounds to one decimal and two of these numbers live below that.

| | control | no preparation | diff | 95% CI | of 24 seeds |
|---|---|---|---|---|---|
| preparations taken on (8 d) | 37.3 | 0 | -37.3 | [-39.6, -35.1] | 24 lower |
| from the season / from hardship | 6.3 / 31.0 | 0 / 0 | | | |
| finished / given up (8 d) | 16.0 / 13.5 | 0 / 0 | | | |
| units really put into home stores (8 d) | 166.5 | 0 | -166.5 | [-183.2, -149.7] | 24 lower |
| **home-store food per person entering winter** | **1.62** | **0.83** | **-0.80** | **[-1.05, -0.54]** | **22 lower** |
| the same after winter (12 d) | 0.73 | 0.29 | -0.44 | [-0.66, -0.22] | 18 lower |
| hunger exposure (8 d) | 0.00303 | 0.00261 | -0.00043 | [-0.00156, +0.00071] | 8 lower, 8 higher |
| hunger exposure (12 d) | 0.00973 | 0.00882 | -0.00091 | [-0.00355, +0.00173] | 11 lower, 12 higher |
| person-days preparing (8 d / 12 d) | 8.1 / 12.4 | 0 / 0 | | | 24 lower |
| tool and repair projects STARTED (12 d) | 86.0 | 101.3 | +15.3 | [+12.2, +18.4] | 24 higher |

**Reading the table.** Every `diff` is **the arm minus `control`**, and `control` is the run WITH preparation enabled.
So `homeFoodPerPerson -0.80` means the arm with preparation removed ends with 0.80 units a head LESS - that is,
preparation raises it. `projectsAdopted +15.3` means removing preparation RAISES project starts by 15.3 - that is,
preparation costs that many.

Nudge floor: 0.04-0.16 for `homeFoodPerPerson`, 0.00024-0.00158 for `hungerExposure`.

**Established.** The mechanism runs on its own, by both cues, and roughly doubles the food within a household's reach when
winter arrives (1.62 units a head against 0.83).

**Not established.** Any welfare benefit. Hunger exposure, `belowCritical`, mean hunger, deaths and mood are all
indistinguishable from chance in both windows.

Why it was not detected is **not** established by these runs. Several explanations are live and none has been tested
against the others: the reserve may be too small to matter; it may arrive too late, or be eaten before it is needed; a
household may not reach its own store at the moment it is hungry; the time it takes from other work may offset what it
gains; the baseline hardship in these runs may be low enough that there was little to improve; or the effect may be real
but smaller than 24 seeds can resolve. Saying which would need a test that separates them. Until then "no welfare
benefit was demonstrated" is the whole of it - which is not the same as "the feature does nothing": it demonstrably
moves food, and that is reported above.

**The cost, measured.** About 3.6% of all person-time over eight days (3.8% over twelve), and 15.3 fewer tool and repair
projects *started* over 12 days, in every one of the 24 seeds. Projects finished and tools held did not move.

### The one run that is outstanding

Whether a village that is actually short would benefit. The `town` profile (100 people in one camp, which has a real famine
in it) is where that could be answered. It is beyond the budget for a run made inside a session, so it is left here as a
command. About 20 minutes on 24 cores; re-running it resumes unfinished seeds.

```
cd "C:\dev\Claude Experiment\living-world"
```

```
git pull
```

```
node scripts/lab.mjs --out prep_town_out --seeds 24 --fork 0 --days 12 --profile town --branches rich-no-stock,nudge:1
```

```
npx vite-node scripts/lab_report.ts -- prep_town_out
```

Paste back only `prep_town_out\report.txt`, never the progress lines. Read `hungerExposure`, `deaths`, `belowCritical` and
`homeFoodPerPerson` for `rich-no-stock` against the nudge arm, remembering that each figure is the arm minus the
control.

What it can and cannot settle. A resolved difference in a village that is genuinely short would be evidence of welfare
benefit under hardship. A second null would **not** show that the reserve is too small: it would be consistent with
that, and equally with timing, access, the work it displaces, or an effect below what 24 seeds resolve. Which of those
it is would need a test that separates them - varying the reserve size alone, or the window alone, with everything else
held - and no such test has been run. Do not read a second null as a mandate to make the reserve bigger.

## How version 1 is proved not to have changed

A test that checks the version LABEL is not enough: a gate that leaked would keep the label and change the world. So, from
the revision **before** version 2 was written, `scripts/v1_reference.ts --write` recorded
`tests/v1_continuation.expected.json`: two rich worlds stamped `rulesVersion: 1`, run, written out and read back through the
real save path, then continued, with the compact and deep hashes **and** plain counts (people alive, live plans by kind,
food believed to be in home stores, food actually in them) at each checkpoint. One case (`prewinter`, seed `river`, to tick
18000) sits in the window before winter, which is exactly where a seasonal behaviour would be adopted.

`tests/v1_continuation.test.ts` compares against it on every test run, and one of its assertions is that the only plan kinds
in the reference are `night`, `repair` and `tool`.

**Re-recording that file to make a change pass would delete the only evidence of the leak.** A failure there means the gate
is wrong.

## The acceptance gate

AGENTS.md names the ensemble gates as the acceptance test for a behavioural change. The full argument and every number
is in `gate_v2_unversioned/FINDING.md`; in short:

* **No recorded gate can accept a version-2 change.** `scripts/gates.ts` refuses a comparison across rules versions, and
  both baselines are unversioned (`docs/gates.json`, authored; `docs/gates-rich.json`, rich). A version-2 run is refused
  with "rules version unversioned vs 2" - the guard working. Recording a version-2 baseline from this candidate and
  then checking the candidate against it would be comparing it with itself, so that was not done.
* **The gate that does apply was run**: an unversioned rich Large world, 24 seeds, 12 days, against
  `docs/gates-rich.json`. Ten of eleven gated metrics pass. `tools` FAILS - 140.8 against the band [143.9, 178.7],
  recorded 161.3.
* **That failure belongs to `main`.** The same ensemble and gate on `main` (`5b7a941`), run in a temporary worktree now
  removed and kept under `gate_v2_unversioned/main_5b7a941/`, fails identically: 140.8, same band, every other line the
  same to the digit. `docs/gates-rich.json` was recorded 56 commits before `main` (`e8118fe`) and is stale. It is
  deliberately NOT re-recorded on this branch.
* **The same run is new preservation evidence.** All 24 seeds have identical final hashes on the two revisions and every
  metric both record is equal on all 24; the only difference is the ten metric fields this branch adds. An unversioned
  rich Large world at 12 days is therefore bit-for-bit unchanged - a profile and duration neither the goldens nor the
  continuation reference reaches.

**What acceptance rests on instead**, since the gate cannot be applied to a version-2 run: the older generation provably
unchanged (goldens, continuation reference, the Large ensemble above); the suite; the preparation ensembles with their
ablation and nudge floor; the two browser checks.

**Two baselines to record after merge**, and explicitly not as evidence for it - each about 4 minutes on 24 cores, and
recording asserts nothing:

```
node scripts/lab.mjs --out gates_rich_refresh --seeds 24 --fork 0 --days 12 --profile large --dynamics rich-unversioned --branches none
```

```
npx vite-node scripts/gates.ts -- gates_rich_refresh --record --file docs/gates-rich.json --force
```

```
node scripts/lab.mjs --out gates_v2_out --seeds 24 --fork 0 --days 12 --profile large --branches none
```

```
npx vite-node scripts/gates.ts -- gates_v2_out --record --file docs/gates-v2.json
```

The first replaces a baseline that is stale and already failing; the second gives version 2 a reference so the NEXT
behavioural change can be gated.

## Review of the implementation

Self-review. **No independent reviewer has seen this branch**, and nothing below should be read as if one had.

A first pass over the completed diff found one real defect (`9cfad02`): the step threshold counted all six foods while
`optDepositFood` stores only four, so somebody carrying five units of meat settled on a trip home the engine never
offers and stayed on it until the deadline. Fixed with a test; both ensembles re-run; 23 of 24 seeds byte-identical.

A second pass over the areas the closeout brief names:

| area | verdict | evidence |
|---|---|---|
| version-1 and unversioned preservation | PASS | goldens; `tests/v1_continuation.test.ts`; 24/24 Large unversioned seeds identical to `main` |
| food ownership | PASS | `provision.ts` filters `b.hh !== p.hhId`; a test puts a neighbour's larger, fuller `house` next door and the plan still targets her own hut |
| storage access | PASS | `facilities.ts mayDeposit` is true for a home; the deposit is the ordinary option, matched by its own key |
| physical delivery | PASS | `creditStocked` runs in the deposit handler as each kind transfers, so only food that moved is credited |
| contribution vs claimed completion | PASS | `done` needs `inStore >= want` AND `worked > 0`; otherwise "came to hold N without their doing" |
| judged on belief, not the world | PASS | a test fills her store while she is away; the plan stays active until she has seen it |
| urgent-need interruption | PASS | set aside with a reason; tested |
| stale plans, impossible actions | PASS, with one limit | the deadline always ends it; the "gave up after 3 tries" path needs a `stepTarget`, which a `forage` step has not, so a plan with no food anywhere waits out its deadline (1-2 days) rather than ending sooner |
| several members, no double counting | PASS | the target is a LEVEL the store should reach, not a quota each owes; tested |
| save/load, deterministic continuation | PASS | in-process and in the page (10 preparations restored with cue, target, units) |
| lab-switch isolation, incl. forks with live plans | PASS | `runBranch` restores in a `finally`; a live plan at a fork ends with "no longer part of these rules" |
| inspector claims match recorded state | PASS, after a fix | the browser check compares the card's figure with the world's; `76dbfdf` fixes "1 units" to "1 unit" |

Two commits came out of it: `76dbfdf` and `26a6d18`. Each new test was confirmed to FAIL when its rule is removed.

## Verification

All run on this branch at `26a6d18`, the branch head when they were run.

| | result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 79 files, **793 tests**, all passing |
| `npm run build` | clean |
| `git diff --check` | clean |
| `npx vite-node scripts/golden.ts` | all golden fingerprints match (not re-recorded) |
| `npx vite-node scripts/v1_reference.ts` | version-1 continuation unchanged |
| `node scripts/browser/current_world_check.mjs http://127.0.0.1:5186/` | 15/15 |
| `node scripts/browser/preparation_check.mjs http://127.0.0.1:5186/` | 19/19 |
| `npx vite-node scripts/gates.ts -- gate_v2_unversioned --file docs/gates-rich.json` | 10 of 11 pass; `tools` fails identically on `main` |

Both ensembles were re-run at `9cfad02` into emptied directories, because `9cfad02` changes behaviour. The earlier pair,
made at `83c770e`, is **not** in the working tree - one directory name must not hold two sets of numbers - but it is
**retained in Git history and retrievable**, which is where it should be looked for rather than being treated as lost:

```
git show 3c71703:prep_out8/report.txt
git show 3c71703 --stat -- prep_out8 prep_out12
git checkout 3c71703 -- prep_out8 prep_out12     # only into a scratch checkout, never over the current ones
```

All 53 files of that earlier pair are at `3c71703`. Reusing the directory NAME rather than taking a new one was a
departure from the task's own rule and is recorded as such here; it was not repaired by re-running, because re-running
to tidy history would have cost more evidence than it bought. Every future run after a source change takes a new
directory. The difference between the two pairs was small (the food effect moved from -0.78 to -0.80) and changed no
conclusion.

The acceptance criteria are `tests/household_preparation.test.ts`, one `describe` group per criterion (43 tests):
1 evidence that may start a preparation, 2 situations that may not, 3 the action is an ordinary one and really moves food,
4 completion is about the food and not the label, 5 urgency/absence/staleness end it safely, 6 determinism and save/load,
7 version-1 and unversioned worlds, 8 the lab switch, 9 the app and the command line agree. A tenth group holds the reserve
arithmetic to the documented numbers.

## Limits worth carrying forward

These stand. None is fixed by this pass.

- **Household preparation shows no measured welfare benefit.** It moves food and costs time; that is all the measurement
  supports. Do not describe it as preventing starvation.
- The measurement is on the **Normal** profile only. Whether a village under real pressure would benefit is untested;
  the `town` run above is the missing evidence. Why no benefit showed on Normal is also untested - reserve size, timing,
  access, displaced work, low baseline hardship and plain statistical power are all live explanations and none has been
  separated from the others.
- The Stage 4 pilots are **one seed, one day** each. Days 4, 8 and 12 are missing, not zero; `hall` and `ask_info` were never
  exercised; zero cross-camp contact means unexercised in that window, nothing more.
- Stage 4 known-cohort coverage is low: the plan's day-0 cohort rule leaves 38 of 100 people unknown in a Large world, so
  every cross-camp figure describes about 37% of the data. Whether to keep that rule is a decision to take **before** an
  ensemble.
- No Stage 4 ensemble has been run. `rich-no-transmission` is unwritten.
- Apprenticeship is built but barely exercised (one start, no graduations across four 12-day worlds).
- Rules versions 1 and 2 establish supported baselines. They do **not** reconstruct unidentified historical rich releases and
  do not prove compatibility with any of them. What IS verified across revisions: saves produced by pre-merge `main`
  (`8a2b6e7`) load into this build, keep their dynamics, stay explicitly unversioned, run on, and survive a re-save with a
  matching hash.
- The `rich` lab intervention switches a legacy world to rich dynamics at the fork but leaves it **unversioned**, which is the
  unversioned policy working as intended. Such an arm therefore never exercises version-2 behaviour.

## Map

- `docs/DEVELOPMENT_POLICY.md` - one evolving simulation, how a change becomes standard, lab defaults, rules versions 1 and 2,
  and how a version is proved not to have leaked.
- `docs/EMERGENCE.md` - staged plan, stop rules, every measured result, including this pass.
- `docs/RICH_WORLD.md` - the rich systems and what each one actually does, including household food preparation.
- `docs/AUTONOMY.md` - the R1-R14 requirement matrix with current status.
- `docs/SCALING.md` - profiles, rule sets, the rich-only town corrections.
- `src/sim/provision.ts`, `src/sim/rulesversion.ts`, `src/sim/transmission.ts`, `scripts/stage4.ts` - newest modules.
- Experiment outputs in `prep_out8/`, `prep_out12/`, `learn_out/`, `noask_out/`, `town_out/`, `stage4_pilot_out/`,
  `stage4_pilot2_out/`.

## Commits on this branch

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
| `76dbfdf` | Review of the inspector text: a person who put one unit by was told "1 units" |
| `26a6d18` | Discriminating tests for two review areas: whose store it is, and whose knowledge |
| `571a404` | The acceptance gate resolved: none can accept version 2, and the one that runs already failed on `main` |
| `eaca9f4` | Claims the experiments do not support, taken back out |
| `e870b3c` | The prepared body lists every commit it describes |
| (last) | Pull request #18 opened; the integration state recorded |

`2a4a704` is the only commit without the required "Existing modules touched, and why" line: it touched no existing modules
(four new files), and it was not amended because rewriting history is a hard rail for this task.

## Integration: pull request #18, open and NOT merged

**<https://github.com/lochheadr92-creator/living-world/pull/18>** - open, not a draft, head
`claude/household-preparation-v2`, base `main`, 130 files. `main` is still at `5b7a941` and contains **none** of this
work.

The authentication that blocked the previous session has since been completed by the owner, and the pull request was
opened from this one. `PULL_REQUEST.md` is the body that was posted; it is kept for the record rather than deleted, and
editing it now changes nothing, because the GitKraken tool can create a pull request but not edit one.

### Why it is not merged

Two acceptance conditions are open. Neither is a defect in the change.

1. **No independent review.** `approved: false` on #18. Everything in the "Review of the implementation" section above
   is SELF-review, and must not be read as anything else. The repository's own workflow, and the development
   environment's policy, both expect a human review before a merge; the previous pass's merge was refused here for
   exactly that reason and was done by the owner. No attempt was made to route around it.
2. **The one applicable ensemble gate fails** - `tools`, 140.8 against the band [143.9, 178.7]. It fails **identically
   on `main`**, which is evidenced seed by seed above, so it is not caused by this branch; but a failing gate is a
   failing gate, and calling it satisfied would be untrue. Fixing it means refreshing a stale baseline, which belongs
   to merged `main`, not to a candidate.

### The smallest next actions, in order

1. Review #18 and approve or request changes.
2. Merge it through the normal workflow.
3. On merged `main`, refresh the stale baseline and record one for version 2 (commands in
   `gate_v2_unversioned/FINDING.md`). Recording asserts nothing; it gives the next change something to be gated
   against.
4. Optionally, the `town` ensemble above - a separately scoped investigation into welfare under real hardship, not a
   correctness condition for this merge.

After a merge, verify on the merge commit itself rather than on this branch, and correct this file to the real state.

## Next

The bounded preparation feature is finished and closed out. The next actions are the four above, in order. Beyond them,
the fifteen proposed gameplay stages remain a backlog in `docs/EMERGENCE.md`; nothing here commits to them.
