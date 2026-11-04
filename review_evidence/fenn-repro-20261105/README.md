# Rules 159 — a hungry person with no pack room is fed by hand, 5 November 2026

Brain priority findings (`knowledge/living-world/2026-11-05-living-world-priority-findings`, frozen rules 153, 30 days, three seeds, Normal and Large). Item 2: "treat Fenn's final care attempt as a priority reproduction".

## Reproduction (Large life-stages-6, rules 153 pinned on current source)

`repro.ts`: arrivals on, harsh off, with an exact twin and conservation. It matches the investigation:
- Ines's handover to Fenn fails "they had no room to carry it" at tick 55,678, after "Fenn was not where I expected" at 55,486.
- Fenn dies of hunger at tick 56,961 (the script logs it one tick later).

Item weights, which decide what fits: wood 2, stone 3, berries/fruit/grain/bread 1, fish 1.5, water 1.5, seeds 0.25.

**What the window shows (`fenn-r153.json`, samples every 300 ticks from tick 54,000):**
- **Fenn's pack:** identical for the whole time (2 wood and 1 seed, 4.25 of 5) and hunger 0 from tick 54,300 to death. Nothing edible fits, since room is 0.75.
- **His own foraging:** it was not blocked by his pack. A hungry person gathering eats on the spot, even with a full pack. He starved because the sources were empty ("nothing left", "something better came up").
- **Ines's food:** she carried 1–2 food items for him for about 2,500 ticks (fish 2 at tick 54,000; fish and fruit at 55,200). Her options show "Eat carried food: saving the food for dependents" throughout.
- **The deposit fallback:** it was out of reach. The household home was 11–35 tiles from Fenn and the rules-63 fallback only looks within 8; the store held only seeds.
- **Her own hunger:** 27–54.

## Rules 159 (`src/sim/hand_feeding.ts`)

When a care or promise hand-over moved nothing because the recipient's pack has no room, and the recipient is hungry (a child below 66, anyone else below 50) and holds no food, the carer feeds them by hand.
- The food leaves the carer's pack as a meal (`consume(..., 'eaten')`) and the recipient takes its nutrition (`takeNutrition`), exactly as `eatTick` does for eating.
- At most 3 units, and it stops before they are full (88).
- The recipient's pack is untouched and nothing is created or lost. The relationship effect (`onGift`) reads their pre-meal hunger.
- A recipient who is not hungry keeps the rules-63 full-pack fallback. One already holding food is rules 157's case.
- Both people get a log line: "Fed Fenn 1 fruit by hand: their pack had no room for it".
- Lab removal: `rich-no-hand-feeding`.

## Staged forks (`fork.ts`; not ordinary evidence)

The saved rules-153 world at tick 54,000 (sha256 `02fc2b71...`, 23 MB, kept outside git; regenerate with `snapshot.ts`).
- **Switching to 154–159 at the snapshot** (`fork-attempt2-switch-at-snapshot/`): the whole 100-person world diverged before the handover, so Ines never attempted it. Not a clean test; retained.
- **Switching just before the handover** (tick 55,650; `fork-r15x-sw55650`):

| Rules | Ines's handover at 55,678 | Fenn dies |
|---|---|---|
| 153 | failed, no room | tick 56,962 |
| 159 | **success, fed by hand** (hunger 0 to 16) | tick 57,458 |

One fruit bought about 500 ticks. **It does not save him.** The famine, the empty store and Fenn's wood-filled pack remain.

**What happened after the feeding** (`fork-r159-sw55650-ines.json`): Ines went fishing for her own hunger (40 against his 0) and drifted 13–25 tiles away holding a fish. She ate it herself at hunger 20 (tick 56,356) while Fenn was at hunger 0, 17 tiles away. Her memory of him says only "hungry", not "starving".

## Ordinary occurrence (Large, 30 days, rules 158 then 159; `noroom-large.ts`)

| World | No-room failures, 158 → 159 | Hungry recipient holding no food, 158 → 159 | Promise-mode failures, 158 → 159 | Alive at day 30, 158 → 159 |
|---|---|---|---|---|
| life-stages-6 | 19 → 15 | 5 → 0 | 14 → 12 | 140 → 140 |
| river | 15 → 8 | 7 → 0 | 14 → 7 | 70 → 91 |
| forest | 11 → 4 | 5 → 0 | 9 → 2 | 12 → 19 |

- These are the cases that fit hand-feeding. Most are adults who asked for food and were promised it while carrying wood or stone, e.g. Leo (river), who tried five times in about 700 ticks at hunger 22–37 with 3 wood and 2 stone at 12 of 12.
- No recipient at 158 died within 3,000 ticks of a failure. The populations differ because the worlds diverge; no benefit claim.
- All six runs conserve goods.
- Normal worlds are much rarer: in 8 seeds over 10 days, one (aspen) had a hand-feeding (twice, to an adult, Fenn).

## Verification

- `tests/hand_feeding.test.ts`, 6 tests: feeds a hungry full-pack recipient (eaten, pack untouched, conserved, logged); bounded to 3 units and stops before full; the not-hungry fallback is kept; rules 158 and the lab removal fail as before; a recipient holding food is not fed; pure planning and save continuity.
- **Immutable v159 reference:** river, recorded while 159 was current.
- **Full suite** (`../agent-20261105-159/suite/`): exit 1, 2,896 of 2,904 pass. The 5 failures are the usual spawn and long-test timeouts. All six affected files pass alone, 14 of 14 (`../agent-20261105-159/isolated/rerun-quiet.log`). `rerun.log` there is the first rerun, taken while six heavy runs shared the machine; two spawn tests timed out in it and are retained.
- **25-day screens** (Normal, arrivals on): forest, river and meadow reach the horizon with 500 pure checks, exact continuation and conservation. Deaths are identical to the 158 screens (16, 9, 1), as hand-feeding did not occur in them.
- **Rendered check, ordinary world** (`../hand-feeding-20261105/render.mjs`): Normal aspen, tick 11,597. Fenn (adult, asleep by the fire) was fed a berry by Ivo; the person panel shows "Sleeping by the fire → interrupted: woken to be fed" and, under Recent experiences, "Ivo fed me 1 berries by hand: my pack had no room for it". The feed shows "Ivo gave 1 berries to Fenn." Two earlier attempts, with a script syntax error and with the memories section unopened, are retained.

## Open, from this reproduction

1. **A carer's memory of a dependant loses severity.** `remembered_need.ts` keeps only hungry/thirsty/cold flags, so a child last seen at hunger 0 is remembered as 41 and weighed against the carer's own mild hunger.
2. **The jammed pack itself.** Fenn carried two wood he did not need for more than 6,000 ticks. At rules 156 children no longer chop wood, but adults carry it (Leo, Felix, Xavi). Putting surplus down at a known home or store when hungry needs a custody design for goods set down; deferred.
3. The Large River exact-twin discrepancy (`../bykind-order-20261105/`): a candidate cause only (loaded grid order differs from live), not reproduced. A 30-day Large river twin run at rules 159 matched exactly every day with no fix; see `../load-order-20261105/` once recorded.
