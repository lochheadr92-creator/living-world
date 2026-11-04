# Survival capabilities

## Inventory and implementation path

Assignment: owner prompt, 4 November 2026. Starting checkout is
`C:\dev\Claude Experiment\living-world-integrate`, `main`,
`61cb6e5139adbedfd52f463fc635a90d4172327b`, rules 121. Verified before editing:
no tracked modifications, 149 untracked entries, preserved. The sibling checkout
is not this baseline. All ordinary product measurements keep arrivals on.

| Stream | Existing mechanism and owner | Missing connection to implement |
|---|---|---|
| 1. Preserve food | `recipes.ts`, `production.ts`, `facilities.ts`: paid batches, held inputs, work, passive processing, output capacity and claims. `economy.ts`, `provision.ts`, `act_resource.ts`: eating and storage. | Paid drying/smoking equipment; weather/fuel dependent, perishable batches; fish to stored provisions to actual meals. Existing meat follows the same route. |
| 2. Heat homes | `habitation.ts`, `needs.ts`, fire activities, `warmth_duty.ts`, `offcuts.ts` | Paid indoor hearth, physically delivered fuel, residual room heat and actual occupant benefit; diagnose child/refuge connection. |
| 3. Warm gear | Equipment registry/ownership, recipes, activities, care; appearance is cosmetic | Obtain/process plant fibre; manufacture, allocate, wear/use, wet/dry, repair and replace garment, blanket and bedding. Hide connection follows stream 4. |
| 4. Recover carcasses | `hunting.ts`, wildlife, carrying, ledger, transport | One finite corpse per kill, paid partial recovery of meat/hide/fat, access/decay/cleanup; replace current immediate reward only under new rules; complete streams 1 and 3. |
| 5. Traps and nets | Equipment, resources, perception, activities | Manufacture/place/revisit/collect saved gear; finite catches, deterioration and unsuccessful trips. |
| 6. Domestic animals | Wildlife/resource accounts, ownership, activities, carcass route after stream 4 | Select one species against source; accounted founders, food/water, containment, breeding, recurring product, slaughter and costs. |
| 7. Body reserves | Eating, needs, lifecycle and saved person state | Paid finite nourishment after streams 1–6, with explicit capacity/tolerance, no free migration reserves or healing, and predecessor/programme comparisons. |

One behaviour stream at a time (Brain D2). This assignment does not import P3.3,
reorder unrelated programme rows. The owner's revised seven-family attachment in
chat `01a1a465-bf07-75e1-8c93-84c5b2ee3919` explicitly authorises body reserves last,
superseding the earlier six-family restriction. The Brain assessment
and brainstorm are dated proposals; this owner prompt authorises implementation.
`WORKFLOW.md` governs delivery; no new review or approval gate is introduced.

## 1. Preservation — rules 122 implemented; bounded ordinary activation

Implementation path: add a small paid drying/smoking rack as an ordinary building
and facility. Use the existing layout, material acquisition, construction,
production, deposit, operate, withdraw and eat activities. One existing `Job`
holds each batch; no second inventory or scheduler. Drying and smoking are separate
recipes. The existing job start tick bounds elapsed deterioration; no extra state
or inventory is needed for this stream.
Inspection and save/load never advance it. The viewer must see work, held inputs,
elapsed processing and the actual reason it waits or fails.

Protect immediate eating at planning and execution; preserve a modest surplus,
not every raw portion. Hungry inhabitants can retrieve/eat accessible raw or
preserved food. Full output storage keeps goods accounted for in the batch.
Rain pauses drying; absent fuel prevents smoking; interruption retains work;
neglect, cancellation and destruction settle real contents without freshening food.

Predecessor evidence: `npx --no-install vitest run tests/v121_continuation.test.ts`
passed (1 file, 1 test, exit 0) on the unmodified baseline. The existing immutable
`tests/v121_continuation.expected.json` and helper exercise an ordinary arrivals-on
meadow world, childhood and exact serialized save/load continuation. Do not rewrite.

Candidate rules 122: a rack costs 4 wood, 2 stone and 180 construction work;
capacity 30, at most one paid batch. Both recipes use two raw portions and 60 work.
Drying then needs 720 rain-free ticks (rain over 0.1 pauses it); the covered smoking
pit instead consumes one delivered wood once and processes for 360 ticks. An
unfinished batch expires 4,800 ticks after it began, including interruptions and
full output storage. Unburned fuel waits for real storage capacity after expiry.
Cancelling does not return fresh raw fish or reset the clock.

Each recipe produces two portions. Dried fish/meat give 24/22 nutrition versus
raw 28/26; smoked fish/meat retain 28/26. Perishable multipliers are 0.18 dried and
0.25 smoked versus raw fish 1.6 and meat 1.4: deliberate finite shelf-life benefits,
with more stable drying and a small nutrition cost. Existing world spoilage runs
apply in stores and piles; new provisions also spoil in packs and carts. No winter,
need, raw spoilage or wildlife rate is changed. Preparing a new batch requires two
other accessible portions and yields to hunger and other immediate needs.

The food audit extends accounting, nutrition/weight/value, carrying sightings,
provisioning, storage, meals, sharing, care, trade, relocation, eating and display.
Source-foraging lists remain lists of obtainable wild foods. Actual granary eating
now checks each food's withdrawal allowance under the new rules; an inaccessible
first-listed food cannot hide a different available share. Old rules keep their
previous path. `rich-no-preservation` suppresses new preservation decisions and
starts, while any already-paid batches and product properties retain their semantics.

Verification and findings:

- Focused preservation, transport and predecessor tests: 33 passed, exit 0
  (19.54 s after strict batch validation). Earlier reserve/batch regressions:
  82 passed across five files, exit 0. Tests exercise paid work, interruption,
  expiry, rain, missing fuel, full storage/pack, competing claims, actual eating,
  care-compatible food access, exact continuation and pure repeated observation.
- Current rendered evidence: `survival_evidence/check9/rendered/`; all five
  assertions pass, exit 0. Paused-drying and stored-output images were inspected.
  The display uses actual workers, held inputs, progress and contents. These are
  explicitly staged checks, not ordinary activation evidence.
- `check8/full-test.log`: `npm test` exited 1, with 414 files passing and 14
  retained review files failing; 2,496 tests passed, 32 failed, three expected
  failures. All tracked tests passed. The full command is not green.
  `check9` is rerunning it after the transport/validation corrections.
- Required typecheck and build on check9 each exit 1 on the unchanged untracked
  `zz_review_f_plank_diversion.test.ts:27` and
  `zz_review_main_mature_large.test.ts:23` nullable errors. The same errors were
  reproduced on exact starting HEAD with these retained tests. Pristine tracked
  baseline typecheck passed. Eight unchanged review files separately reproduced
  17 failures on starting HEAD (`survival_evidence/baseline-review/`), including
  obsolete assertions and missing historical scratch paths. No review tests are
  excluded or weakened. A prior direct Vite build passed; that diagnostic does
  not make `npm run build` pass.

Ordinary evidence uses Normal forest and river, arrivals on, 25 days, exact
seed twins, observer-purity checks, conservation and save/load continuation.
Each frozen source and actual exit status is retained under
`survival_evidence/check*/ordinary/reports/`; completed reports have
`stop='horizon'`, tick 60,000, exit 0 and passing integrity checks.

- Check1 and check3 completed both worlds with no preserved food. All nulls remain
  in their raw reports. Check2 was a rendered check, not another ordinary run.
- Check4 produced and consumed food in river: two dried/two smoked made,
  one dried/two smoked eaten, one dried spoiled; forest remained null. This
  candidate's early rack-construction exception disrupted the valid leisure
  regression. The exception was removed; check4 is not current delivery proof.
- Check5, check6 and check7 completed with zero preserved food. Their final
  states are identical for each seed. Forest ended with three alive, with deaths
  from hunger 17, exposure 5, wolves 5, fever 3 and injuries 1. River ended with
  15 alive: hunger 13, exposure 5, wolves 2, fever 2 and injuries 3. Forest built
  a rack; river's rack layout encountered a real competing footprint claim.
- Check8 (reserve-plan connection) completed both worlds, exit 0 with all
  integrity checks. Forest made and ate two dried and two smoked fish, with one
  wood burned and no preserved-food spoilage. It ended with four alive; deaths:
  hunger 22, wolves 3, fever 4, exposure 0. River remained null and ended with
  15 alive; deaths: hunger 13, exposure 5, wolves 2, fever 2, injuries 3. Forest
  delivered seven raw fish and one wood to the rack. Seven operate activities
  started across two actual batches; two completed and five were interrupted.
  This proves bounded ordinary use of both recipes, including renewed work.
- Check9 includes transport integration and strict batch ownership/timing
  validation. Both 25-day runs completed with exit 0 and passing integrity
  checks, retaining check8's complete forest chain and null river chain.

Final loss-path review found that generic building collapse scattered an unfinished
batch as fresh raw stock. The rack now spoils its unfinished food once and leaves
unused fuel to the normal rubble recovery path. The focused reproduction failed
before this fix; 28 preservation, predecessor and equipment-loss tests then passed
(exit 0, 20.33 s). Check10 completed both ordinary worlds with this correction:
exit 0, full horizon and passing integrity checks; forest again made and ate
two dried and two smoked fish, river remained null. Its complete suite used
eight workers after check9's default run encountered
additional timing failures. Check9 exited 1: 33 failed tests, 2,494 passed, two
expected failures and three skipped; `lab_defaults` subprocess and retained
retention setup timeouts both passed unchanged in isolation (five passed, one
expected failure, exit 0). That does not make check9's full command green.
Check10's `npm test -- --maxWorkers=8` exited 1 after 434.39 s: 415 passing
files, 13 failing retained review files; 2,498 passed tests, 31 failed and three
expected failures. All tracked tests passed; no tests were excluded.
All 31 failures were separately reproduced at the exact starting HEAD: the
first eight-file diagnostic produced 17 failures, and
`survival_evidence/baseline-review-remaining/` produced 14 failures in five
files, with the sixth file passing (exit 1, 214.06 s). The failures concern
missing historical scratch-report directories and assertions expecting retired
rules or defects that the starting implementation no longer exhibits. This
classification does not turn any of the failed full commands into a pass.

The batch compiler could also substitute stale nearby rack stocks for the fresh
stocks that motivated a demand. A failing two-rack test demonstrated this; all
preservation planners now share the one-day remembered-stock limit. Forty-eight
affected tests passed, exit 0. Check11 is the latest frozen runtime and runs both
ordinary worlds. The immutable rules-122 continuation reference now exists and
passes its first test (exit 0, 7.24 s); it covers ordinary decisions and staged
paid work, rain-paused processing and output. No older reference was changed.

The relevant missing links were diagnosed before fixing them. General workshop
supply protected the entire household food reserve, preventing transfer to a
preservation rack; preservation now retains two immediate meals while other
production keeps its old reserve floor. Preservation can use the existing batch
planner, and an existing food-reserve plan can choose preparation without a
second project or reserving food away from meals. Its home destination remains
fixed while steps visit the rack. Passive processing does not keep someone
waiting beside the batch. Finished provisions enter existing cart reserve trips.
Malformed batches cannot lose their client and thereby finish without the
intended ownership claim. No general priority, need, climate or scarcity rate
was increased.

Bounded diagnostic replays and immutable samples are under
`survival_evidence/rack-diagnosis-v2.json` through `v5.json` and
`plan-diagnosis.json`. The first `rack-diagnosis.json` has valid aggregate
counters but shared nested inventory references; do not use those as historical
snapshots. V5 continues a retained day-ten world with the current candidate; it
is a diagnostic fork, not a replacement for an ordinary run. The current
observer records supply/processing starts, deliveries, work ticks, phase changes,
fuel, actual consumption/spoilage, failures and recent choices at the rack.

Resume verification, 4 November 2026: all 264 recorded source hashes match the
working source under the observer's documented LF normalization. All 1,467
tracked source/script/test/config files compared to frozen check11 also match
after line-ending normalization. Check11 finished both 25-day arrivals-on Normal
worlds at tick 60,000, exit 0, with conservation, exact twins, saved continuation
and 500 pure-observer checks per world. Forest made and ate two dried and two
smoked fish; river's rack layout lost its footprint claim and produced none.
Forest paid one wood, 123 operating person-ticks, 611 operating-travel ticks,
and additional supply/retrieval labour in the retained report. Nine withdrawals
failed with nothing left to take; five operate starts were interrupted.

Check11 `npm test -- --maxWorkers=8` exited 1: 416 passing files, 13 failing
retained review files; 2,500 tests passed, 31 failed, three expected failures
(372.04 s). These are the same 31 baseline-reproduced failures recorded above.
Fresh `npx --no-install vitest run tests/preservation.test.ts tests/transport.test.ts
tests/v121_continuation.test.ts tests/v122_continuation.test.ts` passed 35 tests
in four files (exit 0). Fresh `npm run typecheck` and `npm run build` both exited
2 on the two retained nullable review-test errors above. Logs:
`survival_evidence/resume-20261104/`. The check9 success and rain-pause screenshots
were inspected again; rendered files match the frozen source. No full-command
green claim is made. Mechanism/turn integration and bounded use are established;
reliable uptake and causal survival benefit are unproven. Carcass/fat connections
and final programme measurements remain required.

## 2. Indoor heating — rules 123 implemented; bounded ordinary activation

The existing in-place construction path fits a hearth into an owned solid home
for one wood, two stone and 160 work. It does not repair the home. Installation
starts cold with no fuel. Existing material acquisition, hauling, building and
`fuel_fire` activities supply and tend it; no separate inventory or scheduler.
Each fuel unit takes 24 work and contributes the existing 380 burn ticks for
wood or 190 for recovered offcuts. Capacity is 1,520 ticks. One tick burns per
world tick; heat rises by 0.08 degrees per burn tick, up to 18 degrees, while
losing 0.004–0.010 of its current value according to building condition.
After exhaustion only cooling remains. Heat reaches actual occupants through
`needs.ts`; outdoor fire heat remains excluded indoors.

Choices use known household homes, personally felt cold/current local weather,
unreserved carried fuel and independently dated indoor fuel observations.
Exterior sight reveals the fitting but never refreshes remembered thermal state.
Existing wood/offcut acquisition connects the cold-home cue to the next fuel
trip. The lab ablation `rich-no-hearth` suppresses new choices; existing paid
fittings keep burning and cooling. Old saves gain no fitting or heat, and malformed
new thermal state is rejected. Destruction removes the fitting; interrupted work,
competing tenders, full storage and excess materials settle physically.

The final focused command covers hearth, habitation, preservation and immutable
rules-122/123 continuations: 61 tests in five files passed, exit 0. The exact-full-
pack correction was then checked by all nine hearth tests (exit 0). Typecheck and
build each exit 2 solely on the two retained nullable review-test errors described
above. Logs: `survival_evidence/resume-20261104/hearth-*`. Rules 123's immutable
reference was captured before introducing any successor behaviour.

`scripts/browser/hearth_check.mjs` runs through the supported CUA tab API, with
six passing assertions in `survival_evidence/hearth-check2/rendered-report.json`.
It checks actual fuel work, occupancy, heat, exhaustion, conservation, pure UI
and exact saves. Success/failure screenshots were inspected. The first script
launch using direct CDP was blocked by automatic approval review; the supported
API replaced it. A first supported run found a collapsed inspector; its failed
report is retained, and the setup now explicitly opens the inspector.

Frozen `hearth-check1` retains the first candidate. `hearth-check2` adds correct
project completion, capacity-safe excess material handling, and observer-only
construction/hunting/exposure counters. Both 25-day Normal arrivals-on runs
completed at tick 60,000, exit 0, with conservation, exact unobserved twins,
save continuation and 500 pure-observer checks each:

| Observation | Forest | River |
|---|---:|---:|
| Hearths remaining | 7 | 6 |
| Fuel activities started / completed / interrupted | 42 / 33 / 9 | 64 / 47 / 17 |
| Fuel units consumed (wood/offcuts) | 59 | 87 |
| Fuel tending work / travel person-ticks | 1,429 / 1,538 | 2,135 / 2,770 |
| Hearth construction work person-ticks | 3,788 | 5,126 |
| Occupied ticks receiving heat | 48,228 | 87,594 |
| People alive at day 25 (descriptive) | 2 | 23 |

Failed layouts, missing building materials, changed ownership, interruptions and
unfinished projects remain in the reports. These runs establish paid construction,
renewed fuel supply and actual occupied heat, not reliable survival benefit.
Forest's five hunting pursuits produced three actual strikes, all failed; river
had no selected hunt. Sampled visible deer / eligible hunt offers were 146 / 38
and 59 / 8 respectively; samples are not unique opportunities. Child-exposure
episodes include travel outdoors and rests under lean-to cover. No transport
repair is inferred from a death label or added in this increment.

After freezing, save validation was strengthened so a missing fitting marker
cannot turn a cheap hearth site into a home rebuild; cost key ordering remains
valid. The ten hearth tests plus both predecessor references passed (12 total),
and construction/home replacement/save/township/hearth regression passed 51 tests.
All 269 checked runtime/config/observer files match frozen check2 except this
validation-only difference and the rules-version comment. Both final saves load
byte-exactly under the final validator and continue with conservation. Evidence:
`hearth-check2/source-comparison.json` and `current-validation.json`.

The broader check1 run exited 1: 416 files passed, 14 retained review files failed;
2,505 tests passed, 33 failed, three expected failures (513.66 seconds). The two
additional famine diagnostics lacked their historical input in the frozen tree.
Supplying the exact original fixture (matching SHA-256) made both pass in a focused
rerun; the other 31 are the previously reproduced review failures. No full-green
claim is made. Verdict: **TURN_INTEGRATION_VERIFIED** for the bounded hearth chain;
aggregate benefit and the remaining five families are unverified.

## 3. Clothing and bedding — pending

Complete plant-fibre acquisition and actual finite protection first; hide branch
remains pending until stream 4 supplies and prepares hides.
Source audit found no existing fibre resource. The selected implementation route
is bast fibre processed from physically gathered wood at the existing timber
yard, followed by fibre equipment recipes there. This is an implementing-agent
design choice, not a new owner decision. Reuse the durable equipment registry for
identity, condition, holders and transfers; add explicit wetness and equipped/laid
state, bounded to one garment/blanket per person and actual bedding places. Do not
use cosmetic Look fields. Exposure instrumentation now records the child's actual
location, action, cover and household situation before selecting any care repair.

## 4. Carcass recovery — pending

Trace ordinary hunting failures before changing decisions. Complete finite
butchery and meat/hide/fat consumers, then rerun streams 1 and 3 integration.

## 5. Traps and nets — pending

Two paid physical gear routes; no timer-created animals or rerolled catches.

## 6. Domestic animals — pending

Species decision awaits source inspection. Account for recurring output and all
human food, water and labour diverted, including adverse outcomes.

## 7. Body reserves — authorised, pending streams 1–6

Before implementation, record the chosen finite capacity, efficiency, expenditure
and maximum added food-free tolerance under reference conditions. A meal pays
immediate need and reserves once. Birth, arrival and old-save defaults confer no
unpaid full reserve; thirst, exposure and injuries retain their consequences.
Test feeding histories, paid recovery, the tolerance bound and exact persistence.

## Final measurement — pending

Compare completed streams 1–7 with the verified starting baseline and reserves
with their immediate predecessor using the
retained P0.1c forest design: 25 draws per condition, matched arrivals-on settings
and declared horizon. Verify retained baseline provenance/completion before use.
Use the documented cross-version comparison, never bypass `gates.ts` rules-version
validation. Include food loss, exposure, fuel/feed/labour and displaced care/work;
bounded activation, reliable uptake and measured benefit remain separate claims.

Declared comparison design (before final treatment results): Normal, arrivals on,
through day 25 (the second winter ends at day 24), 25 draws each in forest, river
and meadow. Per seed: one control; nudges 1–8 at day 4; nudges 1–4 at days 2, 3,
5 and 6. `scripts/survival_ensemble.ts` uses the existing lab nudge operation and
collects whole-horizon age-specific hunger/exposure, ledger, time budgets and
unfinished material/work. These draws share prefixes; do not describe them as
75 independent worlds. Compare within each seed and report the limits of three
terrain/seed contexts. The baseline is frozen at `61cb6e5` with only this observer
runner added. Its forest control reproduced retained P0.1c's hash `ae96c7d7` and
four survivors exactly, with conservation and exact save/continuation checks.
The `b5694c7..61cb6e5` difference is documentation only. Baseline cohort work and
launch status are in `survival_evidence/aggregate-baseline/`; do not infer the
remaining draws completed merely from their launch.
