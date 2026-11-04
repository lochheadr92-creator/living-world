# Recover useful retired-branch capabilities

Owner authorization, 4 November 2026: implement and verify useful missing features first; delete the retired branches afterward. This supersedes the preceding cleanup-only stop for this recovery programme. It does not resume unrelated survival tuning. Starting main: f3be2ee2, rules 133. Implementation branch: feat/recovered-capabilities.

## Scope and order

One behaviour stream at a time. Adapt useful code and ideas to the current owners; do not transplant an obsolete engine or replace immutable history. Preserve actor-local knowledge, real costs and finite resources, current-save validation, exact old continuations, and truthful viewer evidence.

| Stage | Recovery target | Source | Current overlap / required connection | Status |
|---|---|---|---|---|
| R1 | Constructed wells | epic-franklin c55926d4, adoring-hawking df9acb9c | Connect a paid local water-access building to existing finite hydrology, drawing, carried water, work and care. No unlimited old seepage source. | implemented and bounded verification complete (rules 134) |
| R2 | Cellars | epic-franklin | Existing storage, spoilage, preservation, household food withdrawal and meals; no free food or remote access. | pending |
| R3 | Stockyards | epic-franklin | Existing hauling, material claims and project supply; must reduce a real handling burden without duplicating inventory. | pending |
| R4 | Managed forestry | epic-franklin | Existing tree regeneration/ecology; obtain material, plant, wait, and cut a finite grown tree. | pending |
| R5 | Mine and separate mill | epic-franklin | Existing finite geology, ore extraction, milling and baking. Recover only distinct paid extraction/processing capacity. | pending |
| R6 | Brewing, furniture and rod review | epic-franklin, adoring-hawking | Beer and shared meals; physical beds versus existing textile bedding; fishing rod versus current fishing/nets. Implement distinct useful connections, not duplicate bonuses. | pending |
| R7 | Personal place memory and grave visits | friendly-planck f133938d, mccarthy d44695d3 | Local danger/death knowledge, travel, grief, decisions and visible history. | pending |
| R8 | Broader learning and building deliberation | mccarthy | Extend existing apprenticeships/technique teaching and bounded civic decisions; no omniscient skill or need reads. | pending |
| R9 | Grave life context and selected visual legibility | survival-legibility 70214c6c, eager-carson 551b034e | Death snapshots and current viewer; compare existing visuals before adding anything. | pending |
| R10 | Current-rule test coverage and targeted experiment review | tests-current-rules, mood-ranking, place-scar | Keep historical contracts explicit. Additional mood/failure scoring only if a current failure is reproduced; do not adopt new mortality or shuffled scheduling as cleanup. | pending |

## Acceptance

For each implemented capability: focused boundary and conservation tests; accepted action through real work to consumed result; save/load continuation and predecessor compatibility; current build/typecheck; visible inspection/rendering; ordinary seeded activation with arrivals on. Report failed/null observations honestly. A staged mechanism and ordinary uptake are different evidence. Benefit requires an appropriate comparison; never infer it from construction counts.

Before deletion: publish verified integration; preserve all 19 old tips as annotated archive tags and verify their remote targets; preserve dirty worktrees and staged content; remove only the reviewed retired branch names. No branch deletion is authorized ahead of the requested implementation/verification sequence. Recovery mapping is in review_evidence/retired-recovery-20261104/refs.json. Existing raw-work preservation remains c188ac3e.

## R1 investigation

The old well creates water periodically without drawing down a finite source. Current rules 87 have finite natural water bodies, rainfall input and evaporation. Reusing old seepage verbatim would bypass that contract. The adaptation will be a shallow well connected geometrically to a nearby finite water body: slow transfer to a small well store, no minting, dry sources stay dry, construction/repair/travel/drawing costs remain. The planner may use only remembered water access and well contents; execution may discover a dry or inaccessible source. Initial design values and tests are to be recorded with implementation, not claimed as measured outcomes.

### R1 implementation and evidence

Rules 134 adds a 2x2 shallow well costing 4 wood, 8 stone and 260 work. It holds at most 12 water units (18 weight), and transfers one existing water unit every 50 ticks from the nearest fixed natural catchment within 14 tiles. Refill stops below 10 condition or when the catchment is dry. Stone repairs are preferred; the existing lower-quality wood fallback remains available. There is no new rain, groundwater creation, food, or free carrying capacity.

The planner uses personally remembered water distance and supply. A household with a remembered water journey of at least eight tiles can consider a well, subject to existing urgent-need and project limits. The pending layout retains its builder's household identity; the allocated well site is public. Existing work, material hauling, paid construction, repair, drinking, production water, crops and dependent-care acquisition handle the new source. The relief guard can recognize recently observed well water. The viewer renders the shaft and actual stored water and exposes condition, owner, refill state and contents.

Early prototypes did not activate: the first used a shelter food-surplus gate, and the revised journey-based desire exposed a separate execution bug (a public household ID on the pending layout violated layout ownership). `well-attempts.jsonl` records those failed attempts. The fix retains ownership until site allocation. The full layout regression was added; no existing layout validator was weakened. Earlier zero-activation runs remain evidence of those prototypes, not final behavior.

Validation so far: 101 tests passed across wells, natural water budget/protocol, stored water, care supply/protocol, layout claims and immutable rules-133 continuation. Build/typecheck pass. An immutable rules-134 reference records an ordinary forest world with an autonomously completed well and exact save/load continuation. The staged browser at `scripts/browser/wells_manual.html` showed construction spending 4 wood/8 stone, a 12-unit basin-to-well transfer, two drinks and two carried units leaving eight in the well, with conservation, observer purity and exact save round-trip all true. This is staged mechanism/appearance evidence. Fresh ordinary forest and river runs also construct wells and contain successful real drinking; final 25-day totals are recorded below. No aggregate survival or mature-world reliability claim is made.

The broader construction-finish regression has one pre-existing failure at `tests/construction_finish.test.ts:57` (shelter cover after replacement). It reproduces on untouched `f3be2ee2` in `living-world-recovery-baseline`; the original test is unchanged. Logs: `construction-baseline.txt` and `wells-regression.txt`. Other checks are under `review_evidence/retired-recovery-20261104/`.

Final R1 ordinary runs, rules 134, arrivals on, 25 days: forest built two wells, 28 distinct people reached well work, and two water units were carried; river built two wells, 31 people reached well work, and no water was carried. Both record successful drinks and all daily conservation checks passed. Forest ended with eight alive; river with 25. These are bounded activation observations, not evidence of aggregate survival benefit or mature-world viability. Ordinary care delivery from wells was not established; the staged test establishes that path. `wells-final-summary.json` links these counts to the retained `*-fixed.jsonl` logs. The `*-demand` and initial logs are rejected prototype evidence. Rules-134 implementation: e309f8a7.
