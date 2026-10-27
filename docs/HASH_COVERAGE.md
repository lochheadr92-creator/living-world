# Hash coverage

`hashWorld` (src/sim/world.ts) is the deep state fingerprint a verification run rests on. It does not hash every field. This lists the World and Person fields a perturbation leaves the fingerprint unchanged on, for a normal river world at tick 2400, whether the full serialized state (`deepEqualState` over `serializeWorld`) sees the perturbation, and a classification.

`cosmetic` = transient/derived/presentation/constant worldgen state intentionally left out of the dynamic fingerprint; `unexpected` = saved dynamic state the fingerprint does not directly cover (flagged for review, though many are covered indirectly by the hashed state that causes them, or by the separate ledger/invariant checks).

Note: for a top-level *collection* field (persons, sources, buildings, sites, plots, piles, animals, tools, carts, meals) the probe perturbs one leaf, so a "blind" row there reflects that leaf, not the whole collection — `hashWorld` does iterate every one of those collections.
## World fields `hashWorld` is blind to

| Field | deepEqualState sees it? | Class |
|---|---|---|
| `world.H` | yes | cosmetic |
| `world.W` | yes | cosmetic |
| `world.accessCell` | yes | cosmetic |
| `world.animals` | yes | unexpected |
| `world.buildings` | yes | unexpected |
| `world.byId` | no | cosmetic |
| `world.camp` | yes | cosmetic |
| `world.carts` | no | unexpected |
| `world.chronicle` | yes | unexpected |
| `world.conversations` | yes | unexpected |
| `world.deceased` | no | unexpected |
| `world.delayed` | no | cosmetic |
| `world.events` | yes | unexpected |
| `world.fx` | yes | cosmetic |
| `world.graves` | no | unexpected |
| `world.grid` | no | cosmetic |
| `world.ledger` | yes | unexpected |
| `world.light` | yes | cosmetic |
| `world.nextId` | yes | cosmetic |
| `world.occ` | yes | cosmetic |
| `world.occasionState` | yes | unexpected |
| `world.persons` | yes | unexpected |
| `world.pgrid` | no | cosmetic |
| `world.piles` | no | unexpected |
| `world.plots` | yes | unexpected |
| `world.requests` | yes | unexpected |
| `world.reservations` | yes | unexpected |
| `world.roadAge` | yes | cosmetic |
| `world.sceneLabel` | yes | cosmetic |
| `world.seed` | yes | cosmetic |
| `world.settings` | yes | cosmetic |
| `world.sites` | yes | unexpected |
| `world.solid` | yes | cosmetic |
| `world.sources` | yes | unexpected |
| `world.stats` | yes | cosmetic |
| `world.stumps` | yes | cosmetic |
| `world.terrain` | yes | cosmetic |
| `world.tools` | yes | unexpected |
| `world.usedNames` | yes | cosmetic |
| `world.waterDist` | yes | cosmetic |
| `world.wear` | yes | cosmetic |

## Person fields `hashWorld` is blind to

| Field | deepEqualState sees it? | Class |
|---|---|---|
| `person.activity` | yes | unexpected |
| `person.asked` | yes | cosmetic |
| `person.beliefs` | yes | unexpected |
| `person.birthTick` | yes | unexpected |
| `person.bykind` | yes | unexpected |
| `person.cartId` | yes | unexpected |
| `person.children` | yes | unexpected |
| `person.chrono` | yes | unexpected |
| `person.commitments` | yes | unexpected |
| `person.concerns` | yes | unexpected |
| `person.convId` | yes | unexpected |
| `person.cooldowns` | yes | cosmetic |
| `person.deathCause` | yes | unexpected |
| `person.diedTick` | yes | unexpected |
| `person.ent` | yes | unexpected |
| `person.errand` | yes | unexpected |
| `person.explored` | yes | cosmetic |
| `person.failures` | yes | cosmetic |
| `person.intentions` | yes | unexpected |
| `person.lastAteTick` | yes | unexpected |
| `person.lastDecision` | yes | cosmetic |
| `person.lastExploreTick` | yes | unexpected |
| `person.lastInteraction` | yes | cosmetic |
| `person.lastPercept` | yes | unexpected |
| `person.lastResult` | yes | cosmetic |
| `person.log` | yes | cosmetic |
| `person.look` | yes | unexpected |
| `person.name` | yes | unexpected |
| `person.nextThink` | yes | cosmetic |
| `person.parents` | no | unexpected |
| `person.partnerId` | yes | unexpected |
| `person.pheading` | yes | unexpected |
| `person.pose` | yes | cosmetic |
| `person.pregnantBy` | yes | unexpected |
| `person.pregnantUntil` | yes | unexpected |
| `person.px` | yes | unexpected |
| `person.py` | yes | unexpected |
| `person.seen` | yes | cosmetic |
| `person.sex` | yes | unexpected |
| `person.skills` | yes | unexpected |
| `person.speech` | yes | cosmetic |
| `person.stampX` | yes | unexpected |
| `person.stampY` | yes | unexpected |
| `person.stats` | yes | unexpected |
| `person.suspended` | yes | unexpected |
| `person.told` | yes | unexpected |
| `person.traits` | yes | unexpected |
| `person.wave` | yes | unexpected |
| `person.whereabouts` | yes | cosmetic |
