# Transport beyond the building site: carried experience, cart trips for live plans, recovery (rules version 55)

Delivered 2026-10-29 on `main` after rules 54 (`aaa95ce`). Workstream 7 (remainder) of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md); the cart's recipe and batch plan are rules 50
([BATCH_PLAN.md](BATCH_PLAN.md)).

## What stood before

A handcart was wanted on known site deficits alone (`production.ts wantsCart`: at least 40 weight of material still
needed at known sites of one's own or the settlement's, a build skill of 0.9 and some diligence); the comment spoke of
"the one who keeps hauling heavy loads" but nothing hauled was ever measured. The only destination a cart could be offered
was a building site, although the haul handler already knew how to unload into a store. A loaded cart left standing, its
puller interrupted or dead, was never picked up again: the offer required an empty cart. The 45-day audits (WS7 row) found
carts wanted by 3 / 6 / 1 people and "Building a handcart: needs a hammer" the blocker in every case; no cart was ever
made in an ordinary world.

## Contract

Gated on rich dynamics and `runsRulesVersion(world, 55)`; lab switch `rich-no-transport` leaves the rules-20 site haul and
the cart itself untouched. Owner: `src/sim/transport.ts`; call sites in `act_resource.ts` (the foot haul's transfer),
`act_production.ts` (the cart handler's recovery leg and store unloading), `production.ts` (the demand and the offers),
`inspect.ts`/`person_sections.ts` (one line). New saved state: `Person.hauling` {weight, trips, since}, hashed, refused on
load below rules 55. The rules-54 full serialized continuation (`tests/v54_continuation.expected.json`) was recorded from
`aaa95ce` before any of it.

### Carried experience

What a foot haul really delivers to a building site (`haul`, at the transfer) is counted on the hauler by weight and load:
`HAUL_WINDOW` (6 days) from the first load, then started afresh. Having carried `HAUL_EXPERIENCE` (30 weight) in at least
`HAUL_TRIPS` (6) loads within the window is a ground for wanting a cart, with no skill gate: the demand reads "to haul heavy
loads, after carrying 84 weight of materials to building sites in 7 loads these last days", beside the rules-20 deficit
ground, which is unchanged. The threshold is set from the ordinary observations (a foot haul delivers about 3 weight; the
heaviest carrier in three worlds reached 34 in 7 loads), where "keeps hauling" begins, not at the staged full pack. The want is then the rules-50 batch plan's as before: a timber yard, a hammer, handles and
planks. The person card says what they have carried and whether it is enough to want a cart.

### Trips for live plans

A known parked, empty cart of the household's or communal may be offered, beside a site:

- **the household's home store**, for an active food-reserve plan (rules 2/46) short of its target, loaded with reserve
  food (grain, fish, fruit, berries) at a known granary, storehouse or pile, never more than the plan is short of; the
  allowance applies at loading as for any withdrawal; the deposit is noted and the plan credited exactly as a deposit from
  the pack is (`creditStocked`), so the plan ends "put 12 units of food by", not "the store came to hold it without their
  doing";
- **a known workshop**, for an active batch plan (rules 50) whose inputs are still short, loaded at a known pile,
  storehouse or own building; only what the workshop accepts is unloaded (`mayDeposit`) and the deposit is noted for the
  depositor as any deposit is.

Each needs more than one foot trip's worth of weight (the adult pack, 12) to be worth the wheels. Capacity, terrain, the
path check before taking hold, loading and unloading time, and what stays on the cart when the destination cannot take it
are the cart handler's as before.

### Recovery

A known parked cart of the household's or communal that stands loaded may be taken to the first known site that needs any
of its load, or failing that to the household's home store when it is remembered as having room; the puller goes straight
from the cart to the destination (no loading leg). What the destination cannot take stays on the cart where it is parked,
and a home store remembered as full is not offered. A puller who dies lets go where they fell (`lifecycle.ts unhitch`), so
this is the death case too. Nobody is moved and nothing is copied.

## Tests

`tests/transport.test.ts` (6): seven foot loads of stone to a site are counted (weight 84, 7 loads) and make the cart
demand with its own words, at rules 55 and not 54, the window closing and the record starting afresh; a three-adult
household's reserve plan (target 12) gets twelve fish carted from the storehouse to the home store in one trip, credited
to the plan, the rest left where it was (the gap in the store beyond twelve is spoilage in the ledger), and not below 55;
a brick batch plan's clay and wood carted to the kiln, only what it accepts; a puller who dies mid-haul leaves the loaded
cart standing and a household member recovers it to the site that needs the load, not at 54; twenty bricks recovered to a
lean-to leave four in the store (its 12 weight) and sixteen on the cart, which the full store is not offered again; switch,
exact replay, observer purity, hash coverage, a rules-54 save carrying a hauling record refused. `tests/chains.test.ts`
(carts) unchanged. `tests/v54_continuation.test.ts` pins rules 54.

## Ordinary worlds and the lab

Three 45-day seeds at rules 55 (`transport_evidence/obs-45-{seed}-r55`, `scripts/transport_observe.ts`) and the 8-seed
lab against the switch (`transport_evidence/lab-transport`): results in the slice log of DEPENDENCY_CHAIN_PROGRAMME.md.
No benefit is claimed.

## Limits

- Exchange goods are not carted (the exchange journey carries its own pack as before); only the two live plans above.
- A cart trip loads at one place; it does not tour several.
- A recovered cart goes to the first known site that needs its load, not the best.
- No aggregate claim.
