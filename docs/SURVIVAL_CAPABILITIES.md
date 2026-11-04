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

## 3. Fibre clothing — rules 124; ordinary use observed, later materials remain open

New capability: inhabitants make, carry, ready, dry and mend owned insulation;
carers can physically deliver a spare garment to a visible dependent. The same
chain gives timber yards, supply plans, personal stock knowledge, indoor heat
and existing delivery/estate handling useful additional work. Look stays cosmetic.

Parameters: one wood and 60 work yields three bast-fibre bundles at a timber
yard. A garment or blanket takes three fibre and 100 work; a bedroll takes four
fibre and 100 work. Readying takes 20 work. One readied garment gives at most
6 degrees; one blanket and one bedroll each add at most 4, only while their
holder actually sleeps. Bedrolls are personal carried bedding, not building
bonuses. Spares add no heat. Weights are 0.75 garment/blanket, 1 bedroll and
0.25 fibre. Condition scales protection linearly; fully wet gear loses 80%.
Exposed rain adds up to 0.0008 wetness/tick; shelter reduces wetting. Dry weather
removes 0.0002/tick, plus 0.00003 per actual indoor hearth degree. Active use
adds 0.002 wear/tick (50,000 continuous ticks without repair). One unreserved
fibre and 60 work repairs 35 wear, capped at new condition. Transfers clear the
readied slot; wear-out destroys and accounts for the actual item.

The exposure trace showed outdoor travel, lean-to cover and cold carers, not a
proven missing child-transport mechanism. Child delivery therefore uses existing
physical give/travel/capacity checks and bounded failed-delivery memory. Receipt
does not count as feeding. A visible dependent without a garment supplies demand
when already cold or when observed weather is below 12 degrees, matching the
adult preparation threshold. Children can ready, but cannot manufacture or mend.

Twenty-two focused tests cover offered paid production, two-batch bedroll inputs,
child preparation/delivery, sleep-only protection, slots, wetness, repair,
interruption, full packs, competitors, death/recovery, exact saves, strict state
validation and observer purity. Clothing/planning/legacy/predecessor checks
passed 45 tests in six files (6.39 s); the subsequent child-weather correction
passed 28 in four (6.92 s). Immutable 122/123 references remain unchanged.
Typecheck7 and build3 exit 2 only on the two retained nullable review-test errors.
Full check2 exited 1: 417 files/2,518 tests passed, 15 files/33 tests failed,
three expected failures, 802.32 s. Beyond the 31 baseline failures, it exposed
an old-protocol recipe-catalogue mismatch (fixed by rules filtering) and a
120-second tool-report timeout; both unchanged files then passed (three tests,
61.98 s). Check4's broader suite exited 1 after 424.09 s: 419 files/2,526 tests passed,
13 files/31 tests failed, three expected failures. All failing files are the
retained baseline review cases; no additional failure recurred. Logs are retained under
`survival_evidence/resume-20261104/clothing-*`.

Rendered `scripts/browser/clothing_check.mjs` passes seven assertions, including
paid production, actual dry/wet protection and a real no-fibre repair failure.
Inspected screenshots and results: `survival_evidence/clothing-rendered-access/`.
No aggregate survival benefit is established.

Successive frozen ordinary candidates remain under `survival_evidence/clothing-check*/`:

| Candidate | Forest, 25 days | River, 25 days | Scope |
| --- | --- | --- | --- |
| check1 | 3 garments; 50,808 adult protection ticks; 0 survivors | retained report | Before persistent batch-plan connection |
| check3 | 4 garments; 79,156 adult protection ticks; 2 survivors | 3 garments, 1 blanket; 502 blanket sleeping-use ticks; 27 survivors | Before usable-stock correction |
| check4 | 6 garments, 1 blanket; 125,591 adult and 36,210 elder garment ticks; 540 blanket ticks; 1 survivor | 4 garments, 1 blanket; 69,707 adult garment ticks; 2,284 blanket ticks | Dated personal stock; no bedroll or child use |
| check5 | 9 garments, 2 blankets; 16,831 child garment ticks; 13 survivors | 4 garments, 1 blanket; 69,707 adult garment and 2,284 blanket ticks; 27 survivors | Adds child preparation; before loaned-garment gift correction |
| check6 | 10 garments; 188,737 adult, 21,968 elder and 9,118 child protection ticks; one repair; 7 survivors | 4 garments, 1 blanket; 69,707 garment and 2,284 blanket ticks; 27 survivors | Owned, individually selected garment deliveries |

Completed check3/4 runs pass exact unobserved twins, save/120-tick continuation,
conservation and 500 pure-observer checks each. Check4's 146 forest bedroll work
offers establish opportunity, not completion. Check5 establishes ordinary child delivery and use. Bedroll use remains an
open acceptance issue; 50-day meadow/fern/aspen searches are running. A started
run is not completion evidence.

The check2 trace `fibre-failures.json` established repeated attempts to use three
fibre earmarked for somebody else: total stock was observed without its access
limit. Current rules store a dated, observer-specific usable count for the four
new textile goods alongside physical totals. Hearing another person's count
does not grant access; execution still checks actual ownership. This also lets a
maker prepare another fibre batch instead of treating reserved inputs as theirs.
Old material paths retain their semantics. The check5 delivery trace exactly
matches the forest final save and records nine attempts: one success, two
interruptions, six refusals. A second trace establishes that the refusal at
36040 was a loaned garment (#12309, due 38337), despite sufficient recipient
space. Check6 offers only owned, unloaned spares and binds the saved delivery to
that item. Losing it fails explicitly, without substituting worn or borrowed
gear. The existing transfer path now accepts an optional exact tool identity;
other callers retain their behavior. New red/green ownership tests and related
tool/estate/predecessor checks pass 35 tests in three collected files (6.16 s). Typecheck8
still has only the two baseline nullable errors. A final ownership audit also
covered direct lending, returns and rack checkout: textiles now retain capacity
limits and arrive unready. Those paths passed 39 tests in four actual files
(8.25 s), including `tool_transfer_records.test.ts`. The immutable rules-124
reference is captured and passes (1/1, 9.29 s); never regenerate it. Final
malformed-batch/fibre validation rejects missing paid inputs, shortened work
and invalid quantities. The resulting clothing/workshop/transfer/124-reference
suite passes 53 tests in four files (7.96 s); final 122/123 references also pass.
Typecheck10/build5 retain only the two existing nullable errors. Check6 broad
regression: 419 files/2,531 tests passed, 13 files/31 baseline tests failed,
three expected failures (472.04 s). Hide and possible wool routes
await streams 4 and 6.

Final source replay (`clothing-final-replay/audit.json`) matches both observed
check6 final saves byte for byte, initial hashes match, all source files match
the final tree, and exact load/continuation/conservation pass. The first replay
harness attempt failed creating its output directory after simulation; those
failed logs remain. The corrected harness creates a fresh directory first.
Check6 costs: forest 11 completed fibre batches from 11 wood, 10 completed
garments, 1,683 operation-work ticks and 1,736 operation-travel ticks; river five
fibre batches from five wood, five textiles, 831 operation-work ticks and 406
operation-travel ticks. Collection, gathering, giving and interrupted attempts
are separately retained in the reports; these are not total lifecycle costs.

Expanded check5 searches retained nulls: fern 50 days made 10 garments and one
blanket; aspen made 10 garments. Neither made bedding. Meadow made a bedroll
but it still waited at the yard at day 50. The later mixed-candidate meadow
continuation recorded 1,958 adult bedroll protection ticks (6,622.278
degree-ticks); the check6 fern 100-day light scan recorded 16,384 adult bedroll
ticks (53,152.198 degree-ticks), without the full observer's twin/purity sampling.

The fresh final-124-source meadow run now closes that provenance gap:
`clothing-check7/meadow-60d-fresh` ran from birth to tick 135,480 before its
1,200-second wall budget, and `meadow-60d-fresh-continuation` continued that
exact save to tick 144,000 on the same frozen source. Both pass exact twins,
save continuation, conservation and sampled purity. The two segments record
568 + 1,390 = 1,958 adult bedroll protection ticks and 6,622.278 degree-ticks.
This establishes ordinary sleeping use, not survival benefit. The obtainable
fibre routes now have observed garment, child-delivery, blanket and bedroll use;
ordinary hide/wool routes remain open below.

## 4. Carcass recovery — rules 125; core use observed, hide/fat uptake open

Hunting was traced before changes: rules-123 forest recorded five pursuits,
three failed strikes and two interruptions; river recorded no starts despite
59 visible-deer samples and eight eligible offers. Neither deer supply, hunt
utility nor strike probability changes. The prior instant reward (four meat
plus party additions) is replaced by exactly one physical body.

Agent-selected parameters: four meat, one hide and one fat per deer regardless
of party; 120 paid work per recovered unit; 4,800-tick decay deadline and
120-tick cleanup of empty remains. `carcass.ts` owns partial work and live
claims. `Pile` holds origin, access, remaining/recovered/lost parts; `economy`
counts them once. Dated observations expose remembered parts, never loose food
or remotely refreshed inventory. Actual recovery checks reach, household,
claim and capacity. Interrupted work remains paid; two workers cannot take the
same last unit. Ordinary deposits into bodies and loose withdrawal are refused.

Hide plus one fibre takes 160 work at a timber yard to make an owned garment
with saved hide provenance and the same bounded insulation. Raw fat is
inedible; one fat and one wood take 60 work plus 180 elapsed processing ticks
at a food rack to produce one rendered fat (24 hunger, weight 0.5, spoil
multiplier 0.25). Hide/fat spoil in packs and stores. Rendered fat enters the
existing food, sharing, granary, care, carrying and provision paths.

The actual offered-action tests cover hide recovery → delivery → sewing →
collection → wearing and fat recovery → delivery → rendering → collection →
eating, plus interruption, last-unit contention, capacity, ownership, expiry,
observer purity and malformed saves. Final focused carcass + immutable
122/123/124 checks pass 19/19; affected estate/leftover tests pass. The new
immutable 125 reference is captured before successor behaviour and passes.

Fresh review repaired four concrete gaps: heavy-work needs costs; remote
refresh on interrupted travel; unavailable new recipes contaminating older
rules' blocked options; generic deposits making mixed body/loose storage.
The deposit defect has retained red/green evidence. No historical reference
was regenerated. Stable broad check2: 421 files pass, 13 fail; 2,549 tests pass,
31 fail, three expected failures. All 31 failing test names match the prior
clothing run (`carcass-failure-comparison.json`). The broad run predates final
labels/deposit guards; focused checks cover those changes. Full typecheck and
build still fail only on the two existing untracked nullable review tests.

Staged rendered checks pass eight assertions; visually inspected
`carcass-rendered-check1/carcass-success-visible.png` and
`carcass-failure-visible.png` show paid recovery and real expired-body refusal.
Initial stale-painted captures and the stopped check1/mixed-source broad run
remain preserved, explicitly superseded rather than counted as acceptance.

Normal arrivals-on observed runs (`carcass-check3`): forest25 has three failed
strikes and no body; river25 has no hunt starts and no body. They finish with
seven and 27 alive respectively, descriptively. Final deposit-guard source in
check4 reproduces both final saves byte-for-byte (`replay-audit.json`). Fern60
records one body: Wilma recovers hide at 17,930, Juno recovers meat at 22,383
and eats it, Cass loses a live-claim race. Three meat and one fat decay; the
recovered hide also eventually spoils. Wilma had not discovered the existing
yard at day 10 and died of thirst at 28,589. Observer counts: three butchery
starts, two successes, one claim failure; 151 sampled travel and 238 sampled
work ticks. Boundary sampling is not an exact labour invoice. All three runs
pass twins, final +120 continuation, daily conservation and sampled purity.

The diagnostic `carcass-fern-first-body-trace` retains competing choices.
Current-source fern60 replay is byte-exact. Aspen100 records one further body
and one meat eaten, with other parts lost; meadow100 records no bodies. The scans check source stability, conservation and final
continuation but lack decision samples/every-tick twins. Ordinary hide garment,
rendered-fat and preserved-meat use remain explicit gaps, to revisit as the
following input routes develop. No survival improvement is claimed.

## 5. Traps and nets — rules 126 core; trap-site connection open

Rules126 adds made, carried, deployed and checked gear. Agent-selected costs:
net three fibre/two wood, deadfall trap three fibre/four wood, each180 work at
the timber yard. Placement80 work, wait600 ticks, check40, reset40. Each set
wears10 condition; deployed repair60 work/one fibre restores40. Existing carried
gear mending remains available through its paid equipment route. One deployment
per kind per household. Nets transfer up to two unreserved fish from the actual
source; traps attempt one actual nearby deer (range4, deterministic chance.55)
and use the single carcass path. No added deer or changed hunting utility.
Catches face existing ground spoilage and a1,200-tick expiry; gear abandoned
48,000 ticks is lost and ledgered. The inspector exposes ownership, condition,
waiting, catch, empty and broken state. Equipment/piles and existing activities,
recipes/production/facilities own the route; no parallel inventory or scheduler.

Fresh review repaired lost retrieval memory, household deployment limits,
setter-death dependence, premature saved attempts, and full-pack gear loan,
return and rack pickup. Initial ordinary runs showed made but unused gear:
forest2net/1trap, river1net, no placements. A foreign borrowed net in the forest
save exposed an ownership mismatch. Tests reproduced collection of a foreign
record ahead of one's own and counting unusable foreign shelf stock. Personally
observed `gearStock`, selecting the owned record on collection and retaining
ownership when storing gear repaired that path. Evidence remains in
`gear-check1/`, `gear-ownership-trace/` and the red/green logs.

Current ordinary Normal arrivals-on forest/river25 observations are in
`gear-check3/`; final source with the added loan capacity guard replays both
byte-exactly (`gear-check4/replay-audit.json`). Both observed runs have exact
unobserved twins, save+120 continuation, conservation and500 pure samples.
Forest made2nets/1trap and placed all3:2fish caught, none collected, no trap body.
River made3nets, placed2, caught8fish, collected2 and demonstrably ate both from
net-origin-only packs. No repair occurred in those windows. Gear activity
samples total forest3,239 travel/1,092 work, river3,056 travel/1,049 work ticks;
check completions12/11 and reset completions9/10. Interruptions and one river
check arriving during a newly reset window are retained. The sampled production
ticks describe activities labelled for gear; resumed other batches can differ,
so these are not an exact gear-manufacture invoice. Day25 populations3/25 are
descriptions, not survival benefit claims. A longer fern60 run remains active.

Focused current checks:20 gear contracts;46 passes in4files including clothing,
physical transfers and predecessor125. Six affected knowledge/transmission/save/
workshop/flood files pass60 tests. Frozen broad check2:423files/2,566tests pass,
13files/31tests fail and3expected failures,710.24s; every failure name matches
rules125 (`gear-failure-comparison.json`). Broad scope predates stock/loan fixes,
which have the later focused/affected coverage. Full typecheck8/build4 still fail
only the two preserved nullable review-test errors; standalone Vite bundle passes
(with its existing large-chunk warning). Browser check2 passes7 assertions and
its inspected broken-net image is `gear-rendered-check2/gear-failure-visible.png`.
Immutable126 is recorded and passes, source digest
`7387ea83e0806df4aea2bbfc5b7a72873ff9653747849aef5ec1c4879e366d34`.

Trap ordinary use remains open. A same-trajectory forest diagnostic starting
from the36k save found its next attempt at36,845 had all three deer19.6–27.6
tiles from the selected tree (`gear-trap-attempt-trace/`). Choosing any nearby
tree fails to connect placement to witnessed wildlife. Continue this family
with a bounded dated deer-sighting-to-trap-site link under the next rules version;
retain scarcity, catch chance and hunting behavior. Do not claim all seven
families complete. Deferred ordinary hide/fat/preserved-meat use remains open.

### Trap-site connection — rules127 candidate

The forest126 trace motivates a bounded memory link, not more deer or stronger
hunting. People retain up to four dated deer sightings through actual perception
and the existing belief system. Newest dates/IDs retain a deterministic bounded
set. A trap is commissioned and placed only when a known tree is within six
tiles of one of those sightings; newest sightings are tried first, then the
closest qualifying tree. Memories can be stale: choices do not inspect current
hidden animal locations. All126 work, catch chance, ownership and loss remain.
The goal names the dated sighting without asserting it was personally seen when
it could have been reported. Older rules preserve their original behavior.

Initial tests reproduced nearest-tree placement and unnecessary trap demand.
Current six contracts cover observed/unobserved animals, bounded memory, exact
saves/purity, old-rule refusal, actual offered placement through a caught body,
and demand eligibility. The126 reference caught an accidental saved-goal change;
it was corrected in source, never regenerated. Staged browser proof shows no
site before observation and one real deer becoming a finite body and one eaten
meat (`trap-ground-rendered-check1/`). These do not prove ordinary uptake.

Frozen trap-ground-check1 forest/river25 runs predate the final demand link and
neutral goal wording; preserve them as candidate evidence. Frozen check2 holds
current source for forest/river25 and the affected test run. The earlier main
`trap-ground-affected.log` is not accepted as stable-source evidence because
source changed while it could still be active; its scope note preserves that
limit. Typecheck1/build1 still show only the two existing review nullable errors.
The current127 affected run passed70tests/10files in64.45s. Typecheck2/build2
retain only the two unrelated nullable review errors. Reference127 was captured
before the successor fix (digest9100b98c82e47eed8221a9d2ba8c51070e297167d32d5fc855429ac466e8b39a);
its test and126 plus six feature contracts pass8tests/3files. Never regenerate it.
Rendered check2 passes6assertions; the settled screenshot is
`trap-ground-rendered-check2/trap-food-visible.png`.

Fresh review classified a RUNTIME_LOGIC_BUG: check1 forest's trap owner924 switched
grounds547->562->589->569 between39115and39319 without completing a placement.
`currentUtility` treats an omitted current option as zero. A moving deer replaced
the only offered ground, so the next review discarded the journey. A focused
regression reproduces the missing option. Rules128 now retains at most the one
already-selected, still-known tree beside the newest alternative, scored normally.
It grants no sticky commitment or utility increase: critical thirst still interrupts.
The saved activity already holds the selected place and original dated goal;
no new beneficial save defaults or remote animal reads are needed.

`trap-ground-kept-red.log` has the expected assertion failure. Final focused
`trap-ground-kept-path2.log` passes37tests/5files, including both immutable126/127
references, paid placement after the sighting moves, exact save and critical
thirst interruption. The intermediate path failure was a fixture missing the
ledger entry for an added tree; corrected without changing runtime or assertions.
Frozen check3 is current128 source for new forest/river25 runs. Check1/2 remain
127 evidence, not128 acceptance. Full128 command results, ordinary activation,
reference128 and commit were initially pending. The captured128 reference now
passes, including the retained journey after the deer moves; digest
f031d7d052d73eb535a7952b1ab08d780d1a0816b2ac9127d3c616918a30ddb2.
Final focused reference/gear set:30tests/5files,6.78s,exit0. Typecheck4/build4 each
exit2 on only the two existing nullable review files; standalone Vite bundle
passes. Rendered check4 has8passing assertions, and both settled success/failure
images were inspected. The trap inspector distinguishes a present body, a body
no longer here and no catch, and reads actual remaining decay time; it does not
label trap outcomes as fish.

The48,000-tick forest manufacturing diagnosis (`trap-ground-demand-trace/`) is
observer-only and has no every-tick twin/source-change guard. It records5,859
person samples,2,101 with prey and qualifying ground,1,539 with trap demand;
only one sample had an offered key matching trap manufacture/collection or gear
placement. The sample filter includes net placement, so this last count does
not establish a trap-manufacture offer. Most recorded top choices concern
immediate needs. This does not justify lowering costs or boosting utility.
Meadow and aspen60-day runs are underway in final-source frozen check4 to test
ordinary completion under different available work/supply histories.

127 final-candidate forest25 ends10alive, river25ends27alive; neither made a trap.
Forest made4nets,placed1,caught1fish,none collected; river made2nets,placed1,
caught6,collected1,no directly attributed meal. Both exact twins/save+120,
conservation and500pure samples pass.128forest25 likewise ends10alive; its
river25 is still running. These are bounded observations, not benefit claims.
The preceding126fern60 now completes28alive,72caught30collected22direct meals,
13successful repairs,7full-pack partials and2trapplacements/0trapped bodies.
Final126source replay is byte-identical (`gear-check4/fern-60d/replay-audit.json`).

The dated-ground/retained-journey mechanism is implemented and tested, while
ordinary trap-to-food completion is still open. Its frozen measurements can
continue while the next single behaviour stream is developed. No family-wide
completion or survival benefit is claimed.

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
The `b5694c7..61cb6e5` difference is documentation only. All 75 baseline draws
completed and passed `survival_evidence/aggregate-baseline/final-audit.json`:
matching source manifests, within-seed initial hashes, final save hashes,
conservation and recorded exact continuation; all 25 forest hashes match P0.1c.
Day-25 survivor distributions (25 per seed): forest mean 5.56, median 5, range
0–15; river mean 20.72, median 20, range 11–32; meadow mean 29.8, median 30,
range 23–36. These are baseline descriptions, not programme benefit.

The original PowerShell launcher stopped after 61 starts on a locked status
file; its children completed. Most original process exit codes were unavailable,
so retained results were validated directly. The replacement launcher
(`ec9857a`, `scripts/survival_cohort.mjs`) validated those 61 results and completed
14 remaining draws with explicit exit 0 records, then exited 0. Its status-file
write is replaceable and nonfatal. No incomplete run was treated as a success.
