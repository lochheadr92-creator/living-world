# Acquiring necessities for personally observed care

## Rules 95 implementation and verification

Predecessor rules 94 is published at `3807c42`, runtime `4f3c398`, immutable
reference `842689b`. `care_supply.ts` owns bounded acquisition options derived
from the existing resident contact. `care_journey.ts` owns one private purpose,
created only when a legal acquisition is selected: recipient, observed tick,
start, deadline, food/water kind, at most two acquisition attempts and a truthful
phase/outcome. The 700-tick deadline comes from the existing room-contact lifetime;
no remote need is refreshed. A failed observation cannot restart until newer
contact exists. The latest record is bounded; existing social receipts retain
their separate ownership.

The existing forage and fetch actions still perform all physical work. Acquisition
fits a spare portion plus protected reserves into the current pack, capped at 12
units and further narrowed by the existing trip/return estimate. A healthy capable
helper considers at most one recipient and three food sources or one water source.
No supplies, carrying space, permissions or promises are created. Actual household
food or water already remembered at that home prevents another acquisition trip.

A selected journey retains the return purpose through the ordinary eligible care
options. The new food score is 72 before personal modifiers/costs; water is 54 plus
14 for practical care. The return adds 32 to an otherwise legal care handoff/deposit.
These bounded new-purpose priorities address the traced competition with bulk
stockpiling (about 56 plus the existing 14-point private-plan preference); they do
not change hunger/thirst rates, critical filters, survival guards or historical
scores. The initial score-46 candidate gathered for general stock instead, and an
explicitly selected acquisition then resumed bulk gathering rather than retaining
the care purpose. Those failed runs remain recorded.

Actual contact rechecks need, reserves, promises and recipient capacity. New rules
retain one personal water portion and other dependants' portions. A resident who
comes outside can receive through ordinary physical contact. A failed full-pack
handoff can use the existing lawful home-store fallback. Only actual transferred
quantities close a journey as delivered/deposited; neither label asserts consumption.
New personal observation that the need is gone, loss of location, deadline or known
death ends the purpose. Matching current/suspended acquisition stops and releases
its claims; unrelated work remains. Carer death also ends the private purpose.
The inspector shows this cause/state, and current care speech names the actual goods.
The isolated lab removal is `rich-no-care-supply`.

Full regression passes **309 files / 2,079 tests**, **434.63 s**
(`autonomy-care95-final-full-tests.log`). A subsequent bounded review correction
handles alternate food and actual acquired quantities, described below. Focused
verification of that final source passes **72 tests / five files**, **2.53 s**
(`autonomy-care95-food-fix-focused.log`): new care contracts, live/stub AI replay
with/without notes, resident-care and water regressions, and immutable rules 94.
Final typecheck/build pass (`autonomy-care95-food-fix-build.log`), retaining the existing
bundle-size warning (JavaScript about 1,120 kB, gzip 376 kB). The full-suite result
precedes this last correction; the affected contracts, browser and ordinary screens
were rerun afterwards. Cancelled earlier runs are not passes.

The rendered food/water scenes pass **11/11** under
`autonomy_evidence/care95-food-fix-rendered`. Initial household, injury and nearby
physical supplies are declared staged. Thereafter acquisition, handoff and consumption
are autonomous. A saved paid partial acquisition continues exactly; rendering is pure,
resources balance, and the helper retains a personal portion. Screenshots were
inspected. The old water-only “hungry” speech was corrected to actual transferred
goods and checked both in a contract and the final rendered scene.

The full-pack extension follows actual grain gathering, failed handoff, deposit of
one grain at **124**, the recipient beginning `eat_store` at **164**, and hunger
rising from **20 to 36.78 at 174**. Pack weight remains **12** and no grain enters
the recipient pack. Saved twins and conservation agree. Evidence:
`autonomy-care95-full-pack-consumption2.log`, also covered by the final contract.
The first extended trace correctly showed consumption but exposed another acquisition
while the first portion was still remembered in the store. The known-supply guard
prevents that redundant trip; the original trace remains.

Other preserved findings:

- A real lost-grain/known-fruit alternative acquired two fruit but was marked failed
  because the journey still checked only grain (`autonomy-care95-food-alternative-before.log`).
  It now retains the food-versus-water purpose while allowing a different food,
  updates the selected item, and counts actual paid acquisition. Existing carried
  food cannot credit a zero-work trip; grain converted into seed is excluded from
  acquired food. Actual food receipt can close a food purpose regardless of kind.
  New contracts follow the alternate fruit all the way through contact receipt and
  saved continuation, protect existing reserves, and forbid silent food/water switches.
- The first browser driver used a nonexistent renderer property; the corrected driver
  uses the existing game/UI entry points. The failed log is not a rendered pass.
- A source-loss fixture first allowed legitimate regrowth, producing a partial receipt.
  The two genuinely empty-source attempts now declare initial growth ages and explicitly
  account the loss after departure; actual arrival learns depletion, the known alternative
  is tried, then the two-attempt limit closes the purpose. No production rule was changed.
- An AI test initially inspected the input fixture after `runLive`, which returns its
  own world. Correcting the assertion to the returned world proves actual receipt/replay.
- The first ordinary meadow trace found personally cancelled need while the old fetch
  continued until ordinary review. Matching-activity cancellation and claim release were
  added, preserving unrelated rest. That rest fixture first ended normally because the
  person was already rested; it now declares a legitimate rest need inside the room.
- Full-suite attempts `autonomy-care95-full-tests.log` and
  `autonomy-care95-release-full-tests.log` were cancelled for these concrete findings.

## Final ordinary screens

Three unchanged normal worlds run five days / 12,000 ticks without induced needs,
supplies or choices. Each has an exact unobserved twin, 100 pure observer checks,
daily conservation and a valid final save. Source hashes are recorded in each
`autonomy_evidence/r95-food-fix-{river,forest,meadow}/report.json`.

| Seed | Seconds | Person samples | Remembered need samples | Offered / first-ranked samples | Actual acquisition starts | Care receipts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| river | 41.79 | 2,800 | 0 | 0 / 0 | 0 | 0 |
| forest | 37.61 | 2,800 | 17 | 3 / 1 | 1 | 0 |
| meadow | 39.76 | 2,773 | 8 | 1 / 1 | 1 | 0 |

Forest person #923 starts for Kaia #925 at 11886, then changes activity at 11947
before any paid gathering cycle. The earlier inventory-based candidate falsely
labelled this a return because berries were already carried; the final source
truthfully retains acquisition, with zero newly acquired supplies. Its observation
expires at 12242, beyond the window. Meadow person #1022 starts for Mona #1024 at
9325 and stops at 9365 after personal contact no longer shows thirst, also before
acquiring water. River/forest have no deaths. Meadow retains Talia #1029, age 8,
dying of thirst at 8746. Repeated need/offer samples are not independent opportunities.

Ordinary successful receipt, repeated assistance and household viability remain
unproven. Warmth duties, childcare return and every other open programme row remain
required. This is not whole-prompt completion.

## Pre-implementation contract

The rules-94 source audit finds an incomplete transition in `resident_care.ts`:
personally remembered indoor hunger/thirst and incapacity can motivate returning
with spare goods, but an empty-handed helper only receives a blocker. Rules 45
already supports food acquisition after an accepted request. This slice connects
the separately observed care need to existing physical gathering/fetching and
handoff actions; it does not create another promise or transfer handler.

`autonomy_evidence/care95-before.ts` reproduces the gap at rules 94. Ada personally
sees injured, hungry Eli in their own home, leaves lawfully with no food, and knows
a real grain source. There is no care acquisition option; the recorded blocker is
“must keep supplies for my own needs, others or promises.” The failing assertion
and observed personal state are retained in `autonomy-care95-before2.log`.
An initial fixture consumed starting food and then took another initial snapshot;
that accounting error was caught by the fixture preflight. The replacement declares
the empty inventory before the initial snapshot. Both food and water variants now
save/reload exactly and conserve resources (`autonomy-care95-fixture2.log`). The
earlier failed fixture/log remains; it is not successful physical evidence.

The intended contract is:

- Trigger only from actual visible need or fresh personal room contact. Hidden
  health, inventory, changed location or source depletion must not become known.
- Consider at most one recipient's supply acquisition per decision. Require a
  capable helper with their own basic needs protected. Preserve promises and
  existing portions reserved for other dependants.
- Acquire only from personally known sources using existing registered actions,
  actual work, pack limits, access, water budgets and material accounting. The
  amount covers a bounded spare portion and necessary personal/committed reserves.
- Keep the recipient and observed need visible in the action explanation. Existing
  personal contact memory and action state retain the cause across a save; no
  second general memory store or compulsory household role is introduced.
- Urgent interruptions, stale observations, empty/unknown sources, a full pack,
  missing recipient or refusal of entrance remain genuine failure outcomes.
- After acquisition, existing contact-checked care, lawful home-store fallback and
  actual recipient consumption must establish usefulness. Acquiring goods alone
  is insufficient evidence of care.
- Preserve historical rules and add a lab removal. Test source loss, protected
  reserves, own urgency, observer purity, exact save continuation and legal AI
  selection/replay, then render the actual acquisition/return/consumption chain.

Warmth, childcare handback, ordinary frequency and household viability remain
separate programme requirements. No implementation or successful outcome is
claimed by this pre-implementation contract.
