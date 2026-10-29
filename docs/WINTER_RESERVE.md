# The winter reserve: keep what keeps (rules version 46)

Delivered 2026-10-29 on `main` after rules 45 (`ce50c0a`). Workstream 3 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). Rules-2 household food preparation
([RICH_WORLD.md](RICH_WORLD.md)) is the base; this slice changes the season cue only, and what the reserve is made of.

## What the ordinary worlds showed first

`scripts/winter_reserve_observe.ts`, Normal profile, immigration off, 30 days (two winters: days 8-12 and 20-24),
rules 45, `winter_reserve_evidence/ordinary-30-{meadow,river,forest}` (report, per-day flows, plan records,
household rows at each winter boundary, hungry-in-winter samples, provenance, final save). Observer-purity checks
passed at every 240-tick sample; conservation held.

| seed | put into home stores | eaten from stores | spoiled in stores | of which berries / grain | season plans adopted / done | hardship plans adopted / done | store food entering winter 2 (per person) | at winter's end |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| meadow | 1113 | 329 | 531 | 324 / 85 | 9 / 5 | 120 / 39 | 46 (1.5) | 0 |
| river | 1076 | 292 | 512 | 314 / 146 | 7 / 4 | 130 / 29 | 39 (1.3) | 0 |
| forest | 465 | 158 | 205 | 128 / 117 | 3 / 0 | 103 / 23 | 6 (0.2) | 0 |

So the one-day cushion (`min(4 × members, 12, room)`) was reached in about half the season plans, but **about half of
everything put by spoiled before anyone ate it**, berries first (`PERISHABLE` berries 1.0, fish 1.6, grain 0.22;
`spoilGoods` runs every 120 ticks at 0.011 × kind × 3 in winter × 2 below condition 40). The two granaries that stood
(meadow, forest) were empty at day 30: `eat_store` never offered a granary, so a household had no way to eat what it
put there and no reason to put anything there. Hardship plans churned (45 % never put any food by inside their two
days); that is the rules-2 reaction cue and is left as it is, recorded here. Nearly every household had a home at
both winters; condition below 40 (doubled spoilage) was 1 to 3 homes per seed by the second winter.

## Contract

Gated on `runsRulesVersion(world, 46)`, rich dynamics and `preparesFood`; the rules-45 full serialized continuation
(`tests/v45_continuation.expected.json`) was recorded from `ce50c0a` before any of it. Lab switch
`rich-no-winter-reserve` removes all five parts together (it is one strategy; the parts are not separately ablated).

1. **Season target.** `min(DAY_FOOD × SEASON_RESERVE_DAYS(2) × members, SEASON_CAP(20), what the store has room for)`,
   read from the person's own belief about their home store. Winter is the deterministic last four days of a
   twelve-day year, which an adult may be supposed to know; two days is the expectation that the land still gives
   something in winter, not a forecast of the random lean season. The hardship cue and its one-day target are
   untouched, and a store at the cushion but under the season target now takes a season plan.
2. **Window.** The season cue opens three days before winter (`PREPARE_DAYS_WINTER_RESERVE`) instead of two, so the
   larger target has a day more of trips.
3. **What keeps.** A person carrying out a season-cue plan gathers wild grain when they know a usable wild grain source
   (`foragePlans` `only: 'grain'`), and any food only when they know none ("no grain to be had"). Hardship plans and
   every other gathering are as before; the deposit step already stored grain first.
4. **The granary feeds those who filled it.** `eat_store` offers a known granary when the household may take
   something from it: its own share, or the emergency ration `facilities.ts withdrawAllowance` already grants the
   starving (up to 3). The meal is booked against the share unit by unit (`noteWithdraw`), the ration is asked for once
   per meal and spent bite by bite, and a meal eaten at the bins with a full pack stops at the ration. Reading the
   share reads the household's own record of what it deposited, not other people's bins.

5. **Grain for the winter goes to the bins.** A season plan whose person knows a usable granary (communal, their own
   household's, or one they helped raise: `provision.ts knownGranary`) and carries at least `GRANARY_TRIP` (3) grain has
   "take the grain to the granary" as its step, nudging the existing granary deposit (`production.ts optGranaryStore`,
   which for such a plan offers a load of one or more grain, keeping two back). The deposit is credited to the plan
   (`creditStocked`), and the household's granary share counts toward the target and the plan's outcome
   (`reserveHeld`), so a known granary also lifts the season target's room bound (still `SEASON_CAP`). Hardship plans
   and every world below 46 put food in the home store only, as before.

No new state, no save-format change; `Intention.cue`, `reserve` and granary `shares` existed already.

## Tests

`tests/winter_reserve.test.ts` (6 staged contracts): target and window at 45 vs 46 with the hardship cue unchanged; a
season plan gathers grain when it knows a source and any food when it does not; eating within the share and never
beyond it, booked against the share; no share and not starving means nothing, starving means the ration; the switch,
save/replay determinism and observer purity; a season plan takes 3 grain to a known granary, the deposit is credited, the
share counts toward the target, and at 45 the same person neither knows the granary as a reserve nor takes grain there.
`tests/v45_continuation.test.ts` pins rules 45.

## Ordinary worlds at rules 46

Same script, same seeds and settings, final source (`winter_reserve_evidence/ordinary-30-{seed}-r46`). These are not
paired with the rules-45 rows: the worlds part at the first changed decision.

| seed | season plans adopted / done / units put by | season targets seen | into granary / eaten from it / spoiled in bins | put into home stores / eaten / spoiled | store food entering winter 2 / at its end | deaths |
|---|---:|---|---:|---:|---:|---:|
| meadow | 12 / 1 / 47 | 8-20 | 11 / 4 / 4 | 980 / 273 / 509 | 28 / 12 | 1 |
| river | 15 / 2 / 62 | 8-20 | 11 / 4 / 2 | 1026 / 327 / 476 | 59 / 1 | 1 |
| forest | 7 / 0 / 5 | 8-16 | 0 / 0 / 0 (no granary known in time) | 451 / 141 / 201 | 2 / 0 | 21 |

What that says: the season plan now aims at two days' eating (targets 16-20 for hut households, 8-12 for lean-tos), puts
more by for the winter than before (47 / 62 / 5 units against 33 / 18 / 6 at rules 45) and mostly runs out of its window
before reaching the larger target, which the plan record states as such ("the time is up"). Grain reaches the granary's
bins and is eaten from them, in small amounts (11 units in, 4 eaten, 2-4 spoiled, in meadow and river); the bins keep
their share. Spoilage in home stores is unchanged in kind and scale, because the ordinary gathering is still berries. Forest
ended with 21 deaths in this run against 6, 15 and 13 in three other runs of the same seed that differ only by one of these
slices; that seed's second winter is chaotic, and the lab rows below are the only comparison that means anything.

Lab, `winter_reserve_evidence/lab-reserve/report.txt` (8 seeds, Normal, 30 days from day 0, control + nudge +
`rich-no-winter-reserve`; rows are ablation − reference, so a negative number means the reserve adds it):

| metric | reference (with reserve) | ablation | diff | 95 % | verdict |
|---|---:|---:|---:|---|---|
| season plans adopted | 16.1 | 7.8 | −8.3 | [−11.8, −5.0] | larger than chance |
| stock plans done | 25.9 | 37.6 | +11.8 | [+8.3, +14.6] | larger than chance (bigger targets run out of their window) |
| units put by | 474.8 | 529.4 | +54.6 | [+8.6, +100.1] | systematic, within the noise floor |
| mean hunger level (higher is better fed) | 62.6 | 57.2 | −5.4 | [−9.9, −0.6] | systematic, within the noise floor |
| home food per person at end | 1.0 | 0.7 | −0.3 | [−0.8, +0.1] | not distinguishable from chance |
| deaths | 6.0 | 4.1 | −1.9 | [−4.6, +0.3] | not distinguishable from chance |
| people at end | 24.9 | 27.4 | +2.4 | [−0.1, +5.3] | not distinguishable from chance |

Read plainly: the reserve does what it says (more season plans, better fed on average, more food at home at the end,
each within noise), finishes fewer plans because the target is larger, and the death count sits in the adverse direction
without reaching the noise floor (±3.8 for deaths). That is not a benefit claim and not a harm finding; it is the
measurement, and the death direction is the thing to watch when a longer ensemble is run.

## Limits

- The lab rows above are an 8-seed, 30-day harm check, not a benefit claim: nothing reaches the noise floor except the
  plan counts, which are the mechanism itself. Whether households come through winter better needs a longer, larger
  ensemble, and the death direction above says that ensemble is worth running before any such claim.
- A lean-to holds 12 weight, so a lean-to household's season target is bounded by its room whatever the arithmetic
  says; the way out is a hut (workstream 4) or the granary.
- Only grain (and flour or bread, which nobody makes yet) goes to the granary; berries, fruit and fish still go home and
  still spoil there. A granary has to exist and be known: in the rules-45 runs two of three seeds had one.
- The spoilage of a home below condition 40 is unchanged; mending the roof is workstream 4.
