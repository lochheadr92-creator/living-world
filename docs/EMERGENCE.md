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
