# A hut is not held back by the larder: rules 193

Predecessor rules 192 is pinned by `tests/v192_continuation.expected.json`. Origin: the owner's instruction in chat on 11 November 2026, after the
diagnose-and-repair session of the same day (`docs/REPAIRS_20261111.md`, findings 4 and 5): "so can we make it so people are more likely to
build houses cause lean-tos aren't enough", "i dont understand why theres a food gate for a house anyway", "remove the food gate for housing",
"makes sense if they're too hungry to build but they shouldn't stop building because of it". Stream: repair.

## The rule it revises (rules 7 to 192)

`optPlanBuild` (`options_work.ts`) let a household living in a lean-to lay out a hut only when it had three food per member to hand: the
food its members carry plus what they believe their home store holds ("the household has only N food to hand and wants M before starting a
hut"). `docs/HOUSEHOLD_HOME.md` records it as "Food comes before a house, deliberately". Since rules 169 a sight of the store remembers a
glance (each kind present as one), so a stocked store read as 1 and the test was rarely met from the store at all.

What the ordinary worlds showed (twelve seeds, 45 days, rules 188, `review_evidence/repairs-20261111/probe/`): the household store held
nothing at 169 of 174 deaths with a home; 107 of 201 people died in a lean-to household; 21 of 43 exposure deaths were people in a lean-to
household, nearly all already heading for the lean-to or a fire, in rain or storm at -2 to -13 C. A lean-to gives a warmth bonus of 5 and
cover 0.55 (`needs.ts shelterAt`), which is below the death line at -6 C in rain; a hut gives 10 and full cover, and its people sleep inside.
On the lab's control arms at day 25 (rules 192) the twelve worlds had 3 to 10 solid homes for 12 to 39 people.

## The rule (rules 193, rich worlds)

`src/sim/hut_before_larder.ts larderHoldsHut`, asked by the hut gate. At 193 it never holds: a household in a lean-to is offered the hut when
it knows three trees and a rock and the settlement is old enough, as before, whatever the store holds. Unchanged: the person's own hunger and
thirst gate above it ("too hungry to start a building", a need, not a larder rule), the hut's small pull from a full larder in the score, the
site caps, the materials (8 wood, 4 stone, 520 work) and the private food-reserve and shelter plans, including the plan order that adopts a
food reserve before a shelter plan when a household can see it has next to nothing (that order is about which private plan is carried, not
about laying out or building the site).

Rules 192 and earlier, authored worlds and `setHutBeforeLarder(false)` keep the larder test.

## What it can change

More lean-to households lay out a hut, earlier, and the sites then compete for stone, which is production-limited (rules 162). Whether more
huts get finished, and whether fewer people die of exposure, is the paired lab's question below. No benefit is claimed beyond what it shows.

## Evidence

- Contract tests `tests/hut_before_larder.test.ts` (6), each with the rules-192 contrast: an empty-store household is held back at 192 with the
  recorded reason and offered the hut at 193; three food per member in hand was offered at 192 already; a starving adult is still told to eat
  first at 193; the switch and an authored world keep the larder test.
- `npm run typecheck` passed; `tests/winter_shelter.test.ts` and `tests/rules_version.test.ts` pass beside it.
- Immutable pin `tests/v193_continuation.*` (Normal gen-2, arrivals on, 5,000 ticks then 120 after a save and load; somebody in a lean-to
  household with less than three food per member to hand lays out a hut by tick 4,875), recorded from a clean checkout of `e3c43277`. In the
  same probe river reached it at 4,950, cedar at 10,400 and birch at 12,775.
- Paired lab (`scripts/lab_versions.ts`, 12 seeds, Normal, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`, rules 192 pinned with `--rules 192` against current rules 193, clean checkout of `e3c43277`, `dirty` false): solid homes 5.7 against 7.7 at day 25, +2.0 [+1.5, +2.4], higher in 12 of 12 seeds, larger than chance, the one row beyond chance; deaths 8.4 against 9.6 (+1.2 [-0.2, +2.7], up in 8 of 12), people 23.4 against 22.4 (-0.9), mean hunger 50.2 against 49.6, homeless 1.2 against 0.9: not distinguishable from chance; first yard day -3.1 systematic inside its floor. More huts get built and no survival benefit is shown inside 25 days; deaths lean up and stay inside the floor. Twin (clean `e3c43277`): the final world differs in 12 of 12 seeds, conservation 24 of 24.

What the lab says in words: the rule does what the owner asked, two more solid homes per settlement by day 25 in every seed; it does not show fewer deaths in that
window, and the stone that huts need is still production-limited (rules 162), so more sites compete for it. Evidence: `review_evidence/repairs-20261111/lab193/`,
`twins/r192-r193/`.
