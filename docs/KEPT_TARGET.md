# The target already being acted on stays on the table — rules 60

## Measured first (owner brief §4: measure before retuning)

`scripts/time_budget.ts` classifies every living person's every tick into one exclusive
category and attributes every interruption: what was given up, how long it had run,
what replaced it and why (the person's own result record), and for gather trips whether
the dropped option was still among the options offered and its target still believed
stocked. Fixed river, meadow and forest, Normal, no immigration, 30 days, rules 59
(`viewer_evidence/time_budget/{river,meadow,forest}30/`), pure and conserved:

| share of living ticks | river | meadow | forest |
|---|---|---|---|
| sleep | 19.2 % | 17.8 % | 21.0 % |
| bodily needs (eat, drink, fetch water, warm, rest) | 24.1 % | 27.2 % | 17.8 % |
| travel (any activity still on its way) | 38.0 % | 36.3 % | 41.6 % |
| work | 10.5 % | 10.6 % | 11.4 % |
| social contact | 7.0 % | 6.3 % | 6.8 % |
| leisure (rules-28 haunts, time alone) | 0.4 % | 0.9 % | 0.5 % |
| danger / waiting / idle | 0.1 / 0.2 / 0.5 % | 0.2 / 0.2 / 0.5 % | 0.2 / 0.2 / 0.5 % |
| in an activity later ended failed or interrupted | 33.4 % | 31.9 % | 35.8 % |
| critical-need exposure | 2.8 % | 2.2 % | 5.9 % |
| interruptions "something better came up" / danger / deadlier need | 4,421 / 218 / 175 | 4,236 / 318 / 104 | 4,569 / 239 / 363 |
| aborted journeys (failed or interrupted while travelling) | 2,300 | 2,072 | 2,583 |
| deaths | 3 | 0 | 5 |

The largest single class of interruption in river was a gather trip dropped mid-walk for
another gather: 614 times, 2.5 % of all living ticks, essentially all of it walking. In
390 of them the person still believed the source stocked, and in only 41 was the option
they were acting on still among the options offered when they dropped it. The cause is
structural, not a tuning question: the raw-material generator offers the top two
sources by score, the food generator the top three, the water ranking the top two and
the store lookups the top two; the score includes the walk; and `decision.ts
currentUtility` scores a running activity whose option is not offered as 0, so a target
walked toward falls off the table as distances, crowds and other wants shift, and then
any option at all clears the switch margin (`best > 0 × 1.3 + 3`). The same mechanism
let weak social, rest and food options interrupt gather trips whose premise was intact.

## Contract (rules 60)

Owner `src/sim/kept_target.ts` (`keepCurrent`, `hasKeptTarget`, lab switch); applied
at the five cuts: raw-material sources (`options_work.ts gatherMaterial`), remembered
material stores (same), food sources (`options_survival.ts foragePlans`), water spots
(`optutil.ts rankWaterSpots`, drink trips only: a water-fetching trip is keyed without a
spot and never fell off for this reason) and stock lookups (`production.ts
collectOptions`). A top-k cut keeps, in addition, the candidate whose option key equals
the running activity's own recorded option key (`Activity.data.optKey`), and nothing
else: no second candidate, no wording match, no memory of earlier choices. The kept
candidate is then scored by the same scorer as the others, so its walk, danger, crowd
and yield count exactly as they do for any option, and `currentUtility` finds it. A
candidate removed before the cut (a source believed bare, a spot the person was driven
off, a store no longer usable, no room in the pack) is still removed. The switch margin,
the minimum commitment, danger and the deadlier-need interrupt are unchanged. Nothing
is added to any person, activity or save. Rules 59 and older keep the plain cuts; lab
`rich-no-kept-target` restores them at rules 60 and changes nothing below.

The immutable rules-59 reference (`tests/v59_continuation.expected.json`, recorded at
`78f01c9`) pins the ordinary river and meadow continuations before this change.

## Evidence

`tests/kept_target.test.ts`, six contracts on a staged scene (a walk to a far tree, two
nearer trees learned on the way): the far tree stays offered at 60 and not at 59, from
the same world; the kept option carries its walk and scores below the nearer tree, and
is gone once the tree is believed bare; the ordinary review holds the trip at 60 where
59 turned round for the nearer tree past the minimum commitment; the lab switch
restores the plain cut at 60 and changes nothing at 59; a running drink trip keeps its
spot past the water limit by its own key only; `keepCurrent` is a plain top-k without a
running activity or below 60. Observer purity and conservation hold. The scene is
labelled staged.

Ordinary rules-60 runs of the same three worlds (`viewer_evidence/time_budget/*30-rules60/`):

| | river 59 → 60 | meadow 59 → 60 | forest 59 → 60 |
|---|---|---|---|
| "something better" interruptions | 4,421 → 4,032 | 4,236 → 4,008 | 4,569 → 3,384 |
| gather trips dropped mid-walk for another gather (still believed stocked) | 614 (390) → 495 (180) | 344 → 222 (85) | 755 → 448 (134) |
| gather dropped at the source for another gather | 397 → 90 | 320 → 67 | 504 → 96 |
| ticks in later-failed/interrupted activities | 33.4 → 30.9 % | 31.9 → 32.0 % | 35.8 → 31.4 % |
| aborted journeys | 2,300 → 2,294 | 2,072 → 1,890 | 2,583 → 2,064 |
| leisure | 0.4 → 1.1 % | 0.9 → 1.1 % | 0.5 → 0.5 % |
| critical-need exposure | 2.8 → 3.3 % | 2.2 → 1.6 % | 5.9 → 6.9 % |
| deaths | 3 → 0 | 0 → 0 | 5 → 9 |

These are single chaotic draws of each world and establish activation and the direction
of the mechanism's own counts, not benefit: forest lost four more people and river none,
and neither says anything about the rule. The remaining mid-walk gather switches are
mostly a source believed bare on approach (315 of 495 in river) or a pack with no room,
which the rule leaves as they are. Aggregate claims need the paired control/nudge
ensemble (`scripts/lab.mjs` with `rich-no-kept-target` beside `nudge:1`, on the
owner's machine); that run is pending and recorded as such in the register.

The golden fingerprints (`tests/golden.test.ts`) are unchanged: their cases run on the
legacy default settings, outside the current rules, so neither rules 59 nor 60 touches them.

## What this does and does not establish

It establishes a measured, causal defect in the review of running activities and its
repair, verified by contract and by the mechanism's own counts in three ordinary worlds.
It does not establish that people now have usable spare time (leisure stays near 1 %),
that travel at 36–42 % of living time is right, or any survival effect. The next §4
transitions are the remaining lost-time classes in the reports (rest interrupted by a
rising need is the next largest and may be correct behaviour), and the time budget is
the instrument to re-measure with before any need, foresight or leisure retuning.
