# Toward a richer world: plan, gates and first audit

The goal is an autonomous village in the spirit of RimWorld and Dwarf Fortress: individuals who differ, consequences that last, and small
events that cascade into stories, readable in the inspector and testable in the lab. It is not strict open-ended invention (see the
novel-need result in `SCALING.md`: the action space is closed and authored, and no unauthored behaviour appeared in 24 seeds).

Decisions: seeded randomness stays (replay, inspection, the lab); the golden fingerprints no longer constrain a change that is meant to alter
behaviour (re-record `tests/golden.expected.json` in the commit that changes rules, or retire it); the ensemble gates below are the
acceptance test for such a change; the current rules stay selectable so a new version can be compared against them.

## Stages

| # | Stage | Measure | Stop if |
|---|---|---|---|
| 0 | Ensemble gates replace byte-identity | gates pass on today's world, fail on a damaged one | – |
| 1 | Cascade tracer and coupling audit | how much one thing leads to another | the systems prove almost uncoupled (then stage 2 is bigger) |
| 2 | Coupling and individuality: lasting consequences, stakes, differences between people | story density up, no collapse | chains stay shallow |
| 3 | Learning: each person's own estimates of what pays | specialisation, differing between seeds | no more than random choice |
| 4 | Social transmission of knowledge | camps end with different knowledge | all camps identical |
| 5 | Composable actions (properties of items and sources) | the novel-need test shows new behaviour | the solution space is enumerable, or identical in every seed |

## Stage 0: the gates

`node scripts/lab.mjs --out gate_run --seeds 8 --fork 0 --days 12 --branches none`, then `npx vite-node scripts/gates.ts -- gate_run`
(exit code 1 on failure; `--record` writes `docs/gates.json`). A metric passes when the run's mean is within 3 standard errors of the
recorded mean (standard error from both samples, with a floor of 0.5 on the spread), and every seed keeps at least 50 people.

VERIFIED: recorded from 8 seeds (Large, day 0 to 12). The same code on 4 of those seeds passes (not independent: same seeds, and
the runs are deterministic). A deliberately damaged world, random choice from day 0 on 4 seeds, fails 5 of 9 gates (workplaces 6.8
against 17.8, solid homes 16.8 against 31.1, buildings 65.8 against 94.8, plots, homeless) and still passes people and deaths, so a gate
is a smoke alarm for building and settlement, not for survival. LIKELY: the bands will need re-recording whenever a stage intentionally
moves these numbers.

## Stage 1: what the tracer and the audit found

`scripts/cascade.ts` (tracer: `scripts/cascade/trace.ts`) and `scripts/coupling.ts` (static audit). Four seeds, Large, 12 days, about 100 people.

**The tracer's own limit.** A "link" means the same person, soon after; it is not causation. Connected sets of links ("cascades") are
inflated by busy people (in one seed the three largest held 46, 56 and 83 happenings among 16 to 23 people, and read as timelines of village life, not chains of cause).
Do not read cascade size or chain length as story depth. Real causal tracing needs the simulation to record a cause when it makes
a consequence; that belongs in stage 2.

What it does show reliably (VERIFIED on these four runs):
* **Hardship is nearly absent.** About 630 happenings per world in 12 days, and across the four worlds only 3 people went critically
  hungry or thirsty and 2 were badly hurt. There are no stakes for a cascade to run on.
* **Social cascades are closed loops.** Commonest links: social→social, work→work, social→build, sore→social 129, conflict→sore 45. The
  sampled stories show the loop promise → broken promise or contested resource → sore → "on good terms again (it faded with time)" within
  hours to a day, with nothing material downstream.
* **A grievance changes what a person does in one way.** After a quarrel or soreness, people are 3.7 to 4.6 times as likely to start
  gathering in the next ~2 hours (n = 10 to 20 per seed). No other effect of a grievance on choices is visible. LIKELY: they go off alone
  (not checked). After being hurt: drink ×8.7 and rest ×17.9 (rare, n = 65 to 100 over two seeds).

**The coupling audit (static text search; LIKELY, not measured).** Read by the decision layer: hunger, thirst, energy, beliefs, skills,
traits (five of them: generosity, sociability, caution, diligence, curiosity), household, inventory, weather, time of day, grievance,
trust, avoidUntil. Barely read (a few lines): health (3), the social need (3), familiarity, failures, last result. Not read by any choice:
the safety need, debts, and the person's memory log. There is no mood: no state that sums a person's recent experiences and changes
what they will do. Health slows work and bars some jobs, but there are no lasting injuries or roles that change.

## What this means for stage 2

The systems that exist are thin, not missing: events, grievances, relations and a log are all recorded; very few change what anyone
does for long. Candidate first moves, each to be tested in the lab against the gates: a mood that stacks recent experience and changes
choices; grievances that change who works or shares with whom for days; injuries that last and change what a person can do; stakes
(scarcity, danger) strong enough that hardship happens in some seeds and not others; cause links recorded by the simulation.

## Stage 2, first piece: mood and lean seasons (built, switched off by default)

`settings.dynamics = 'rich'` (absent means as before; the golden fingerprints and the ordinary world are unchanged with it off, VERIFIED by
the existing suite). `src/sim/mood.ts`, `src/sim/hardship.ts`, `tests/rich.test.ts`; lab intervention `rich`, `lab.mjs --dynamics rich`.

* **Mood.** Each person has thoughts: things weighing on or lifting them, each fading to nothing over its duration (bitten by a wolf, argued,
  went hungry or thirsty, is cold, is frightened, is hurt, was given something, shared a meal, a birth, a death in the family, a lean season).
  Mood is a base from how well their needs are met plus the fresh thoughts, -100 to 100. It changes two things: what they pick (a low mood
  pulls people from each other and from effortful work toward rest and idling; survival options are never weighted) and whether a contested
  resource turns into a row (0.3 to 1.7 times as likely).
* **Lean seasons.** One chance in five per day, after day 2: for three to six days wild food returns at a tenth of its pace and crops grow at
  a quarter. Announced, weighs on everyone's mood, ends. The constants were set after looking at four seeds, not tuned to a target.

**Result (VERIFIED on the runs below; the conclusion is the plain one: the stakes are still too weak for the coupling to show).**
* Rich vs authored, 8 seeds, Large, day 0 to 12, paired by seed (first version of the lean season: one chance in ten, 2 to 5 days, regrowth
  at 30%, crops at half): no outcome moved beyond what a one-draw nudge moves it (workplaces -2.5, people -1.0, deaths -0.3; all intervals
  include 0). Mean mood sits near 0 and about 0.4 people per world were below -25.
* Four seeds with the harsher season above (14 days): hunger and thirst thoughts rise (one seed had 26 people go critically hungry or
  thirsty, the others 5 to 7; before, 1 to 3 in all four), mean mood -2.5 to -4, under 1.5% of person-checks below -25, nobody starved. The
  village's stores and farms absorb a lean season, so most people never feel it.
* The tracer shows no new effect of mood on what people go on to do (the only lifts are the old ones: quarrel or soreness then gathering).
  The only thoughts that fire often are being cold (up to 1,253 renewals in one world) and being frightened (90 to 450).

What it does and does not establish: the machinery works, is deterministic, and saves and loads exactly; it does not yet make anything
happen, because almost nobody gets far enough from comfortable for mood to change a choice. Not done: the mood is not shown in the inspector
(`thoughtsOf` returns it), work speed does not depend on mood, and there is no break (a person at the bottom just idles more).

Next candidates, to be tested the same way: make want reach more people (a store that spoils, wolves that hunt near the houses, a harder
first winter); lasting injuries; give grievances a longer reach (who works with whom); show mood and its thoughts in the inspector.

### Stakes that reach people: winter, spoilage, bolder wolves (rich dynamics)

Added to `settings.dynamics = 'rich'` (`hardship.ts`; all neutral in other worlds, VERIFIED by the golden, determinism and save tests): a winter in the
last 4 days of every 12-day year (up to 12 degrees colder, wild food and crops slower; the first winter is hard because the village is not
ready, not because it is harsher), stored food spoils 3 times and left-out food 2 times as fast, and wolves notice people from farther,
go for them more often, prowl to within 11 tiles of the houses (17 before) and are kept off by a fire from 4 tiles (6 before). The inspector
shows mood and "On their mind" in rich worlds; the world menu has a "Rich dynamics" switch.

Result, 8 seeds, Large, day 0 to 15, paired by seed (VERIFIED), against the mean of the control and the nudge (not the control alone):
* **More farmland: plots 90.1 → 102.6 (+12.6, higher in 8 of 8; the noise floor is about ±8).** The only outcome that moved beyond chance.
  LIKELY, not checked: the existing rule that wants plots when food runs low is answering the spoilage, lean seasons and winter.
* Workplaces -2.2, buildings -2.5, people +0.4, deaths +0.4 (0.3 to 0.8 a world), hunger -1.7, mean mood -1.3: all within chance. Nobody is
  pushed to starvation in 15 days.
* Four seeds with the tracer (15 days): people going critically hungry or thirsty 34 to 113 a world (3 before the stakes), mean mood -5 to
  -8, 4 to 8% of checks below -25, and new links appear (hungry → conflict, hungry → soreness, hungry → hurt; a person looking in on a
  hungry neighbour and bringing grain). Still no mood effect on choices visible in the activity lifts, and no deaths to speak of.

A correction to the lab: a branch was compared with one control, and the control happens to be a lucky draw in some seeds (workplaces 20.4
against 17.8 over eight seeds in the baseline). It made random-looking "effects" (workplaces -4, buildings -4.5, the same for a one-draw
nudge). The report now compares each branch with the mean of the control and the nudge branches (excluding itself); on this run that removes the
workplaces and buildings effects and leaves only plots. Results quoted earlier in this file used the control alone; the large ones
(random choice, no wild food) are far outside the noise either way.

## The counterfactual lab (`scripts/lab*.ts`, `scripts/lab/`)

Fork a saved world, change one thing, run it forward, compare with the control and with a "nudge" (one extra random draw) that measures
what chance alone does. 24 seeds, Large, fork day 4, 8 days (run on a 24-core Windows machine):

| branch | main result (24 seeds) |
|---|---|
| nudge (1 draw) | parts from the control in 24/24 within 0.05 days; per-seed spread: workplaces ±3.1, buildings ±4.0, hunger ±5.4 |
| wolf search memory off | identical to the control in 24/24 (the optimisation is exact; the fork is exact) |
| random choice | workplaces 16.8 → 8.1, buildings −14.0, first hall +3.0 days, homeless 0.1 → 1.0; lower in 24/24 |
| no wood near settlements | buildings −4.1 (lower in 20/24), first hall +1.4 days; mostly absorbed |
| no wild food near settlements | people 102 → 57, deaths +45, workplaces −9.2, in 24/24 |
| no clay or ore | workplaces −2.1, buildings −1.9: within the noise floor |

Known weaknesses: (1) with one control per seed, small discrete metrics (people, deaths) are flagged "systematic" by the bootstrap too often
(3 of 22 nudge cells), and no-wood shares the identical people/deaths flags with nudge:1, which is the control's own luck; only
"larger than chance" verdicts are reliable. Fix: compare with the mean of the control and the nudge branches. (2) UNRESOLVED: the two-draw
nudge ends identical to the control in 5 of 24 seeds. In a direct test the shared random state of a two-draw-shifted world is equal to
the control's again within 60 ticks, so something returns the generator to the same state; it was not found (no `setState` or
reassignment in `src/sim`). It affects how the noise floor is read, not the other results.
