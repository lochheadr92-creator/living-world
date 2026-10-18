# Household food preparation: does it happen, and does it leave more food within reach?

Written BEFORE the run. Nothing below was chosen after seeing a number.

## Question

Two questions, kept apart.

1. **Does the mechanism run at all, on its own?** Do people take preparations on without being staged into it, by both
   cues, and does food really end up in home stores because of them?
2. **Does it improve anything?** With the same rules and the same seeds, does having preparation leave households with
   more food they can reach when winter sets in, and less time spent below critical hunger - and what does it cost in
   time taken from other work?

The first can be answered by counting. The second needs the comparison below, and may come out null or adverse.

## Design

Same rules on every arm (rich, rules version 2), same seeds, forked at day 0:

| arm | what it is |
|---|---|
| `control` | the current rules: preparation on |
| `rich-no-stock` | preparation off, nothing else changed |
| `nudge:1` | one extra random draw at the fork and nothing else |
| `nudge:2` | two extra random draws and nothing else |

The two nudges are the noise floor. The world is chaotic, so any change moves every later draw; a difference between
`control` and `rich-no-stock` only counts if it is bigger and more systematic than what one wasted random number does.

Version 1 is deliberately NOT an arm. An old-version-against-new-version comparison would attribute every difference
between the two generations to preparation, which is exactly the mistake the design is meant to avoid.

## Window

8 days from the fork. A year is 12 days and winter is its last 4 (hardship.ts), so day 8 IS the tick winter sets in: the
window covers the seasonal cue (the two days before winter), every day on which the hardship cue can fire, and ends at
the moment "food entering winter" is a meaningful reading.

## Metrics

**Mechanism** (zero by construction on `rich-no-stock`, so they prove it runs, never that it helps): `prepAdopted`,
`prepSeason`, `prepHardship`, `prepDone`, `prepDropped`, `prepUnits`.

**Outcome**: `homeFoodPerPerson` and `storeFoodPerPerson` at day 8 - food within reach entering winter;
`hungerExposure` - share of all person-time below critical hunger across the window; `meanHunger`, `belowCritical`,
`deaths`.

**Cost**: `prepDays` - person-days spent on an activity chosen as a step of a preparation; `projectsAdopted`, `tools`,
`buildings`, `solidHomes` - what the time might otherwise have gone to.

## Interpretation, fixed in advance

An outcome effect is reported as real only if the paired `control` - `rich-no-stock` difference across seeds has a
confidence interval excluding zero AND is larger than the spread the two nudge arms show. Anything smaller is noise.

A reduction in hunger exposure is NOT a claim that preparation prevents starvation: `deaths` over 8 days of a 28-person
world is a small number with a large variance, and the reserve is about one day's eating against a four-day winter.

A cost without a benefit is a real result and is reported as one. So is a null.

## Provenance

This directory was DELETED and regenerated at the HEAD below. An earlier pair of runs was made at `83c770e`, before a
review of the diff found that a reserve could settle on a trip home it could not make (`9cfad02`). That changed
behaviour, so those results do not describe this code and were not kept: the repository must not hold two sets of
numbers for one directory name.


- HEAD: 9cfad02  (branch `claude/household-preparation-v2`)
- rules version: 2 (`CURRENT_RULES_VERSION`), dynamics `rich`
- profile: `normal` (28 founders, 80x80, arrivals off) - NOT changed for this feature
- seeds: the first 24 of the lab's standard list
- command:

```
node scripts/lab.mjs --out prep_out8 --seeds 24 --fork 0 --days 8 --profile normal --branches rich-no-stock,nudge:1,nudge:2
```
