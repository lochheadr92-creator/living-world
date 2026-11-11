# The carrying stream: rules 205, a pack that is put down

Owner instruction, 11 November 2026: when people fill their packs with building materials they should go and drop them off at the proper place, and they should
carry only the food and water they require, "just enough so if they go critical they can make it back to home and eat from their home storage". Stream claim:
205 to 209 (`docs/RULES_RANGES.md`). Rules 204 (a basket worth getting) is recorded in `docs/LIFE_STREAM.md`.

## What was measured first

No baseline was rerun. Two sources:

- The mechanism census of rules 196, already recorded (`review_evidence/balance-20261111/census`, twelve seeds, 25 days, counts a settlement): a stone pickup
  refused for want of room 4,637 times and a wood pickup 4,080; "Bring food home" on offer 4,733 times and chosen 455; 933 meals eaten out of the pack against
  149 from the home store.
- A new read-only probe, `scripts/pack_probe.ts` (four seeds, 12 days, rules 204, awake people of twelve and over, every 50 ticks;
  `review_evidence/carrying-20261111/report.txt`), because nothing recorded what a pack holds when a pickup is refused:

| | all moments | a stone pickup refused | a wood pickup refused |
|---|---|---|---|
| share of all moments | | 12.5% | 8.9% |
| how full the pack is | 52% | 93% | 95% |
| wood, share of the weight | 41% | 49% | 45% |
| food, share of the weight | 27% | 28% | 31% |
| food portions carried | 2.1 | 3.4 | 3.7 |
| no trip that would empty the pack on offer | 68% | 40% | 35% |
| the household has a home, and how far | 95%, 9.6 tiles | 93%, 10.4 | 92%, 10.6 |

Water is not carried: 0.02 of a unit on average. People drink at the well or the water. So this version has no water rule.

## Rules 205, two separately switched parts (`src/sim/light_pack.ts`, `pack_materials.ts`)

| part | what changes | lab removal |
|---|---|---|
| ration | A person with a home store they know keeps one portion of food (before: two, three when hungry). Bringing the rest home scores 8 more and up to 10 more as the pack fills past half. The last portion is kept for the road: with food known at home, home within 240 ticks and hunger above 30 it is not offered as a meal. A meal eaten at a store leaves the ration. | `rich-no-ration` |
| materials | A delivery to a site gains up to 10 as the pack fills past half. Wood and stone nothing of theirs needs is put down in their own home store from a pack three quarters full. | `rich-no-pack-materials` |

`rich-no-light-pack` removes both and equals rules 204. Contract tests `tests/light_pack.test.ts` (14, each with the rules-204 contrast). Immutable pin
`tests/v205_continuation.*` (Normal gen-2, arrivals on; a trip home carrying the mark of rules 205 under way by tick 100; then 120 ticks after a save and load),
recorded from a clean checkout of `1377966f`.

## The lab

Clean checkout of `1377966f` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, `nudge:1`, `nudge:2` and the three removal arms, 72 arms
in 25 minutes 41 seconds. Compared with the rules-204 lab already recorded. Evidence: `review_evidence/carrying-20261111/r205/`, `versions-204-205.txt`,
`run205.txt`.

Rules 204 against 205 (`scripts/lab_versions.ts`, the control and the two nudges of each lab):

| measure | 204 | 205 | verdict |
|---|---|---|---|
| preparation plans finished | 5.5 | 12.2 | larger than chance, higher in 12 of 12 seeds (units put by 363 to 601) |
| food in the home store, a person | 0.2 | 0.5 | systematic, within the noise floor, higher in 11 of 12 |
| chats | 112.9 | 128.3 | systematic, within the noise floor, higher in 11 of 12 |
| share of waking time hungry | 0.54 | 0.60 | larger than chance, higher in 12 of 12 |
| mean hunger (higher is better fed) | 54.8 | 51.1 | systematic, within the noise floor, lower in 12 of 12 |
| child play | 67.3 | 54.6 | larger than chance, lower in 12 of 12 |
| family time | 78.6 | 68.7 | larger than chance, lower in 11 of 12 |
| foraging practice | 119.1 | 100.5 | larger than chance, lower in 11 of 12 |
| buildings | 34.7 | 32.7 | systematic, within the noise floor, lower in 10 of 12 |
| solid homes | 11.9 | 11.3 | systematic, within the noise floor |
| people (31.0 and 30.1), deaths (1.9 and 2.4), deaths from hunger (0.5 and 0.9), tools, projects done, mood | | | not distinguishable from chance |

Each part, removed inside rules 205 (reference: the mean of the control and the nudges):

| measure | 205 | ration removed | materials removed | both removed |
|---|---|---|---|---|
| trips home with food beyond the ration | 594 | 0 | 553 | 0 |
| meals from a store | 369 | 140, larger than chance | 352 | 145, larger than chance |
| meals from the pack | 791 | 949, larger than chance | 792 | 946, larger than chance |
| preparation plans finished | 12.2 | 6.2, larger than chance | | 5.6, larger than chance |
| share of waking time hungry | 0.60 | 0.55, larger than chance | 0.61 | 0.54, larger than chance |
| child play | 54.6 | 65.9, larger than chance | 52.9 | 69.2, larger than chance |
| foraging practice | 100.5 | 112.3, larger than chance | | 121.3, larger than chance |
| trips home with wood or stone nothing needed | 11.9 | 15.3 | 0 | 0 |
| site deliveries | 187 | 196 | 175 | 200 |
| day of the first yard | 8.8 | | 11.8, larger than chance | |
| deaths | 2.4 | 1.9 | 3.9, larger than chance | 2.7 |
| buildings | 32.7 | 30.9 | 30.1 | 33.8 |

## What that supports, and what it does not

- **The ration part does what was asked.** Meals from a store go from about 145 to 369 a settlement and meals out of the pack fall; food sits in the home
  store; and twice as many food-reserve plans are finished. All beyond chance.
- **It costs what the day's other work was trying to raise.** People are hungry for 60 percent of their waking time instead of 54, child play falls by a fifth
  and family time and foraging practice fall with it, all beyond chance, and buildings lean down. The removal arm puts every one of those on the ration part.
  The likely reason is the walking: 594 trips home a settlement in 25 days is nearly one a person a day, most of them to put down a single spare portion, and a
  hungry person near home now walks there to eat. Deaths, and deaths from hunger, are not distinguishable from chance.
- **The materials part is small and leans right.** Only 12 trips home with spare wood or stone a settlement, so the pack was rarely full of material that
  nothing needed. Without the part the first yard comes three days later and deaths are 3.9 against 2.4, both called larger than chance by the lab; no mechanism
  for the deaths has been traced, so that is recorded and not claimed.
- **Open for the owner.** The ration part as built is a trade: the behaviour asked for, at a cost in hunger time and play. Three ways on: keep it; switch it
  off; or tune it in a rules 206 so that the trip home is made when the pack is filling (three or more spare portions, or a pack three quarters full) instead of
  for every spare portion, which keeps "only what they need" and removes most of the walking. The tune is the recommendation; it needs one lab against this one.
- Not run: the full suite at this head. A handcart is still never built.

## Rules 206: the ration is two portions

The owner's answer to the rules-205 result, 11 November 2026: "maybe one extra piece of food for a carry limit". From 206 a person with a home store keeps two
portions and takes home what is beyond them; the portion held for the road is still the last one; a meal at a store leaves up to two and eats what it took from
the store first (`src/sim/light_pack.ts`; lab removal `rich-ration-one`, which is rules 205). A second idea, mine and not the owner's, is measured in the lab
only and is off in every world: `rich-filling-trips` makes the trip home with food only from a filling pack (three spare portions or more, or three quarters
full).

Contract tests `tests/ration_two.test.ts` (9, each with the rules-205 contrast). Immutable pin `tests/v206_continuation.*` (Normal gen-2, arrivals on; a trip
home that leaves two portions in the pack under way by tick 100; then 120 ticks after a save and load), recorded from a clean checkout of `4f890d31`. One
correction on the way: `8b4fa6f2` was committed before its test batch was read and said no existing test newly failed; one had
(`tests/preservation.test.ts`, a meal at a drying rack eating the person's own grain and leaving the rack's meat in the pack). `4f890d31` repairs the behaviour
and corrects the record.

Lab: clean checkout of `4f890d31` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, `nudge:1`, `nudge:2`, `rich-ration-one` and
`rich-filling-trips`, 60 arms in 17 minutes 26 seconds. Compared with the rules-205 lab already recorded. Evidence:
`review_evidence/carrying-20261111/r206/`, `versions-205-206.txt`, `run206.txt`.

| measure | 204 | 205 (one portion) | 206 (two portions) | 206 with filling trips | 205 to 206 |
|---|---|---|---|---|---|
| trips home with food beyond the ration | 0 | 594 | 477 | 469 | larger than chance, fewer |
| meals from a store | 145 | 369 | 244 | 248 | larger than chance, fewer |
| meals from the pack | 946 | 791 | 895 | 903 | larger than chance, more |
| preparation plans finished | 5.5 | 12.2 | 9.3 | 10.1 | systematic, within the noise floor, fewer |
| share of waking time hungry | 0.54 | 0.60 | 0.59 | 0.58 | not distinguishable from chance |
| child play | 67.3 | 54.6 | 55.2 | 55.0 | not distinguishable from chance |
| family time | 78.6 | 68.7 | 66.9 | 68.2 | not distinguishable from chance |
| foraging practice | 119.1 | 100.5 | 98.8 | 100.1 | not distinguishable from chance |
| people | 31.0 | 30.1 | 29.4 | 30.2 | not distinguishable from chance |
| deaths | 1.9 | 2.4 | 3.0 | 2.2 | not distinguishable from chance |

The 204 column is the rules-204 lab's own control and nudges (for trips and meals, the rules-205 lab's arm with both parts removed, which is rules 204).

What that supports:

- **Two portions gives back part of what the ration did and none of what it cost.** A fifth fewer trips home and a third fewer meals from a store, both beyond
  chance; the hunger time, the child play, the family time and the foraging practice stay where rules 205 put them.
- **Going home only from a filling pack changes nothing either.** Trips fall from 477 to 469 and nothing else moves.
- **So the cost is not the number of portions and not the small trips.** It sits somewhere else in the ration part: the weight that bringing food home gained,
  the portion held for the road, or what the rule does to children, whose pack holds five. That is not attributed yet. The next step is a read of a child's day
  at rules 206 with the probe of the childhood plan (`scripts/childhood_probe.ts`), against its recorded rules-203 baseline.
- Open for the owner, as at 205: the ration part is a trade. Nothing here argues for two portions over one.

Found after this section was written, while testing rules 207: `tests/iron_chain_stall.test.ts` ("adults who know a standing smithy and a kiln see
charcoal made"), one ordinary meadow world run for 24 days at the current rules, passes at rules 203, 204 and 205 and fails at 206 and 207: no charcoal is
made in that world. The file was outside the 112 related files run for rules 206, so the statement that no existing test newly failed at 206 was true of
that set and not of the suite. It is one seed, so it does not show that the two-portion ration harms the charcoal chain in general; it is a second reason,
beside the lab, not to prefer two portions.
