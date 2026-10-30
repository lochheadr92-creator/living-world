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
