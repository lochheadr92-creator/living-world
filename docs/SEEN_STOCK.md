# A sight of a store remembers a glance, not the count — rules 169

Predecessor rules 168 is pinned by `tests/v168_continuation.expected.json`, recorded before this
behaviour existed. Origin: the free-file omniscience leak in `snapshotEntity`, which copied a
building's `store.items`, a cart's load and a pile's items at the moment of sight. This step is
that copy, in its own rules version (decision D2). The owner message on 9 November 2026 was to
work through the next five implementations without stopping. No separate store-sign design was
locked before that message. The glance below is the rule this version states.

## The defect (every version up to 168)

`knowledge.ts` `snapshotEntity` gave the observer the exact counts. A planner that reads
`belief.items` then knew the inventory as if it had been counted. Live transfers still read
`e.store.items`. That path is unchanged.

## The rule

`src/sim/seen_stock.ts` (`hasSeenStock`: rich, rules 169 or later, switch on). `snapshotEntity`
asks `glancedItems` for a building store (`e.store.cap`), a cart (`e.cap`) and a pile. A pile has
no weight cap. The glance passes 9999, so an ordinary heap is not treated as full.

- each kind with a positive count is remembered as 1;
- textile kinds (`textileGoods`: fibre, garment, blanket, bedding, and wool from rules 129) stay
  at the counts that were there. The clothing check requires `textileStock.items[k]` to be no
  larger than the remembered items, and there is no separate textile sign. A partial store of
  only textiles is therefore remembered exactly;
- when the true weight meets the cap, and the glance does not, the lexicographically first
  non-textile kind is raised until the remembered weight meets the cap. That stand-in is not the
  true split. A store of one kind filled exactly to the cap reproduces that count, because the
  cap and the unit weight determine it. A partial store does not;
- a gear pile still clears `items` and keeps its gear record. A carcass pile's items stay empty
  and `carcassParts` is still the part record. Facility `ops` input counts and hearth fuel are
  not this rule.

Rules 168 and earlier, and authored worlds, keep the exact copy. `setSeenStock(false)` restores
it inside a rules-169 rich world. The plan-wide name `rich-no-care-knowledge` is not used. Lab
evidence compares rules 168 pinned with `lab.mjs --rules 168` against current rules, so
`scripts/lab/lab.ts` is not edited.

## What was checked, and what was not

`tests/seen_stock.test.ts` (7), staged, not spontaneous. At 168 a hut of 8 grain and 3 wood, a
cart of 4 wood and a pile of 5 fish are copied. At 169 those are 1 and 1, 1, and 1, and the
containers themselves are unchanged. A full hut of 10 grain and 15 wood (weight 40, the hut cap)
is remembered as full and not as 10 and 15. Forty grain, one kind at the cap, stays 40. Three
garments stay 3 beside grain remembered as 1, and the textile observation is 3, which is within
the remembered count. The switch and an authored world keep the copy.

`tests/care_capacity.test.ts`, `tests/carcass.test.ts`, `tests/stored_water.test.ts` and
`tests/wells.test.ts` passed in the same run (the care-capacity "full" case still sees no room
after a store is filled with seeds and observed). `npm run typecheck` passed.

Immutable pin `tests/v169_continuation.*`: Normal birch, arrivals on, 12,000 ticks then 120 after
a save and load, recorded from a clean checkout of `f347ca5f`. The saved world holds a belief of
1 for a kind the container really holds more of, sampled every 200 ticks. The pin test passed on
that checkout, 1 of 1 in 20.1s. The reference script refuses to overwrite.

The paired lab is not run. No benefit or harm is claimed.

## Not touched

A worry about a dead subject the worrier has not heard of. `whereIs` reading household ids. The
recruit cap's global helper count. `knownNeeds` for a dependant in sight. Facility operation
counts and hearth fuel. The leaks that sit in another session's uncommitted files.
