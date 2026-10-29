# Winter shelter preparation (rules version 47)

Delivered 2026-10-29 on `main` after rules 46 (`80b0fe4`). Workstream 4 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). Adapted under current rules from the unmerged candidate
`claude/winter-shelter-v34` (`f33cd0b`), whose number "34" collides with main's plan reconsideration; nothing from that
branch was merged or cherry-picked, and its two-seed death tally is not imported as evidence.

## The situation this serves

> A household recognises that its shelter is inadequate or failing, chooses a feasible response, obtains the
> materials, builds or mends, and occupies its home through the winter, or meets an understandable reason it cannot.

What already existed (and is unchanged): laying out a lean-to when a household has none and a hut when it has a
lean-to (`options_work.ts optPlanBuild`, with every blocked reason recorded through `noteHousingBlock`); fetching a
site's missing material on purpose (`shelter.ts`, rules 7); partial batches with a full pack (rules 37); building and
ownership (`act_build.ts`, `buildings.ts completeSite`); occupancy (`habitation.ts`, rules 3); the roof plan when a
solid home falls below 55 (`intent.ts repairWanted`) and the neighbour's help when nobody at home can mend it
(`options_social.ts`, the `repair` request); collapse at condition 0 (`buildings.ts destroyBuilding`: the household
drops to no home and the lean-to-first ladder starts again); an upgrade site cancelled when the building it was to
replace collapses; stale sites swept after `SITE_PATIENCE` (`world.ts clearStaleSites`); a site that cannot be fed
relinquished with its reason (rules 34). The spoilage cost of a poor roof is in `world.ts spoilGoods`: below condition
40 stored food spoils twice as fast.

## Contract

Gated on `runsRulesVersion(world, 47)` and rich dynamics; the rules-46 full serialized continuation
(`tests/v46_continuation.expected.json`) was recorded from `80b0fe4` before any of it. Lab switch
`rich-no-winter-shelter`. Owner: `src/sim/winter_shelter.ts`.

1. **A deterministic winter cue.** The pre-winter window household food preparation already reads
   (`provision.ts inPreWinter`: three days at rules 46 and later). It never reads the random lean season or hidden world
   state.
2. **A shelter nudge while fed.** During the cue, laying out a lean-to or hut, hauling to and building the household's
   own home site, and mending the household's own home each gain `WINTER_SHELTER_BOOST` (12), named "winter is
   coming" in the decision record. The hunger and thirst gates in front of all of them are untouched: food still comes
   first (a recorded owner decision, [HOUSEHOLD_HOME.md](HOUSEHOLD_HOME.md)).
3. **Three exemptions while the window is open** (the cue plus winter itself), for a household that wants a home:
   its own workshop site no longer counts as "the household has already laid out a site"; the open-site cap does not
   block it; and its home site is not cancelled for idleness. Outside the window, and below 47, each of these works
   exactly as it did.

No new state, no save-format change, no decay constant changed.

## Tests

`tests/winter_shelter.test.ts` (12 staged contracts, adapted from the candidate): the cue and window are deterministic
and gated, and absent at 46; a homeless household lays its home out past a full cap and past its own workshop site,
with the nudge named; both block again with the switch off; a hungry household is not pushed; a home site survives the
stale sweep in winter and is cancelled with the switch off; determinism, conservation, save/replay.
`tests/v46_continuation.test.ts` pins rules 46.

## Ordinary worlds and the lab

`scripts/shelter_observe.ts` (Normal, immigration off, 30 days, 240-second budget, source manifest, observer-purity
check at every sample): home plans offered and blocked (by the cap, by a workshop site), repair offers, "winter is
coming" offers and starts, homes laid out / finished / abandoned / collapsed, homes below condition 40, homeless
households at each winter, exposure deaths with no home or a poor one, and spoilage in stores. The per-seed table is
in the slice log of DEPENDENCY_CHAIN_PROGRAMME.md; in short, the nudge fired on 386-453 sampled offers per seed and
started hauls, builds, repairs and hut layouts in every seed, and forest at rules 46 showed the candidate's lead (eight
exposure deaths among the homeless) where the same seed at 47 ended with 17 homes instead of 10.

Lab, `shelter_evidence/lab-shelter/report.txt` (8 seeds, Normal, 30 days from day 0, control + nudge +
`rich-no-winter-shelter`; rows are ablation − reference, so a negative number means the slice adds it):

| metric | reference (with the slice) | ablation | diff | 95 % | verdict |
|---|---:|---:|---:|---|---|
| solid homes at end | 9.9 | 8.5 | −1.4 | [−2.8, −0.3] | larger than chance |
| mean home condition | 61.3 | 55.9 | −5.4 | [−10.0, −0.8] | larger than chance |
| buildings | 25.5 | 23.8 | −1.8 | [−4.3, +0.1] | not distinguishable from chance |
| homeless households | 0.3 | 0.9 | +0.6 | [−0.1, +1.4] | not distinguishable from chance |
| deaths | 5.4 | 5.9 | +0.4 | [−0.8, +1.9] | not distinguishable from chance |
| people at end | 24.6 | 24.8 | +0.1 | [−1.6, +1.6] | not distinguishable from chance |
| mean hunger level | 61.2 | 61.5 | +0.2 | [−5.9, +6.3] | not distinguishable from chance |

Read plainly: with the slice, worlds end with more solid homes and better-kept homes, both beyond the one-draw noise
floor; whether anyone lives because of it is not shown (deaths and homelessness move in the hoped-for direction but
within chance).

## Limits and what is deliberately not here

- No death claim. More solid homes and better-kept homes are established beyond the noise floor in an 8-seed, 30-day
  lab; fewer deaths or fewer homeless are not.
- Replacement after collapse is the existing lean-to-first ladder: a household that lost a hut shelters cheaply first.
  No rebuild-in-place is added.
- A household of children and elders asks a neighbour to mend the roof (existing) but still cannot lay a home out;
  that limit stands.
- Nothing here guarantees a house or survival.
