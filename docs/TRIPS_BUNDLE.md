# Stage 2 trips bundle (rules 257 and above)

Stage 2 of the plan of 17 November 2026 (brain note `knowledge/living-world/2026-11-17-research-index-viability-and-plan`), started on Ryan's instruction of 19 November 2026. The designs were written on 18 November 2026 (`C:\dev\_lw_briefs\stage2-designs-20261118\DESIGNS.txt`) from the trip waste measurement (`review_evidence/trip-waste-20261118/` on the branch `scratch/free-block-20261117`; rules 250, three day-48 saves, one run per arm: a description, never a rate). One bundle of separately switched parts, one lab with a removal arm for each part, as rules 200 to 202 did. Rules 257 to 266 are claimed in `docs/RULES_RANGES.md`.

| part | rules | status | lab arm |
|---|---|---|---|
| A, `bench_access` | 257 | built | `rich-no-bench-access` |
| B, `load_worth` and `put_down` | not claimed | [Pack measurement](../review_evidence/pack-20261119/RESULTS.md) completed. The near-home stocking change failed its reach threshold. | |
| C, `walk_stick` | not claimed | [Detours measured](../review_evidence/walk-step4-20261119/RESULTS.md). The old option was absent in most sampled job switches at every start. | |

The size is small and the designs say so: the three pieces are 0.8 to 1.7%, 3.2 to 3.3% and 6.8 to 8.8% of awake person ticks, against a gap of 15 to 18 points to the 30% of waking time the plan asks for. Nothing here is expected to close it alone. The parts remove plain mismatches and find out whether the walking is a lever at all.

## Part A: a workshop's goods count only for who may take them (257)

The mismatch, read in source and in the report. Planning and the transfer disagree about whose the goods at a workshop are.

- Planning (`site_supply.ts` `benchStock`, from rules 229) counts everything the person's snapshot of the workshop shows lying there, as inputs or as output. The snapshot held no earmarks.
- The transfer (`facilities.ts` `withdrawAllowance` and `usableUnits`) gives a person the units earmarked to them, and the workshop's free stock only if their access is owner, communal or builder. A guest at an open workplace (rules 207) has none of that. Finished goods are earmarked to whoever ordered the batch.
- So 29 to 40% of adult withdraws arrived and took nothing. 94 to 95% of those found the stock there and were allowed none: 96, 98 and 65% of them because it was earmarked to another person, and in one start 35% because it lay at another household's timber yard.

What 257 changes, in rich worlds, all in what the planner counts:

1. **record.** A sight of a workshop (`facilitySnapshot`) also records the live earmarks at that moment, as `held` on the belief's snapshot: owner, item, n and the tick it runs to.
2. **count.** `benchStock` takes the person. Of the units it counted, the person is credited the units earmarked to them in the record that have not run out since, plus the rest only if their own standing opens the free stock: their household owns the place, it is communal (household 0), or their household did a fifth of the building (the `ops.builders` share). This reads the person's own household and the builder shares remembered at sight (`seenBuilders`), nothing about anybody else's friendships.
3. The same count is read wherever `benchStock` is: the inputs a batch lacks, the full-oven top-up, the collect option, and the smithy's standing wants (`smithy_iron.ts`).
4. **old beliefs.** A belief with no `held`, taken before 257 or with the part off, is counted as it was until the person sees the place again.

Not changed, on purpose: the transfer rules (nobody gains or loses a right to any stock; a test checks `usableUnits` and `withdrawAllowance` give the same answers at 256 and 257), the earmark rule that stops one household member taking another's earmarked goods (earmarks stay a person's; only 35, 21 and 37 of the empty withdraws in the report had an owner in the person's own household), and telling other people about a failed walk (the first wasted walk of every person stays).

### Save

`held` is a new optional field on the snapshot, so it is saved. Precedent: `p.shown` (rules 213). Product save format 5 is unchanged. A world below 257, or one with no record, has no `held`, so it hashes and saves as before. On load `validateHeld` (`src/sim/bench_access.ts`, called from `src/app/save.ts`) refuses a `held` that is not a list of whole earmarks (an integer owner, a known item, a whole number of 1 or more, a finite tick) and refuses any `held` in a world that does not run 257.

### Failure modes (from the design, to be read in the lab)

1. A person who ordered a batch never collects it: the goods stay locked until the earmark lapses, as at the transfer already. The part only stops sending other people there.
2. A belief older than the earmark: the person believes goods are free and walks as before. The part cuts the waste, not all of it.
3. An undercount of a builder share or a friendship the code misses would hide goods the person may take. The tests cover owner, communal and builder.
4. The time freed goes elsewhere. No claim that company or leisure rise.

### Measure (reading fixed before the run; the thresholds are Claude's and Ryan may veto them)

Row: the share of adult withdraws that take nothing (29 to 40% at rules 250) and the share of adult walking ticks spent on them (2.2 to 4.1%). Reading: the empty share falls by at least half in every start. If it does not, the mechanism reading is wrong and the report names which class of empty withdraw remains (earmarked, guest, race, stale). This needs the withdraw counter (the scratch observer `withdraw_check.ts`, not one of the three observers Stage 1c landed): the standalone continuation probe now supplies that row. Results and observer limitations for all six starts are in [the paired comparison](../review_evidence/withdraw-baseline-20261119/RESULTS.md).

Rollback: switch the part off (`rich-no-bench-access`). The `held` field stays in saved beliefs and is ignored.

The reconciled implementation validates and fingerprints both remembered earmarks and builder shares. For a draft-257 belief with earmarks but no recorded builder share, the builder route to free goods becomes available after a fresh sight.

## Part C. Keep a valid workshop input errand (rules 266)

A production withdrawal records the intended workshop and recipe on its activity. During travel review, if a different workshop is now nearest, the planner also checks the original workshop for that recipe. It retains the existing store-and-item option only when the ordinary planner still offers it for the same goal. Current demand, access, recent failure, workshop state, available stock, carrying room and urgent interruptions still apply. Older activities without the two optional fields finish under ordinary review. The lab removal is `rich-no-workshop-errand`.

In three paired continuations immediate returns to the first store fell from 22 to zero. Finished workshop operations moved in both directions. The [decision trace and comparison](../review_evidence/store-return/RESULTS.md) gives the sample and its limits.
