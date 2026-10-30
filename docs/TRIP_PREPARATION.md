# Personal trip preparation — rules 72

Runtime implementation: `83a56fd`. The rules-72 ordinary/preparation/drinking/travel/lost-source reference was recorded
from that commit before any successor behavior. `tests/helpers/journey.ts` and `tests/helpers/v72ref.ts` are now frozen
reference fixtures; later behavior must use a fresh fixture/version and must not regenerate historical expected values.

Predecessor rules 71 runtime `8df52c0`, published/pinned `511f26b`. The read-only predecessor diagnostic establishes a
specific missing transition: known useful distant work is withheld for the water margin while nearby water is known,
but personal trip preparation supplies no fetch-water option. This is a staged mechanism gap, not an ordinary failure rate.

Connect a bounded private journey intention to ordinary preparation actions and the original legal work. One journey per
person may accompany existing project/night intentions. It carries a specific work key/place and purpose, personal cost
estimate, a maximum of two portable food/water portions per kind, bounded retries/history and a deadline. It must survive
urgent drinking/eating and temporary interruption. Existing tool and production prerequisites remain authoritative.

Estimates may include unpromised carried supplies and the time to consume them, conservatively allowing for wasted portions;
only actual eating/drinking changes needs. Promises, other plans and physically held goods stay distinct. New provisions
must be fetched or lawfully withdrawn through existing handlers, with capacity, access, claim and depletion checks. An
absent supply, no pack room, unfit trip, forgotten destination or repeated failure yields a truthful explanation/termination.
No future weather, hidden inventory, automatic equipment or guaranteed return is introduced.

Expected positive proof: acquire provisions, depart for the retained useful purpose, physically drink/eat when needed,
resume the intended work, produce/transfer useful material and reach a lawful return/delivery. Save during preparation,
travel and the break; continue exactly and conserve all material. Negative proof: stale/depleted/inaccessible supply,
promised-only goods, full pack and unknown target cannot create capacity, knowledge or free relief. The same engine path
is available to ordinary network-free inhabitants and externally selected legal actions, with pure inspection and truthful
rendered provenance. Ordinary occurrence remains separate from staged execution and aggregate benefit.

## Implemented boundary

`journey.ts` derives preparation from an existing legal gather/build/workshop offer with positive utility, a personally
known place and at least 160 estimated outward ticks. It considers at most 32 such offers. A currently retained purpose
may be reconsidered closer to its place. It uses the rules-71 work/return/duty estimate and tries at most two additional
water and two food portions. A proposal must make at least one collection cycle or a 16-tick work spell fit, and leave
estimated pack room for one output unit. This is a conservative bounded forecast, not optimal routing or a guarantee.

Known nearby water is ranked by existing access/danger/failure knowledge; food comes from remembered household stock or
the existing forage planner. Preparation uses the real `fetch_water`, `withdraw` or `gather` handler. A selected action
creates one auxiliary private journey intention alongside existing projects/night plans. Its original work key is retained
through drinking/eating, gets the existing bounded intention preference when legally offered, and is revalidated normally.
No arbitrary action code is saved. A trip does not create missing tool eligibility; the existing tool prerequisites still own it.

`journey_supplies.ts` credits at most two actual unpromised water and two food portions at 80% nutrition, subtracting their
consumption time from the work window. This estimate never changes needs or inventory. Private provision claims share the
existing reservation calculation with promises and other plans. `reserved_goods.ts` holds that unchanged pure calculation
so activity/state owners do not import handler-registration modules. Claims disappear when the intention ends or dies.

`journey_state.ts` records at most eight actual preparation/work/portable-consumption endings. Three failed preparation/work
attempts, forgotten work location or a two-day deadline ends the intention with a reason. A positive completed/partial work
action closes the work trip; it explicitly does not claim that the underlying building/project is complete. A successful
need break is not credited as productive work. Save validation, state fingerprints and the existing inspector include the
new intention. Lab removal: `rich-no-journeys`. Prior rules, including the immutable 71 continuation, retain their meaning.

## Verification and review

`tests/journey.test.ts`: 14 contracts pass. They establish pure preparation offers, physical water and food acquisition,
actual drinking followed by the retained wood trip and useful construction, exact saves during preparation/drinking/travel,
promised-only supply exclusion, bounded credit, full-pack/unknown-source exclusion, hidden stock independence, depleted
stock revalidation, deadline release, failure evidence and malformed-save rejection. The automatic chain explicitly selects
only the initial legal preparation; all later choices are autonomous. Supplies, needs, known places and demand are staged.

`scripts/browser/journey_check.mjs`: 7/7 rendered checks pass, including the same chain and exact intermediate continuations.
Screenshots in `autonomy_evidence/journey72-rendered` show the retained intention during drinking and subsequent construction;
the drink-break and wood-use images were visually inspected. The world is visibly labelled STAGED, NOT SPONTANEOUS.

Fresh critical review found and repaired an import-order cycle before tests could start: shared reservation calculation moved
to its pure owner with unchanged public re-exports. The failed run is retained in `autonomy-trip72-v71.log`; the repaired
predecessor and first preparation checks pass in `autonomy-trip72-first-tests.log` (3 tests, 11.67 seconds). Review also bounded
the *total* food claim across mixed food kinds, allowed the auxiliary trip beside ordinary project adoption, validated saved
deadlines/items, and kept actual need-break endings without counting them as failed work attempts. A wrong `SOURCE_FOOD`
import was caught by typecheck and the food test, corrected to its actual owner, and retained in the failed focused log.
Final focused evidence: `autonomy-trip72-final-focused.log`, 14/14; scope regressions plus the earlier 12 trip contracts:
`autonomy-trip72-focused2.log`, 28/28. Typecheck passes; production build passes with the existing large-chunk notice
(980.99 kB application chunk). Full suite: **251 files, 1,703 tests pass**, 167.73 seconds,
`autonomy-trip72-full-tests.log`; its existing `TimeoutOverflowWarning` and Vite configuration notice remain visible.

## Ordinary activation

Fixed fresh Normal, immigration off, five days (12,000 ticks), seeds meadow/river/forest, each with a 170-second budget.
All reached the horizon, conserved resources and matched a fully serialized unobserved twin. Each sampled 2,800 living
person observations with 100 whole-world purity checks; these are repeated observations, not independent opportunities.

| Seed | Samples offering trip preparation | Adopted journeys / preparation starts | Seconds |
|---|---:|---:|---:|
| meadow | 4 | 0 / 0 | 62.36 |
| river | 4 | 0 / 0 | 80.05 |
| forest | 10 | 0 / 0 | 75.46 |

Evidence: `autonomy_evidence/r72-{meadow,river,forest}-5/report.json`, including exact source manifest, initial-save hash,
settings, outcomes, exclusive occupancy time budget and final save. These runs overlapped the full suite; their timings
are not a controlled speed comparison. There were **no ordinary adopted journeys**, so these runs do not establish natural
activation, trip completion frequency or benefit. The rendered/staged chain proves a reachable mechanism only.
Reproduce with `npx --no-install tsx scripts/journey_observe.ts meadow <fresh-output-directory>`, then river/forest.
Costly matched aggregate/mature-world validation stays owner-run and pending under `AUTONOMY_VALIDATION.md`; its existing
command can compare `--branches nudge:1,nudge:2,rich-no-journeys`. Do not convert a short null result into an improvement claim.

## Limits still open

The useful staged trip detours to explore after collecting water, then drinks before departing for the retained wood work.
At the shoreline, the existing estimate extrapolates the slower current terrain speed, temporarily withholding the distant
trip. This is preserved, not described as an efficient direct journey or an interruption halfway through its travel.
Preparing supplies can therefore fail to make a trip immediately worthwhile; energy, weather, terrain and duties still win.
The forecast does not predict future random weather, account exactly for the future route/load, or guarantee a return.

The journey retains one exact work key; it does not yet replace a permanently lost work source with a different known source.
`scripts/journey_recovery_diagnostic.ts` reproduces that gap at rules 72: the original source physically yields
"nothing to take yet", the intention still has no feasible next step for source #6, while personally known source #8
offers the same wood work legally (utility 33.61, outward estimate 69.17 ticks). Its read-only inspection is pure and
conservation holds (`autonomy-journey73-before.log`). This is a staged missing connection, not an ordinary failure rate.
Broader contingent goal composition, relevant obstruction/recovery alternatives, communicated meeting/delivery waits,
additional trip-tool paths, household coordination, ecology and every unfinished programme row remain in
`DEPENDENCY_CHAIN_PROGRAMME.md`. No aggregate productivity, welfare, survival or mature-world benefit is established.
