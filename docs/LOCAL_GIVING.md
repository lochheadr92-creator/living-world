# Local hand-overs — rules 62

The existing care action could select a hungry, injured resident in the same home, then force the helper outdoors before
handing anything over. The correct interior guard consequently rejected the gift. Separately, a recipient moving away
after contact could still receive goods, and a full pack with zero receipt was marked temporarily fed.

These are reproduced runtime defects, not a reason to remove entrance, contact or carrying restrictions. The rules-61
ordinary/tool-loss/indoor-care reference was captured and committed at `d22f89b`, before changing behaviour. The failing
diagnostic remains `scripts/indoor_care_diagnostic.ts`; the staged residents and provisions are explicitly labelled.

## Contract and ownership

From rules 62, `habitation.staysIndoors` permits an existing `give` action when both living participants already occupy
the same valid home. `activities.ts` passes the world to that existing lifecycle check. No guest admission or through-wall
handoff is added. `social.ts` checks physical range on every work tick and only sets the fed cooldown after positive
receipt. Existing transfer, carrying capacity, partial quantity, personal contribution, mood and commitment accounting
continue to own their effects. `local_giving.ts` owns the shared rules gate; `rich-no-local-giving` restores the three old
behaviours together. No save or AI-protocol schema changes are needed: the action still uses the existing legal offer.

Expected success: an adequately supplied resident autonomously chooses to help an injured elder in the same room,
physically transfers non-berry food, and the elder later eats it through ordinary choices. Expected failures: no receipt
through a wall, after the recipient moves out of range, or into a full pack. One free unit of capacity admits one portion,
not the whole offered bundle. Failure does not create food, enlarge a pack or claim someone ate.

## Mechanism and rendered evidence

`tests/indoor_giving.test.ts` passes seven contracts: autonomous indoor bread receipt and eating with an intermediate save,
old rules/ablation, partial capacity, outside helper, full-pack cases inside/outside and loss of contact during work.
Focused care/habitation/delivery/tool regressions passed **51 tests / 5 files**. The full unchanged simulation source
passed **1,520 tests / 226 files**, 295.37 seconds (`autonomy-full-tests62.log`). This includes historical continuations,
replay and purity contracts. The elder's staged rest has a 500-tick minimum: the chain allows its ordinary later review
and hunger interruption rather than cancelling rest to make a quick meal appear.

`scripts/browser/indoor_giving_check.mjs` passes **5/5** checks, with screenshots in
`autonomy_evidence/care62-rendered-final`. The positive care decision and later eating are autonomous in a staged world;
the negative case externally selects a legal offered gift. The first screenshots in `care62-rendered` exposed overlapping
roof labels. `renderer.ts` now draws one count per occupied home and the selected resident's actual handing-over/eating
state, with their name separately above it. It derives a bounded per-frame resident grouping and never mutates the world.
Final hand-over, eating and full-pack screenshots were visually inspected. Post-display checks passed **8 tests / 2 files**
(viewer purity and indoor giving); typecheck/build passed. The existing native-config notice and 933.27 kB bundle warning
remain. The world displays occupancy and activity, not an invented cutaway interior animation.

## Ordinary occurrence and costs

Fixed Normal meadow/river/forest, immigration off, rules 62. Each initial run declared 45 days and a 170-second budget.
Meadow and forest reached day 45. River stopped at tick 99,960 (day 41.65), then its unchanged saved world continued another
8,040 ticks to day 45. Both segments and the original budget stop are retained; no settings or state were relabelled.

| Seed / segment | Living-person ticks | Travel | Work | Leisure | Give starts | Different-space endings | Full-pack endings | Seconds |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| meadow, days 0–45 | 3,187,164 | 1,137,250 | 336,674 | 23,823 | 1,790 | 331 | 682 | 149.75 |
| river, days 0–41.65 | 2,924,097 | 1,189,400 | 293,264 | 19,883 | 1,039 | 166 | 220 | 170.11 |
| river, days 41.65–45 | 217,080 | 88,450 | 26,359 | 838 | See segment report | See segment report | See segment report | 14.45 |
| forest, days 0–45 | 2,034,257 | 851,006 | 215,950 | 16,088 | 612 | 59 | 162 | 100.65 |

Reports and source manifests: `autonomy_evidence/r62-{meadow,river,river-tail,forest}`. Conservation and full state/RNG
purity passed: 900 samples per complete 45 days (river split 833 + 67). Carts remained zero. Meadow ended with 30 people,
forest with 9; forest's adverse outcome is retained. These chaotic single-seed runs do not establish an aggregate benefit
or attribute survival differences to this repair. In particular, full-pack retry time remains a real unresolved cost.

The separate observer `scripts/indoor_giving_observe.ts` followed each unchanged day-45 save for five days, without
selecting actions. It counts actual `given` transfers within the same home and the recipient's next same-kind meal within
a day; fungible individual food units are not uniquely traced. Each run compared full final serialized state/RNG against
an unobserved twin and checked conservation. All passed, with 100 pure observations each.

| Seed | Indoor-person samples / offered / eligible | Give starts / same-home starts | Same-home item receipts | Later same-kind meals | Seconds |
|---|---|---|---:|---:|---:|
| meadow | 1,391 / 266 / 164 | 178 / 76 | 20 | 20 | 26.03 |
| river | 718 / 42 / 37 | 121 / 7 | 0 | 0 | 26.56 |
| forest | 387 / 41 / 12 | 25 / 4 | 1 | 1 | 8.87 |

Repeated 120-tick person samples are not independent opportunities; a start can fail or be interrupted, and one gift can
transfer several item kinds. Receipts and meals are distinct counts. Files: `autonomy_evidence/care62-{meadow,river,forest}`.

Ordinary causal example: forest **Zeke #935**, household **933**, chose care at tick **110540** (utility 77.6, above Cole
63.1, water 48 and granary eating 46.7). At **110553** he handed **one berry** to **Talia #937** in home **23610**; she
previously carried none. At **110562** she ate that kind indoors, with hunger rising from **15.7302 to 27.7047**. Cole's
competing care request was outscored. This proves a local hand-over and subsequent meal, not household viability.

Meadow also retains **Hal #1014 → Abel #1015**, household **1011**, home **4582**: one grain at **110602**, after a care
choice at **110589**, and a grain meal at **110611**. River's **zero receipts from seven same-home starts** is preserved.

## Remaining transitions

This closes only the forced-exit, stale contact and false-fed transitions. Full recipient packs still need a lawful
alternative such as a personally known permitted store/shared meal; outside helpers still need actual contact or a
lawful agreed deposit. No claim is made that all different-interior failures should disappear. Warmth, duty coverage,
temporary incapacity succession, ordinary relocation, household viability and the wider programme remain open in
`DEPENDENCY_CHAIN_PROGRAMME.md`. Check current rules and pin this predecessor before any further behaviour change.
