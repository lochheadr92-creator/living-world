# Retained forest food crisis — diagnostic, not a balance change

The ordinary rules-107 forest day-45 world has 27 death records: 19 hunger, three
exposure, two fever, one injury, one thirst and one wolf attack. Most hunger deaths
occur between days 20.8 and 23.6. This does not identify one cause of all deaths.

`scripts/food_pressure_observe.ts` continues the retained first-invalid-save
checkpoint (now accepted by the meat validator fix) from tick 43,440 to 57,840:
six predeclared days under its original rules 107. No needs, supplies, knowledge
or choices are changed. All living people are counted; Bram and Ada are selected
diagnostic leads, not a representative sample. Bounded story/endings lists are
labelled as such. Source and input hashes are retained in
`autonomy_evidence/food107-forest-days18-24/report.json`.

The run takes 58.49 seconds, samples 2,726 living-person states, passes 120 pure
inspections, exact unobserved twins/final reload and full item conservation. It
ends with four living people and 26 new deaths (19 hunger). The earlier infant's
thirst death precedes the input and is not counted again.

Of **754 critical-hunger samples**:

- All 754 have a food offer and a personally known food source estimated nonempty.
- 75 have no food option remaining after eligibility/ranking filters; several
  needs and danger can compete. This count alone does not assign their cause.
- Only eight carry food; 76 have full packs.
- The current activity is gathering travel in 608, gathering work in 30, drinking
  travel/work in 74, and eating/eating-at-store work in two.
- The leading option is gathering in 636, drinking in 90, fleeing in eight,
  eating/eating-at-store in ten, socializing in nine and visiting in one.

Global resource totals are observer facts, never knowledge supplied to people:

| Day | Alive | Wild source food units | Carried food | Stored food |
|---|---:|---:|---:|---:|
| 18.1 | 29 | 166 | 40 | 4 |
| 19.1 | 29 | 172 | 36 | 3 |
| 20.1 | 29 | 128 | 17 | 0 |
| 21.1 | 28 | 104 | 8 | 0 |
| 22.1 | 24 | 82 | 2 | 0 |
| 23.1 | 6 | 87 | 0 | 0 |

Existence somewhere is not local access, adequate supply or reachable replenishment.
The measured lead is repeated travel and failed/partial arrivals while stores run
empty, not wholesale absence of food options. Bram's trace includes empty arrivals,
one-unit partial harvests, resting and drinking interruptions. No hunger-rate,
capacity, source-yield or reserve-target change is justified by this report alone.

## A separate physical accounting defect found during the trace

The wild-grain handler can eat a grain directly at its source when the pack has
less than one grain's room. Its later seed branch still tries to consume a carried
grain and produces a seed even when that consumption returns zero. This is a
conversion without its declared input, not evidence that it caused the famine.

`autonomy_evidence/grain_seed_probe.ts` exercises one offered physical harvest in
20 fixed staged seeds at rules 111. Initial pack: five wood, six seeds, no grain,
half a weight unit free; hunger 10; source holds two grain. In six cases the source
falls to one, hunger rises to 32 and a new seed appears, while grain consumed for
seed is zero. Exact reload and per-item conservation still pass: the ledger records
the seed as production and cannot itself prove that a conversion paid its input.
This is mechanism evidence, not an ordinary frequency estimate. The next bounded
repair must require an actual consumed grain before seed production, preserve
predecessors and avoid claiming a starvation remedy.
