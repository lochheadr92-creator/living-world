# Food care when the recipient's pack is full — rules 63

The rules-62 ordinary runs retained many zero-receipt full-pack gifts. Removing the false fed cooldown made that failure
truthful but did not provide an alternative. The staged full-pack injured elder reproduced the missing transition: after
the failed hand-over, the helper had no care deposit option although their household home was known and empty. The first
new contract failed on that absent option (`autonomy-care-capacity-before.log`). Rules 62 was pinned at `3e25e18` first.

## Expected contract and boundaries

A personally failed food hand-over to a household dependant may lead to a physical deposit at a remembered household
home near the recipient's last known location. The existing home-store meal then lets the person eat even with a full
pack. Expected failure: no known usable store, a full store, changed ownership, promised food, urgent helper needs or an
interrupted journey must not fabricate space, receipt or a meal. No new entrance permissions or remote inventory access.

`care_capacity.ts` owns the recovery choice and its bounds. `social.ts` records the existing personal `failures` entry only
after an actual zero-receipt care transfer with food still held and no capacity for that food. It does not learn this from
another person's inventory during planning. There are at most six such entries per helper, with a 600-tick operational
window; expired entries do not influence choice and are pruned on another capacity failure. Unrelated memories remain.
The existing saved failure record retains recipient ID, tick, count and reason. No general new memory store is introduced.

`options_work.ts` offers an ordinary `deposit` after this failure, using remembered ownership, condition, contents and
location. Its reason explicitly names the failed hand-over. A home already believed to hold food needs no repeated trip.
During the brief capacity-memory window, the food hand-over is suppressed; a separate water hand-over remains available
and uses thirst urgency. Expiry permits another ordinary contact attempt; it is not proof that the pack has emptied.

The helper retains one food portion (two below hunger 55), two for each other dependant, meal commitments and reserved
goods. Hunger below 40, thirst below 30 or energy below 20 precludes this additional trip; existing relief/critical filters
still apply. `act_resource.ts` revalidates the home's actual existence, condition and household, the intended household
member, and available food at execution. Capacity still belongs to the ordinary transfer. Already-started work keeps
these safeguards if the lab disables future recovery offers. Interruption leaves goods where they physically are.

The first physical chain revealed a second defect: `options_survival.ts` counted only berries, fruit, grain and fish when
deciding whether a known store held a meal, although the existing meal handler could consume bread and meat. Rules 63
uses the existing all-food count for this store-meal decision. It changes neither nutrition nor carrying capacity. Other
legacy four-food counts remain separate diagnostics, not silently rewritten by this change.

The existing actions remain available through the AI's legal offer path; observation version 12 explains the personal
reason without exposing private recipient state. No save-format or protocol version changes. `rich-no-care-capacity`
removes this recovery memory, option and all-food store recognition together; older rules retain their exact behaviour.

## Physical, saved and rendered checks

Fourteen contracts in `tests/care_capacity.test.ts` cover actual failure → changed option → autonomous physical deposit →
autonomous table meal, full load preserved, intermediate save equality, conservation, observer/AI purity, personal-only
memory, old rules and ablation, unknown/full/stocked homes, reserve/expiry limits, changed ownership/commitments and
interruption. A false capacity belief is not written when the donor loses the food before handing it over.

Fresh review found a food-only trip borrowing urgency from thirst. `tests/care_capacity_scoring.test.ts` first failed
(48.305 versus the hunger-only 33.905), then passed after separating those pressures. This is a resolved implementation
finding, not a balance claim. An earlier test incorrectly expected all relationship state to remain absent during physical
contact; ordinary familiarity legitimately forms. It now compares with the same rules-62 failed contact, proving no added
trust penalty/reward from the new failure memory. The real contact behaviour was preserved.

Final focused care/scoring check: **15 tests / 2 files**. The broader care/habitation/delivery/predecessor check passed
**50 tests / 5 files** before the final scoring refinement. Final full suite: **1,536 tests / 229 files**, 162.20 seconds
(`autonomy-full-tests63-final.log`); typecheck/build pass. Build output is 936.95 kB, with the existing chunk-size and native
loader notices. The earlier full suite (1,535 tests) and pre-review meadow budget stop remain retained, not substituted for
the final source checks.

`scripts/browser/care_capacity_check.mjs` passes **6/6** checks. The staged initial legal gift is selected externally; the
recovery deposit and subsequent meal are autonomous. Ada #2 records Eli #4's failed receipt at tick 13, chooses to leave
two bread at home #5, physically leaves them while retaining one, and Eli later eats at the store without emptying his
pack. The imposed full-store change after departure fails with the bread still carried. Screenshots show the helper at
the door, the actual deposit progress and reason, indoor eating, and the preserved failure. Final artifacts are in
`autonomy_evidence/care63-rendered-final`; the first rendering and scoring-review evidence are retained separately.

## Ordinary scope and remaining gaps

Ordinary runs use fixed Normal meadow/river/forest, immigration off, 45 days, a 170-second per-segment budget, and unchanged
saved continuation after a budget stop. The capacity trace observes the following five days with an unobserved twin,
without selecting actions. Its denominators are repeated person samples with an actual recent capacity failure, legal
options, starts, physical deposits and intended-recipient same-kind table meals. A deposit is not a direct gift, and does
not award recipient gratitude or a fed cooldown. Later fungible food consumption is not a unique-unit identity claim.

Results are recorded in the programme register alongside the explicit budget stops. No aggregate improvement, population
viability or ordinary frequency claim follows from the staged success. Full water packs, outside-recipient contact,
temporary incapacity duties, home loss and the wider household workstreams remain open. A fresh diagnosis also reproduces
required-hammer demand being displaced by an optional saw; the concurrent branch's repair must use a new version here,
because its historical rules-59 label collides with this lineage's cart priority.
