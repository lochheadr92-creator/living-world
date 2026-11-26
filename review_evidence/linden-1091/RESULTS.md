# Who brought food home to the Lindens, and when the children ate

Aspen, day 96 to 109, rules 259, arrivals on. Household 1091 starts with Ines, Quinn, Wren, Nora (age 5) and Cass (age 2). The two named children are present throughout all four runs. A third child appears during each run, with different identities across branches, so the child-to-child comparison below follows Nora and Cass.

## Food reaching the hut

With retention off then on, Quinn delivered 41 then 3 edible units, Ines 15 then 2, and Wren 41 then 33. All 97 and 38 units reconcile to the three adults. Quinn began 16 home-food deposit trips with retention off (15 successful, one interrupted) and one with retention on (successful). Ines began 10 versus one, and Wren 19 versus 19. The main loss was upstream of arriving at the hut.

Quinn gathered 87 versus 20 berries. Across edible kinds Quinn gathered 105 versus 52 units; grain and fish also went to other buildings. Quinn deposited 8 versus 21 edible units at granaries and 8 versus 18 at cellars. During days 97–100, completed Quinn activity spans clipped to that window account for 2,001 versus 400 ticks gathering. With retention on Quinn spent 1,109 ticks harvesting and 778 fetching water during that window. These activities include their travel and working phases. By the end of day 100 the family had delivered 59 units with retention off and zero with it on. Its first recorded restored workshop option in the all-on replay was on day 101.

## What the children experienced

| Outcome, off → on | Nora | Cass |
|---|---:|---:|
| Food units taken directly from their home to eat | 13 → 4 | 14 → 7 |
| Food units given by Quinn | 8 → 4 | 13 → 5 |
| Recorded portions consumed, all sources | 36 → 35 | 44 → 33 |
| Median gap between consumed portions, ticks (upper middle observation) | 747 → 854 | 653 → 805 |
| Longest gap, ticks | 2,626 → 2,349 | 1,800 → 2,197 |
| Waking ticks hungry with no pack or home food | 6,353 → 14,437 | 5,347 → 14,883 |

## Which part depended on whose errands?

One day-96 save, four deterministic interventions. The two household-specific runs gate both the marking of new workshop-input withdrawals and restoration of the matching option by the actor's household at decision time. Other rules and settings are the same.

| Retention enabled for | Food delivered to the hut | Nora + Cass shortage ticks | Nora / Cass portions |
|---|---:|---:|---:|
| Nobody | 97 | 11,700 | 36 / 44 |
| The Lindens alone | 88 | 17,977 | 37 / 35 |
| Everyone except the Lindens | 36 | 26,939 | 36 / 34 |
| Everyone | 38 | 29,320 | 35 / 33 |

Keeping other households' errands was sufficient to reproduce the home-delivery collapse and most of the increase in child shortage time in this save. Turning the Lindens' retention on when everyone else already retained errands added two delivered units, yet Nora and Cass spent 2,381 additional shortage ticks. Turning it on against the all-off background added 6,277 shortage ticks. These effects depend on what others do and should not be added together. This experiment does not isolate a particular outside household or transaction.

The all-on planner restored a workshop option at two travel reviews for household 1091, both Quinn's, both while Cass was in shortage. At tick 243528 food handovers to the children were available, but bringing water for baking was the highest-ranked alternative. The actual withdrawal ended empty 39 ticks later. Cass ate from a store 123 ticks after the review. At tick 253144 collecting grain for flour ranked first among the other options; the care options were visits. Quinn's withdrawal succeeded 16 ticks later. Neither recorded review had feeding a child as the highest-ranked alternative. In the household-only arm the first restoration instead competed with gathering to stock the household. These are observed rankings, not same-tick forced alternative executions.

## Evidence and reproduction

Prior day-96 trace committed on codex/withdraw-baseline-20261119 as ff46700b. Both full on/off end hashes match the committed winter runs (865567ff and f04d5c2a), and all four runs passed conservation. TypeScript checking passed. No simulation source file was edited. Run node scripts/build_linden_trace.mjs <output.cjs> in the measured checkout with the earlier recorded dependency patch. Run the bundle with --load C:/dev/lw_saves/rules256/aspen-day96.save.json --rules-up 259 --arm <off|on|only|except> --out review_evidence/linden-1091/<arm>.json and then node scripts/linden_summary.mjs. Each arm file contains tick-stamped activities, food transfers, paid nutrition, shortage boundaries and restored-option reviews. A tick is 1/2400 of a day.

[Household summaries and review records](summary.json) · [Original Aspen trace](../day96-trace/RESULTS.md)

