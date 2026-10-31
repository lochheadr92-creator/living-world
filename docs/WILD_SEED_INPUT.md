# Paying for seeds saved from wild grain — rules 113

Owner: `src/sim/wild_seed.ts`, called at the existing physical wild-grain harvest
boundary. A hungry gatherer with less than one grain's pack room can eat a grain
directly at the source. The old subsequent seed-chance branch attempted to consume
a carried grain, ignored the amount actually consumed, and produced a seed anyway.
A pack with room for a seed but not a grain therefore created an unpaid seed.

The retained rules-111 fixed-seed probe reproduces this in 6 of 20 explicitly staged
harvests (`FOREST_FOOD_CRISIS.md`). Ordinary frequency and any contribution to famine
were not established by that probe. Per-item conservation passed even in the bad
case: it accounts for the produced seed but does not establish the conversion input.

At rich rules 113, the conversion requires one actual carried grain. A failed
input check consumes nothing, including a partial grain. A valid conversion uses
the existing consume/produce ledger and capacity boundaries. A separate carried
grain can still pay when the harvested grain was eaten at the source. The existing
chance draw, nutrition, source depletion, gathering cost and capacity are unchanged.
Older rules and `rich-no-wild-seed-input` retain the original behaviour exactly.
There are no new saved fields, protocol changes or person knowledge.

Changed existing owners: `act_resource.ts` delegates this transformation;
`rulesversion.ts` selects 113; `scripts/lab/lab.ts` exposes the removal switch.
The small owner module keeps the rule and compatibility boundary explicit.

## Verification contract and evidence

The initial contract failed on predecessor source: one seed was created with zero
grain consumed for seed. Eight focused contracts cover no input, partial input,
paid harvested/carried input, old/lab behaviour, the same random draw across 20
fixed scenes, and a saved partly completed accepted harvest with pure inspection.
Related economy, food/care and immutable-112 suites pass **55 tests / 5 files**.
Typecheck/build pass (existing Vite native-loader and bundle-size warnings).

The rendered labelled staged scene passes **6/6**. The inspected screenshot shows
Ada's hunger at 32, the original six seeds still carried and the source reduced by
one. Its actual accepted action runs through the physical handler, exact saved
twins/reload and item accounting; this is not an autonomous-world adoption claim.

Predeclared ordinary measurement: fresh Normal river, meadow and forest, five days
each at 112 and 113, immigration off, no supplied goods, knowledge or decisions.
`wild_seed_observe.ts` records the existing conversion-specific produced-seed and
consumed-grain reasons, excess at each tick, pure inspection, unobserved twins,
reload, full accounting and frozen source hashes. Per-tick excess is a lower bound
if several people convert in one tick. Full regression and six windows are running.
No general food availability, winter survival or population benefit is claimed.

Fresh review: the precheck must precede consumption so partial grain is preserved;
the additional partial-input contract passes. Legacy mode returns the historical
retained-food adjustment even when no grain was consumed. No new random draw occurs.
