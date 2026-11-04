# Rules 158 — eat food already in the pack before gathering more, 5 November 2026

Found while checking rules 157 for harm (`../carry-recovery-20261105/README.md`): Eli, a child in the ordinary river world, caught a fish at hunger 8 and kept fishing to hunger 0 before eating it.

## Diagnosis (ordinary, rules 157)

`probe.ts`: four Normal worlds with arrivals on (forest, river, meadow, `life-stages-6`), 10 days, hunger sampled every 60 ticks for anyone below 25. Exact twin and conservation hold in all runs.

- People below hunger 25 holding food were sampled **gathering to ease hunger 209 times against 22 times eating from the pack**.
- Eating and gathering serve the same need, so `reviewActivity`'s deadlier-need interruption never applies, and a gather's commitment and progress bonus outbid a better way of meeting the same need.
- Part of the remainder is intended: the existing "Eat what I am carrying" option keeps food back for a carer's dependants.
- `hunger/low-children.ts` (carry-recovery evidence): the same pattern for children (Eli, tick 9,240 to 9,540).

## Rules 158 (`src/sim/eat_in_hand.ts`)

A hunger-serving activity (gathering, fishing, asking for food) yields to the existing "Eat what I am carrying" option when that option scores higher than the activity's own option, without the commitment bonus. It records the reason "food in my pack would ease my hunger sooner".
- Unchanged: the household keep for dependants (it is the eat option's own), a deadlier critical need (thirst), danger, and meals already under way.
- When the current way is no longer offered at all, ordinary review decides.
- Lab removal: `rich-no-eat-in-hand`.

## Attempts (retained)

1. `r158-attempt1-critical-only/`: only below the critical hunger line (14). It barely fired (3 of 102 forest samples).
2. **Final**: compare the utilities, as above.

## Ordinary effect (single trajectories, rules 157 → 158)

People below hunger 25 sampled gathering for hunger while holding food: forest 79 → 49, river 51 → 38, meadow 71 → 51, `life-stages-6` 8 → 14. Most of the remainder in forest is intended dependant keep (`why-not-forest-158.json`).

**8-seed lab** (`lab-r158/report.txt`; Normal, fork day 4, 10 days, control, two nudges and `rich-no-eat-in-hand`): removing the rule moves nothing beyond the noise floor (deaths +2.4 [-1.8, +7.0]; mean hunger +4.1 [-1.4, +11.1]; people -2.5 [-6.6, +1.5]). An explained repair, no benefit claim.

## Verification

- `tests/eat_in_hand.test.ts`: 3 contract tests.
  - A gather yields to a meal with the reason and conserves goods.
  - It is left alone when it still scores as well, when its option is gone, when thirst is deadlier, under rules 157 and under the lab removal.
  - Save continuity.
- **Immutable v158 reference:** river, recorded while 158 was current.
- **Full suite** (`../agent-20261105-158/suite/`): exit 1, 2,886 of 2,897 pass, 8 failures. These are the same spawn and long-test timeouts as at 156 and 157 plus a 10 s hook timeout in the retention test. All six affected files pass alone, 14 of 14 (`../agent-20261105-158/isolated/rerun.log`). The lab spawn tests time out in every full run on this machine and want their own look.
- **25-day screens** (Normal, arrivals on): forest, river and meadow each reach the horizon with 500 pure observer checks, exact continuation and conservation.

| World | Deaths, rules 157 | Deaths, rules 158 |
|---|---|---|
| forest | 26 (child 8) | 16 (child 3): exposure 10, hunger 3, wolf 3 |
| river | 2 | 9 (child 1): hunger 5, fever 2, injuries 2 |
| meadow | 5 | 1 |

None of the river dead held food at death (seven of nine carried wood or stone and tools, empty of food), so the rule could not apply to them. Single diverged trajectories; no benefit or harm claim.
- **Rendered check, ordinary world** (`render.mjs`, `render/`): in the rules-158 Normal river world, Ben (20) at tick 2,099 shows, under "What happened after their last attempt?", "Picking berries → interrupted: food in my pack would ease my hunger sooner", and under "Why did they choose it?" "hungry +62 · food in pack +4". Pure, no exceptions. The first attempt (`render-attempt1-panel-text-not-shown/`) looked for the reason without expanding "More" and is kept.

## Note for the next stream

Seven of nine river dead carried wood or stone while starving. That fits Fenn's case in the Brain priority findings (a child starving with two wood in a five-weight pack): the pack, not only the food, is the constraint. See `../fenn-repro-20261105/`.
