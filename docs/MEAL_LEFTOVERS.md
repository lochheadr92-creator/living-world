# Physical shared-meal leftovers — rules 90

This is the physical prerequisite from `MEETING_ARRANGEMENTS.md`, not completion of meeting
knowledge, cancellation, revision or the owner programme. Predecessor 89 is pinned at
`ab66ee5` from runtime `aa38124`. The current candidate follows published `dd46b4e`.

## Contract and causal defect

The audit reproduced four table portions returning to a host 48.738 tiles away and a
different contact fixture becoming 15/12 weight. Both still balanced the ledger. The new
contract therefore requires physical custody and capacity as well as conservation.

Ending a meal retains all uneaten food in one existing outdoor pile near the original
gathering point. No food returns automatically, even to a host standing beside it. The
supplying household is recorded when the host sets out the actual food. A surviving member
can recover it after the host dies; the host changing household does not silently transfer
ownership. This is custody of real, finite food, not a reservation on future inventory.
The holding ends through actual withdrawal, eating, ordinary outdoor spoilage or existing
environmental loss. No ownership timeout quietly gives the food away.

One pile holds the remaining food from one meal. It does not merge with public salvage,
another meal or later deposits. Its meal ID, host ID and household ID retain origin after
the bounded operational meal record expires. Existing food sprites, perishable loss and
empty-pile removal are reused; there is no entity per portion and no second inventory.
The 60-entry meal history now evicts only ended, empty records, or refuses a new arrangement
if every slot is still active. It cannot discard an occupied live table to make room.

`production.ts` offers recovery from personally remembered owned food when ordinary work
margin permits it, up to four portions and actual remaining pack room. It uses the existing
`withdraw` action: approach the pile, spend `6 + 3 * itemKinds` handling ticks, recheck
ownership/location/stock/capacity and transfer actual goods. Urgent needs may displace the
choice. No food, spare time, enlarged pack or forced cleanup is supplied. Hunger can also
use the existing lawful pile meal. Cart loading, each table bite and withdrawal enforce
the same ownership boundary. An outdoor holding cannot be collected from another interior
or a forged remote work position. Known-source options exclude another household's holding.

The current legal AI offer schema already supports these ordinary actions and remembered
ownership. Stub/live decisions with and without memory replay exactly. No new AI authority
or observer-only remote meal state is exposed by this slice.

## Owners and compatibility

`meal_leftovers.ts` owns the gate, custody/physical-contact boundary and validation.
`meals.ts` records the supplying household and transfers the ended table to the physical
holding. `buildings.ts` keeps this origin separate when placing/merging piles. Existing
resource/cart handlers execute access checks; production/survival/transport use personally
known ownership. `knowledge.ts`, `inspect.ts`, `types.ts`, save validation and the world hash
retain/explain the added fields. `rich-no-meal-leftovers` retains the former automatic return
for an isolated lab comparison. Already-created owned holdings still enforce ownership.
All older worlds keep their table return, histories and serialized continuations.

The new rules-89 reference helper needed two `Number(...)` wrappers around numeric inventory
reads: TypeScript otherwise retains a stale literal narrowing across a mutating simulation
call. These do not change the scenario, values, expected data or runtime comparisons. Its
original immutable expected file is unchanged and continues to pass.

## Verification

The original boundary tests failed **2/3**, preserving both reproduced defects and the
historical return. Focused runtime/contracts/AI/previous-reference checks subsequently pass
**36 tests / 4 files** in 2.18 seconds (`autonomy-meal90-final2-focused.log`). They cover
offered host/guest physical eating, an uneaten extra, actual recovery and later consumption
of more food than the original carried amount, partial capacity, changed household,
interruption, missing food, forbidden access, death custody, separate salvage, history bound,
malformed ownership, purity and saved travel/handling continuation. Earlier failed test runs
and typing errors remain in the local logs; none is represented as a pass.

Typecheck/build pass (`autonomy-meal90-build.log`); the existing bundle-size warning remains.
The rendered check first exposed a real selection defect: the basket is visibly drawn in
front of the hall but loses their equal bounding-box depth tie. A dedicated regression
fails before correction (`autonomy-meal90-picking-before.log`). Picking now resolves that
tie in favor of the visible meal holding, while preserving person priority. Final rendered
verification passes **7/7**, with actual basket click, visible ownership, timed handling,
six carried portions and later consumption; screenshots were visually inspected under
`autonomy_evidence/meal90-final-rendered` (final repeat, also **7/7**).

Fresh review also reproduced a rejected remote collection refreshing the person's unseen
pile memory before its contact check (`autonomy-meal90-contact-knowledge-before.log`). The
contact check now runs before observation. Extending the same negative contract to the
full-pack `eat_store` ending exposed its cleanup callback refreshing the same unseen pile
(`autonomy-meal90-end-knowledge-before.log`). The callback now checks contact and ownership
too. The in-progress second full run was stopped for that finding and is not a pass.
Final focused **39 tests / 5 files** pass in 2.15 seconds (`autonomy-meal90-final3-focused.log`),
including ownership change before an actual table bite; final typecheck/build pass.
The first broad run passed **293 files / 1,976 tests**, but predates these fixes; final
broad regression passes **294 files / 1,979 tests** in **412.14 seconds**
(`autonomy-meal90-final3-full-tests.log`). The immutable rules-90 reference is recorded
separately after the verified runtime commit, before successor behavior is introduced.

## Fixed ordinary five-day screen

`scripts/meal_leftovers_observe.ts` runs unchanged Normal/current-rich river, forest and
meadow, immigration off, for **12,000 ticks** each. It records **2,800 repeated living-person
samples and 100 full-state observer-purity checks** per world. These samples are not
independent opportunities. Exact unobserved twins, daily conservation and final validated
saves all pass. All three finish with 28 living people and no deaths; this is no survival
benefit claim. Source manifests are retained with each report.

| Outcome | River | Forest | Meadow |
|---|---:|---:|---:|
| Host activity starts | 1 | 2 | 0 |
| Guest activity starts / successes | 0 / 0 | 3 / 3 | 0 / 0 |
| Portions physically placed on tables | 2 | 8 | 0 |
| Portions left at the site | 2 | 4 | 0 |
| Sampled personally known owned leftovers | 11 | 50 | 0 |
| Sampled recovery offers / ranked first | 11 / 0 | 29 / 1 | 0 / 0 |
| Recovery starts / successful completions | 0 / 0 | 1 / 1 | 0 / 0 |
| Portions physically recovered | 0 | 3 | 0 |
| Later pack-meal starts by a collector | 0 | 2 | 0 |

Final-source elapsed times are **41.644 / 35.372 / 35.643 seconds** while the regression suite also ran.
These are short-screen costs, not an isolated performance benchmark or mature Large-world
result. `autonomy_evidence/r90-final-{river,forest,meadow}` retains final-source reports and
saves (3,291,654 / 2,819,882 / 2,543,574 bytes). Their full saved end states exactly equal
the initial `r90-{river,forest,meadow}` runs; the contact/picking corrections did not change
these ordinary outcomes. `r90-final-comparison.json` retains that comparison. Earlier
`r90-release-*` repeats are also retained, not substituted for the final source manifest.

Forest meal #2263 used fire #895: host #939 laid four grain and one berry at tick 3,300;
#939/#935/#940/#923 ate, and one berry remained in owned pile #2506 at 3,383. A later meal
#3239 hosted by Dov #940 failed when #920 did not arrive. Three grain moved from that table
to pile #3444 at 6,383. Dov started actual recovery at 7,916 and received all three at 7,979;
the action took 63 elapsed ticks. Two subsequent pack meals were observed; that count alone
does not identify which fungible portions were eaten. The targeted unchanged-source trace
`autonomy_evidence/meal90-story.json` resolves this: Dov had no grain before recovery, then
deposited two at home #1895 at tick **8,026** for reserve plan #2799 and ate the remaining
grain during the step beginning **8,136** (the snapshot after that step is tick 8,137).
There were no intervening grain sources. This establishes physical household provision and
personal useful consumption of the recovered food, not an aggregate welfare improvement.

River preserves a refusal and a failed host activity, with 11 sampled offers but no recovery.
Host #1131 set two fish at meal #5131 at tick 10,582; the failed gathering retained them in
pile #5337 at 10,583. A targeted unchanged-source loss trace (`meal90-loss.json`) records
one fish spoiling at **11,219** and the other at **11,699**, with explicit left-out-food
ledger losses. Host samples show sleep or shelter outranking recovery during the night;
the first earlier sample ranks an offer of help above cleanup. These are sampled ranks,
not a claim to have recorded every decision. Meadow retains the zero-opportunity result.
No paired aggregate improvement, repeat successful arrangements or reliable village-wide
cleanup has been established. Longer owner-run validation remains pending under
`AUTONOMY_VALIDATION.md`, as do every other open programme row and meeting knowledge.
