# Cora’s food from the hut to the next meals

Gen-4, household 76331, rules 259, days 96–109. Cora’s stocked-home score correctly reported when hut 100038 was empty. It omitted edible supplies the family actually used from cellar 132381 and from their packs. The four members and the hut stayed the same throughout. The score is food units physically in the hut divided by 48 (12 per household member), recorded twice a day to two decimals.

## The final delivery

| Tick | What happened | Hut afterward |
|---|---|---|
| 259090 | Cora deposited three fruit. The hut previously held only five berries. | 3 fruit, 5 berries |
| 259979 | One berry spoiled. At check 260005 the recorded score was 15% (7/48). | 3 fruit, 4 berries |
| 260367 | Abel II took all three fruit for a meal. The nourishment and consumption records show one fruit eaten at each of ticks 260376, 260386 and 260396. | 4 berries |
| 260939 | One more berry spoiled. | 3 berries |
| 261200 | Zeke took the three berries for his meal. Cora’s next recorded score, visible at tick 261205, was zero. Zeke ate the berries at 261209, 261219 and 261229. | Empty |

These were the only three fruit in the hut between Cora’s delivery and Abel II’s withdrawal. The simulation tracks counts by item. The uninterrupted fruit balance connects this delivery to all three bites. The berries were already in the hut. The score fell before Zeke had finished eating.

## The earlier peak and the whole winter

At check 233605 the hut held ten fruit (21%). Before check 237205, **six spoiled** and **Zeke took four** for meals. At the zero check, the family had twelve food units in its cellar and ten in its packs. Across the full 13 days, 56 units arrived in the hut, 36 went into household members’ packs for meals, one fruit was eaten directly at the hut by Jonas II from outside the household, and 19 spoiled. The opening and closing balances were both zero. Every tick’s net change reconciled. Transfers intended for a meal and actual bites were counted separately.

## What else the household could use

* At all 13 scheduled checks showing zero, at least one living member carried edible food. A unit in one member’s pack requires a handover to feed someone else.
* At the final zero check the cellar contained ten fruit and three berries. The packs held another nine berries. At day 109 the household still held these totals, although the individual pack contents had changed. The 22 units equal 46% of the 48-unit target on the same unit basis if both locations are included. The household-owned cellar alone contributed 13/48, or 27%. These are alternative readings of the same inventory.
* The family demonstrably ate from the cellar. Zeke took three fruit there at 237489 and ate them at 237498, 237508 and 237518. Over the run there were 24 recorded bites targeting the cellar: 14 for Zeke, seven for Abel II and three for Yan.
* At day 109 the three granaries contained food, but the household had no shares and none of its four members had a positive withdrawal allowance. No communal bin stock is included in the 22.

**Interpretation.** The hut score can fall for two materially different reasons: a meal fed somebody or perishable food was lost. It also reads zero when the family has an established food supply in a cellar. For a household reserve measure, count the household’s accessible stored food and report carried food separately. This one household establishes the accounting gap. Its effect on decisions or survival would require a separate comparison.

## Verification and reproduction

Input was the rules-256 Gen-4 day-96 save reinterpreted at rules 259, with arrivals on. The trace reproduced every one of Cora’s 15 recorded changes (seven rises and eight drops), the archived day-109 hash `6937c1e6`, and conservation. The diagnostic build observes native consumption and spoilage debits alongside transfer and nourishment hooks. See TABLES.md for balances and gen-4.json for chronological events and permission snapshots.

From this worktree, build with `node scripts/build_cora_food.mjs <bundle.cjs>`, run the bundle with `--load C:/dev/lw_saves/rules256/gen-4-day96.save.json --rules-up 259 --out review_evidence/cora-food/gen-4.json`, then run `node scripts/cora_food_tables.mjs`.

