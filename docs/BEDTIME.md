# Bedtime for a child under eight (rules 280)

Asked for: Ryan, 27 November 2026, "fix bug, continue bed time fix split free time build hall fix", taking up the design queued that morning
(brain `loops.md`, "QUEUED, not started: design a bedtime for under-8s"). Code: `src/sim/bedtime.ts`. Tests: `tests/bedtime.test.ts`.
Pin: `tests/v280_continuation.*`. Claim: `docs/RULES_RANGES.md`, "bedtime".

## What was wrong

A child under eight went to bed as a grown person does, by its own body clock (`options_survival.ts` optSleep: bedtime at 0.8 + chrono of the
day, after dark), and got up as soon as it was rested (`act_misc.ts` sleep: energy 94), in the middle of the night. Then it sat up awake at its
lean-to, walked to the well, warmed itself at the fire, talked or practised foraging in the dark. At rules 264 (`C:\dev\lw_labs\night_watch`) under-8s
were awake outdoors for 41.7% of dark time. At rules 279 (below) they were awake for 64% of dark samples, half of it outdoors.

## The rule

Two parts, each switched (`rich-no-bedtime`, `rich-no-bedtime-bed`, `rich-no-bedtime-home`). Dark is `world.light` under 0.5, the line
`fetch_home.ts` uses for "after dark"; under eight is `settle_child.ts`'s age.

- **bed.** After dark a little one is offered sleep as at night, tired or not, with 12 more than the ordinary night score; asleep, it does not get
  up because it is rested while the light is 0.55 or less (the "morning came" line). A parched, starving or frozen child still wakes, and danger
  wakes anybody.
- **home.** After dark a little one takes up only sleep, rest, food, drink, warmth, flight, defence or a move of the household (a child in a
  critical need may still ask for help), and nobody starts a talk or an argument with one. If the filter would leave a child nothing, it is not
  applied.

It reads only the child's own age and the light. No draw, no saved field, no feed line.

## Measured (27 November 2026)

`scripts/free_time_split.ts`, the same ten runs at rules 279 (main `f96b4b5f`) and 280 (`5f69c3f7`): four fresh Normal worlds (meadow, river,
aspen, cinder; arrivals on; 30 days) and the six rules-256 saves raised with `--rules-up` (day 48 and day 96 of aspen, gen-4, river; 6 days).
Fresh worlds part from each other at the first difference, so this is a description of two sets of runs, not an effect size; no removal arm was run.
Results: `C:\dev\lw_labs\free_time\r279\report.txt`, `r280\report.txt`.

| children under 8, share of dark samples | 279 | 280 |
|---|---|---|
| asleep indoors (hut or house) | 18.8% | 60.0% |
| asleep outdoors (lean-to, fire, open ground) | 17.1% | 30.0% |
| awake indoors | 32.0% | 1.7% |
| awake outdoors | 32.0% | 8.3% |

Children of 8 to 11, who have no bedtime, were unchanged (awake 63.1% and 63.6% of dark samples).

Under-8 waking time: resting awake at home 29.0% to 9.5% of it; play and games 10.3% to 15.4%; free time at it 30.5% to 41.3%.

The chain it strengthens: settling a child for the night (`settle_child.ts`, rules 263) took 0.156% of the waking time of people of 12 and
over at 279 and 0.279% at 280, because a little one now lies down at the hour its parents are still up and at ease. People of 12 and over:
free time at it 9.9% and 10.5% of waking time (not attributable to this change).

Not measured: whether children wake parched or hungry more often in the longer night; deaths of children; anything past 30 days; the
viewer's look at dusk (not watched in the app).
