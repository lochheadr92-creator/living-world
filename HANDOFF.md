# Living World Repository Handoff

Updated: 2026-10-18

A continuation guide for this checkout. The repository and the current Git state are authoritative; this is a map, not a
replacement for them.

## Where things stand

**Household food preparation is built, measured and on a pushed branch.** The previous pass (Stage 0 rules versioning and
the CLI rules-version fix) is merged into `main` and is not reopened below.

- Checkout: `C:\dev\Claude Experiment\living-world`, branch `claude/household-preparation-v2`, cut from `main` at `5b7a941`.
- Integration branch: `main` at `5b7a941`, which carries the merge `e81aad4` (pull request #17) and everything before it.
- The working tree is clean. One ignored artifact directory, `gates_rich_out/`, remains ignored (`.gitignore`).
- **Pushed** to `origin/claude/household-preparation-v2`. **No pull request exists yet, and nothing is merged.** See
  "Integration: what is blocked and the exact next action" below.

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

Nudge floor: 0.04-0.16 for `homeFoodPerPerson`, 0.00024-0.00158 for `hungerExposure`.

**Established.** The mechanism runs on its own, by both cues, and roughly doubles the food within a household's reach when
winter arrives (1.62 units a head against 0.83).

**Not established.** Any welfare benefit. Hunger exposure, `belowCritical`, mean hunger, deaths and mood are all
indistinguishable from chance in both windows. In a 28-person Normal world food is not scarce enough for one day's reserve
to show.

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
`homeFoodPerPerson` for `rich-no-stock` against the nudge arm. If hunger exposure still straddles zero there, the honest
conclusion is that this reserve is too small to matter and the size is the next thing to reconsider - not that the mechanism
is broken.

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

## Verification

All run on this branch at `9cfad02`, the last commit that changes behaviour.

| | result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 79 files, **791 tests**, all passing |
| `npm run build` | clean |
| `git diff --check` | clean |
| `npx vite-node scripts/golden.ts` | all golden fingerprints match (not re-recorded) |
| `npx vite-node scripts/v1_reference.ts` | version-1 continuation unchanged |
| `node scripts/browser/current_world_check.mjs http://127.0.0.1:5184/` | 15/15 |
| `node scripts/browser/preparation_check.mjs http://127.0.0.1:5184/` | 19/19 |

Both ensembles were re-run at `9cfad02` into emptied directories, because `9cfad02` changes behaviour. The earlier pair,
made at `83c770e`, was not kept: one directory name must not hold two sets of numbers. The difference between them was
small (the food effect moved from -0.78 to -0.80) and changed no conclusion.

The acceptance criteria are `tests/household_preparation.test.ts`, one `describe` group per criterion (40 tests):
1 evidence that may start a preparation, 2 situations that may not, 3 the action is an ordinary one and really moves food,
4 completion is about the food and not the label, 5 urgency/absence/staleness end it safely, 6 determinism and save/load,
7 version-1 and unversioned worlds, 8 the lab switch, 9 the app and the command line agree. A tenth group holds the reserve
arithmetic to the documented numbers.

## Limits worth carrying forward

These stand. None is fixed by this pass.

- **Household preparation shows no measured welfare benefit.** It moves food and costs time; that is all the measurement
  supports. Do not describe it as preventing starvation.
- The measurement is on the **Normal** profile only, which is food-rich. The `town` run above is the missing evidence.
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
| (last) | The measurement re-run at `9cfad02`, and the documented numbers brought to it |

`2a4a704` is the only commit without the required "Existing modules touched, and why" line: it touched no existing modules
(four new files), and it was not amended because rewriting history is a hard rail for this task.

## Integration: what is blocked and the exact next action

The branch is pushed and verified. **The pull request could not be opened from this session**, so nothing is merged and
`main` is still at `5b7a941`.

The exact blocker, reported verbatim: the GitKraken MCP tool refused with

> To sign in, run `C:/Users/RJLoc/AppData/Local/GitKrakenCLI/gk.exe auth login` in your terminal, finish signing in,
> then retry the previous request.

`gh` is not installed and `GH_TOKEN`/`GITHUB_TOKEN` are unset, so there is no other route from here. No attempt was made
to work around it.

Either of these unblocks it:

1. Sign the CLI in, after which the PR can be opened from a session:

```
C:/Users/RJLoc/AppData/Local/GitKrakenCLI/gk.exe auth login
```

2. Or open it by hand. GitHub offers the link directly:
   <https://github.com/lochheadr92-creator/living-world/pull/new/claude/household-preparation-v2>.
   The prepared title and body are in `PULL_REQUEST.md` at the repository root, ready to paste.

**Do not treat this task as accepted until the PR is reviewed and merged**, and until the integration result is verified
on the merge commit itself rather than on this branch.

## Next

The bounded preparation feature is finished. The next actions, in order: open and merge the PR (above), then the `town`
run, which answers the one question the measurement left open. Beyond that, the fifteen proposed gameplay stages remain a
backlog in `docs/EMERGENCE.md`; nothing here commits to them.
