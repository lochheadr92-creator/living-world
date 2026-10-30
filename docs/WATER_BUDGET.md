# Bounded accessible water — source reconciliation before implementation

Audited on the rules 86 candidate. This document is a continuation contract, not an implemented
water model or evidence of scarcity. A11 remains open in the full owner programme.

## Current owners and confirmed missing transition

- `act_resource.ts/waterFacing,drink,fetch_water`: natural water is terrain within two tiles.
  Shore drinking currently restores 2.8 thirst per work tick without a physical water draw;
  fetching calls `produce` to create each inventory unit. Neither reduces a hydrological stock.
  Stored/inventory drinking already consumes real water; the rules 67 household access path
  revalidates occupancy and ownership. Preserve that existing behavior for old rules.
- `registry.ts/isWater,isWaterAccess,findWaterAccessNear`: static terrain and walkability own
  geometric water/shore access. Do not accidentally make route selection read unseen live supply.
- `perception.ts`: locally observed coarse access cells become dated water beliefs, currently
  with zero amount/max because there is no finite budget. `optutil.ts/rankWaterSpots` ranks those
  remembered access points using distance, personally known danger and recent failures.
- `worldgen.ts`: finalized terrain/access, seeded knowledge, local initial perception, then
  `snapshotInitial`. `scenes.ts/finish` likewise establishes perception and the initial ledger.
  Any new natural stock must exist before the initial accounting snapshot and observation.
- `economy.ts/totalItems`: inventories, stores, production jobs, sites, piles, carts, meals,
  natural sources and crop stocks are counted. A bounded natural water inventory must participate
  once; moving it into a pack must not also call `ledgerCreate` as if extraction created water.
- `environment.ts`, `hardship.ts`: weather/rain and dry spells exist; drought currently says the
  water still runs. `sources.ts` fish renewal has no water-volume dependency. Rules 86 soil
  recovery uses static proximity/rain/drought, not an actual water-source budget.
- No existing well, rain collector or cistern implementation was found. Whether a constructed
  facility is needed must follow a concrete unmet-access/storage case, not duplicate facilities.

## Required next implementation

Allocate a fresh successor only after the rules 86 release and immutable continuation are
recorded. Use a dedicated hydrology owner for bounded water-body/source inventory, deterministic
recharge, evaporation/outflow and access-state transitions. Keep terrain geometry and supply
distinct; do not erase a lake obstacle just because the accessible water is depleted. A large
body can remain plentiful at village scale while a small source changes supply.

Connect actual source extraction and direct shore drinking to one accounting path. Check pack
room before extraction and revalidate physical shoreline contact and remaining supply at each
draw, including competition and drying after departure. Preserve paid/partial work and truthful
failure. Inventory and stored water retain their current physical origin and ownership rules.

People learn coarse wet/low/dry signs locally, retain stale uncertainty, and choose a remembered
alternative, search, carry/store/provision water or fail visibly. Reuse household provisioning,
stored drinking, crop watering, route experience and offered legal actions. Do not give exact
unseen volume, future recharge dates or omniscient redirection. Couple affected fishing/crops
only where their physical dependence is established. Render the changed shore/supply and show
its real cause. Keep observer/AI boundaries pure and replay historical protocols.

Expected proof: two different-sized sources; real extraction dries the small one; a saved
traveller discovers changed access and completes a feasible physical alternative, or records
why none is feasible. Recharge/loss/extraction all balance with inventory/consumption; restored
continuations match through depletion and recovery. Preserve an ordinary adverse case. Long
ecological and mature Large results remain pending under the existing owner-run runtime policy.

Possible bounded representation to assess, not a settled implementation: connected terrain water
components with one tile-to-body index, capped by map area; inventory per body, fractional recharge
accumulators and deterministic unit accounting. Review small/shallow shore access separately from
deep-water volume. Do not infer physical siting or unlimited groundwater for a future well.

## Successor implementation design and checks

Use deterministic connected components of finalized water terrain, with shallow/deep cells
contributing declared finite capacities. Initialize before source knowledge and `snapshotInitial`.
Keep the original terrain and pathfinding obstacles; a dry bed does not automatically become
safe ground. Store each body's quantity and bounded fractional weather accumulators. Derived
tile lookup must be bounded, rebuilt deterministically and excluded from semantic save state.
Rain captured into available capacity is created water; actual atmospheric loss is spoiled
water. Extraction transfers stock; direct drinking consumes it. Never count extraction both as
creation and transfer. Model parameters must be declared before ordinary measurement.

At a shore, use real physical contact and current source availability. Revalidate every completed
draw and sip, including depletion by someone else during work. Keep partial success, pack limits,
actual elapsed work and a truthful local failure. New-rule direct shore drinking should use the
existing one-unit / eight-tick / WATER_VALUE sip contract, making its timing change explicit and
keeping historical continuous shore drinking unchanged. No unspent reservation of an entire lake.

Local observations may say wet, low or dry, with the existing timestamp/source. Planning can
penalize or temporarily avoid remembered dry access, then reconsider stale knowledge; it cannot
read the live body stock remotely. Compare remembered alternatives for both personal drinking
and household fetching. Actual carried/stored water already feeds household provision, care and
crop tending; those ownership boundaries remain authoritative. Dry/low water should affect the
physically associated fish source, without leaking current supply through a distant option.

Predeclare staged checks: differently sized sources; legal repeated extraction and useful
drinking; full-pack and interrupted work without a draw; competitor dries the shore after
departure; restored traveller learns locally and reaches the remembered alternative; no known
alternative gives visible failure/search; weather recharge and evaporation; exact saved
continuation, conservation, pure inspection, and historical rules 86 reference. Render an actual
depleted source and replenished source with source history, distinct from the inhabitant's old
belief. A fresh current-protocol live/stub replay must actually expose the new coarse signs.
Ordinary measurement will keep the fixed three seeds and adverse cases; no scarcity tuning to
force a pleasing story or claim of household/survival benefit without a paired experiment.

## Rules 87 candidate — connected implementation and predeclared measurements

Predecessor 86 is published at `e26ac6f`, runtime `21537ba`, immutable continuation `8b58b93`.
`hydrology.ts` now owns connected terrain-water bodies, deterministic initialization and weather
accounting. Each shallow cell contributes two water units; each deep cell eight. Initial stock
is included before the first ledger snapshot. Captured rainfall is two units per tile/day at
full rain, capped by capacity; overflow is never captured inventory. Evaporation is
`(0.04 + max(0, temperature-10)*0.004)` units per tile/day, tripled during a dry spell. Updates
run every 60 ticks with fractional remainders below one. These are declared simulation parameters,
not empirical hydrology or a claim of balanced ordinary scarcity. There is no unlimited recharge.

Actual draws reduce that body; fetching transfers to a real pack with a transfer hook and no
creation entry, and shore drinking consumes one unit per completed eight-tick sip for the
existing WATER_VALUE relief. This deliberately adopts the existing carried/stored sip timing
for current shore drinking; rules 86 and older retain their continuous shore-drinking path.
Every draw revalidates current physical contact, exterior access, capacity and remaining water.
Partial completion, interrupted work and competition remain separate. Stored water, household
delivery, crop watering and carried drinking reuse their existing inventories and actions.

`water_access.ts` owns actual shore contact and coarse wet/low/dry observations. Low means less
than a quarter of capacity; dry means less than one unit. Fresh dry memories exclude that access
for half a day, allowing existing search/known alternatives; later reconsideration retains a
fading uncertainty cost over three days. Household fetching, promises, trip preparation, advice
and relocation use personal memories. Arrival checks current local availability. No remote
live stock enters these decisions. Physically associated dry fish sources lose their remaining
fish with a spoilage entry; low water slows renewal. Adjacent ecology recovery uses actual water
availability in its environmental moisture term. Terrain/path geometry is preserved.

Natural water is selectable in the existing map and inspector with view-only identifiers; it
does not become an invented entity or container. Dry/low colors and current drawn/rain/loss
counters are visible. AI protocols 25/26 expose observation 14 coarse dated water signs through
the existing offer validator; protocols 23/24 retain observation 13. Lab removal is
`rich-no-water-budget`. No new well is justified yet by the inspected ordinary access evidence;
that conditional requirement remains open if an unmet facility need is demonstrated.

Focused contracts currently pass **19 tests / 3 files**, including frozen 86, actual shore
depletion, partial-sip save, alternative-source drinking after departure, fetching and useful
carried consumption, lost pack room, interrupted work, current fish loss, rain/evaporation,
unknown source purity, malformed history, no-known-water search, and indoor execution rejection.
Browser `water87-rendered` passes **10/10** with screenshots visually inspected: the same small
source is wet, dries after Ada's actual two sips, and refills under declared sustained rain.
The larger source stays wet. A real canvas click opens the water inspector; selection survives
a tick and the mid-drink save continues exactly. This is staged evidence, not ordinary scarcity.

The first ledger/version contract run deliberately found the two missing integration boundaries
before they were connected (`autonomy-water87-before.log`, 2 failed / 1 passed). Subsequent test
fixture mistakes are retained: water observations belong in `remembered.water`, and live runs
return a rewound world rather than mutating the original reference throughout; raw belief removal
also violated its derived index, and a made-up indoor object was not the engine's numeric home
reference. Fixtures now use the real schema, returned world, deletion API and execution boundary.
No valid engine expectation or historical continuation was weakened to pass these checks.

Ordinary predeclaration: Normal, rich/current 87, no immigration, fixed river/forest/meadow,
five days (12,000 ticks), 170 seconds per seed. `scripts/water_observe.ts` records source budgets,
actual shore/carried/stored drink and fetch starts/endings, repeated wet/low/dry memories,
condition-reason choices and bounded counterfactual removal samples, plus failures and useful
consumption. Each run keeps an exact unobserved twin, 100 full-save purity checks, daily ledger
checks and a validated final save. Zero depletion or adaptation remains a valid result. Full
regression, ordinary results, long drought/recovery and mature Large cost are pending here until
their actual results are recorded; earlier ecology results do not establish those claims.

## Five-day ordinary results

All fixed runs reached 12,000 ticks, with 2,800 repeated living-person samples, 100 full-save
purity checks, exact unobserved twins, daily conservation and exact validated final saves.
Each retains 28 living people and zero deaths; that is not a survival benefit result.

| Seed | Shore drink starts / success / interrupted | Fetch starts / success | Carried drink success | Drawn / rain captured / evaporated units | End stock / capacity | Seconds |
|---|---|---|---:|---|---|---:|
| river | 220 / 214 / 5 | 3 / 3 | 11 | 406 / 0 / 130 | 2,244 / 2,780 | 34.24 |
| forest | 216 / 198 / 15 | 5 / 5 | 14 | 401 / 508 / 149 | 3,008 / 3,050 | 29.17 |
| meadow | 215 / 205 / 9 | 2 / 2 | 10 | 395 / 328 / 113 | 2,040 / 2,220 | 29.97 |

One/three/one shore drinks are still active at the horizon; starts are not completions. There
are zero failed/partial water endings and zero stored-drink starts in these windows. All nine
natural bodies remain wet. Repeated wet-memory counts are 51,624 / 42,113 / 40,605; low/dry
memories, dry-source blocks, condition-reason starts and sampled choice changes under removal
are all zero. Small-source depletion, recovery, remembered alternatives and no-known-water
search remain staged mechanism evidence. Do not describe ordinary danger diversion as a
response to the new hydrological scarcity layer. Final save sizes: 3,295,529 / 2,767,952 /
2,543,574 bytes, not mature Large measurements. Source manifests and artifacts live at
`autonomy_evidence/r87-{river,forest,meadow}`; observer logs retain exit 0.

Reproducible ordinary story (`scripts/water_story.ts`, fixed rules 87, same settings): river,
Yan #1134 completes two wood at tree #582 at tick 122, chooses his personally observed wet
access #1000232 at 123 because of thirst, walks there and consumes one real unit from body
#3644 at 169, raising thirst satisfaction to 93.9. He then chooses discretionary wandering
at 170. This is a recorded need → observation → actual draw → relief → next choice chain,
not proof that the water budget increased leisure. The later attempt to speak to Petra #1132
fails at 286 because she is busy, and remains in the story.

Preserved adverse water journey: forest, Talia #937 heads for remembered access #1000292 at
442 but is interrupted at 464 by nearby danger, before any sip. She flees, later tries asking
#908 for water, and at 579 chooses another remembered access, #1000192. No water appeared in
her pack or body draw counter merely for starting the journey. Both 800-tick story replays
match exact unobserved twins and balanced ledgers. The water observer's `adverse` array contains
failed/partial endings; these interruptions are explicitly counted and retained in its early
`stories` and the dedicated reproduction, rather than being silently called successes.

## Historical fixture finding from the full regression

`autonomy-water87-full-tests.log` passed **1,924 tests** and failed three historical provenance
fixtures (284 files, 402.79 seconds). `v27_save_provenance.test.ts` created the latest night
world, then rewrote only its rules number to 26, 27 or 28. That left rules-87 water inventory
inside a purported historical save, correctly refused by `validateWater`. The fixture now
accepts an explicit creation-time version; provenance and storage callers request their real
historical version before initialization. All original marker/round-trip assertions remain.
An added negative contract continues to reject a relabelled current water world. The current
runtime and historical validator were not relaxed. Corrected focused verification is **39
tests / 5 files**, including a new physical source → fetched water → crop-care → saved-result
chain (`autonomy-water87-save-fixture-fixed.log`). The final full rerun is recorded below when
finished. Ordinary and browser runtime evidence is unchanged by these fixture-only repairs.

## Release review

Fresh review traced initialization → personal observation → offered shore action → physical
contact/capacity → draw/transfer or consumption → save validation → current-world inspection.
Natural stocks enter initial totals once; actual rain is creation, extraction is a transfer or
consumption and actual evaporation/fish loss is spoilage. Distant choices use dated signs.
No changes to old continuation fixtures were needed. The historical save-fixture defect above
was repaired at creation rather than weakening the validator. Typecheck passes after that fix;
release build passes with the existing Vite import-extension/bundle warnings. The existing timer
overflow warning is retained in test logs. No survival, aggregate benefit, ordinary scarcity or
mature-world performance claim follows from these checks.

Existing modules touched, and why: world/worldgen/scenes/economy/save own lifecycle, stock and
persistence; act_resource owns physical drinking/fetching; perception/knowledge consumers own
local supply expectations; sources/ecology own real water-dependent productivity; pathfinding
terrain remains unchanged; the existing map, inspector and AI observation expose actual new
state within their distinct viewer/personal boundaries. New hydrology and water-access modules
own finite source accounting and local contact, keeping those responsibilities out of central
world and activity modules.

Final full regression: **284 files / 1,928 tests passed in 401.29 seconds**
(`autonomy-water87-final-full-tests.log`). Typecheck and release build pass; rendered checks
10/10 and the three ordinary exact-twin runs above use this unchanged runtime. Immutable
rules-87 reference is recorded from the following runtime commit before successor edits.
