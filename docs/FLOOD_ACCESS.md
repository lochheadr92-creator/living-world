# Durable flood footprints and locally informed access — source audit

Audited on the rules 87 water candidate. A12 is still incomplete; this file is the next
implementation contract, not a claim that durable flooding or access repair has been delivered.
The existing programme register remains authoritative. Allocate a successor only after rules
87 is verified, committed and pinned; preserve its current water-body geometry and accounting.

## Current owners and missing transition

- `hardship.ts/floodTick` triggers at storm strength >=0.92, on the 30-tick schedule and no more
  than once per three days. It immediately spoils shore piles and damages nearby lean-tos/huts,
  records a world event and mood effects. `lastFlood` prevents repeated onset losses, but there
  is no retained wet/flooded footprint, physical depth, drainage or temporary access recovery.
- `pathfinding.ts` owns tile costs, cart exclusions, A* and string pulling. Current costs read
  static terrain, solidity and wear. It has no per-person hazard knowledge input. Adding hidden
  live flood costs to the global cost function would let remote route selection know the flood.
- `activities.ts/planPath,stepTravel` own actual person movement. A saved route is followed as
  waypoints; stuck detection can replan, but there is no local flood encounter boundary. A hazard
  that begins after departure therefore needs a physical movement check before crossing it.
- `habitation.ts/canEnterHome,enterHome,leaveHome` owns actual entrances and exits. Existing
  blocked-door behavior preserves an indoor person's physical location. A new wet-door condition
  must be checked at these actual boundaries, without remotely revealing it in option generation.
- `knowledge.ts`, `perception.ts`, `route_learning.ts` and `options_survival.ts` already own
  bounded personal observations, experienced route failures and survival choices. Extend those
  existing concepts for local signs, stale warnings, correction and alternatives. Do not create
  a global private hazard oracle or make an unobserved flood another person's knowledge.
- `transport.ts` and pathfinding cart mode retain wheel restrictions and physical loads.
  `hydrology.ts` rules 87 stores fixed terrain-water components and exact stock/recharge/loss.
  Temporary flood ground must not silently rewrite those components or duplicate natural water.

## Required connected situation

Keep a bounded saved footprint with onset, active and recovery phases, observable signs and
finite duration. Relate the footprint to an actual storm/water condition. Existing onset loss
and shelter damage are credited once; renewed observations or recovery must not repeat spoilage.
Render the affected ground and show its retained cause and uncertain recovery to the viewer.

Personal planning uses remembered affected tiles or places; physical execution checks the
current local ground. A traveller who departed before onset can notice the danger, preserve
useful work, choose a feasible known route, wait within a bounded timeout or shelter. An old
warning must be corrected by later observation, rather than permanently banning the place.
Keep the distinction between a known route, a searched route and a physically checked route.

Exercise ordinary walking and carts, after-departure onset, a warning that outlasts the actual
flood, an already-indoor person whose doorway changes, and a person already on affected ground
who must be able to retreat without teleportation. No goods or people disappear for convenience.
If drainage/clearing is required for an otherwise viable journey, give it lawful siting, actual
work/material costs, interruption and ownership; it is not a free route reset. Bounded waiting
and natural recovery may suffice where no constructed repair is justified.

Required checks include a saved traveller, actual local discovery, usable alternative or visible
failure, saved flood/recovery transition, exact twins and conservation, uninformed-person
nonreaction, stale-warning correction, inspector/AI purity and rendered signs. Ordinary onset
frequency and successful adaptations require fixed-seed evidence separately from staged storms.
Long environmental recovery and mature Large performance remain pending under the documented
owner-run runtime policy; an audit or attractive warning label cannot close A12.
