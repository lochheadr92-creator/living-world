# Why a walker chooses store A, then B, then A

In River, person 1112 set out to bake household bread. The baking goal survived the entire sequence. The planner changed which oven the bread was for as the person walked.

| Decision | Intended oven | Next collection |
|---|---|---|
| Initial trip, first sampled at tick 230423 | B (172895), inferred from the departure-position replay | Water from A (50988) |
| Review at tick 230524 | A (50988) | Two flour from B |
| Review at tick 230579 | B (172895) | One water from A |

At each review, the diagnostic generated the options again using that tick's inventory, beliefs, needs and activity, first at the actual position and then at the position where the leg began. At the first review, moving the diagnostic person back restored the water offer and the request for bakery B. At the second, it restored the flour offer and the request for bakery A. The return happened 55 ticks after the first turn. These are observed offers. Collection and delivery happen later.

## What removes the option

1. In `src/sim/production.ts`, `facilitiesOf` sorts known usable workshops by estimated walking time from the person's current position. `supply` takes the first one for the recipe.
2. `planRecipe` recalculates what that workshop lacks using remembered bench stock. One bakery can need water while another needs flour.
3. `collectOptions` excludes the intended workshop as a source for itself. As a walker approaches the supply bakery, it can become the intended oven. The original water request can disappear, and the same bakery is also ineligible to supply its own missing inputs.
4. In `src/sim/decision.ts`, `currentUtility` gives a keyed activity zero when the key is missing. A replacement with utility above three can then take over after minimum commitment. Walking back reverses the relative travel times.

## Coverage

The six original 13-day rules-257 continuations contain 370 linked A–B–A sequences. They can overlap. Of those, 277 were between two bakeries, 52 between two smithies and seven between two kilns. All three legs had the same recorded goal text in 343 cases and the same wanted item kinds in 113. Matching archive text can include a truncated goal. Trip rows alone cannot identify why an option disappeared.

The replay covered the first day of all six continuations, then one additional day in Aspen day 96 and Gen-4 day 48 to capture returns in those worlds. The ten River archive chains match the replay by person and all three activity IDs. The hooks saw an additional River sequence outside the prior archive linkage criteria. Counts below use the original archive definition.

Of 21 matched chains, 20 had the same two-workshop reversal at both turns (Aspen 6/6, Gen-4 5/5, River 9/10). At both turns a change of position alone restored the previous exact option, and the requests identified the reversed source and destination. In 19 of 21 chains the first store had no withdrawal offer at all at the first turn. In the other two it still offered a different withdrawal. In 20 of 21 the final store and item matched the initial pair.

One River exception involved three ovens. At the first switch, moving person 49530 back restored the water option for a third oven. At the second switch the planner still changed ovens with position, but the previously eligible source now had zero counted flour at the old position. Moving back alone could no longer restore that offer. The diagnostic did not establish why its counted flour changed.

## Implication for job commitment

A targeted experiment would retain the selected workshop while a person fetches inputs for that job, then recheck shortages, usable stock, access and urgent needs normally. A switch to emergency water or away from danger should still work. Measure completed deliveries and batches alongside reversals, walking time and survival. These runs diagnose the existing behaviour. The effect of that change is unknown.

## Reproduction

Run from the feature worktree. Set `$id` to each of aspen-day48, aspen-day96, gen-4-day48, gen-4-day96, river-day48 and river-day96. Use one day for all six and two days for the two extended cases, appending `-2d` to those output filenames.

```powershell
node scripts/walk_step4_archive.mjs --returns "$env:TEMP/lw-store-returns-370.json"
node node_modules/vite-node/dist/cli.mjs --config scripts/store_return.config.ts scripts/store_return_trace.ts -- --days 1 --rules-up 257 --load "C:/dev/lw_saves/rules256/$id.save.json" --reference "review_evidence/pack-20261119/$id.json" --out "review_evidence/store-return/$id.json"
node scripts/store_return_summary.mjs "$env:TEMP/lw-store-returns-370.json"
```

All six first-day end hashes matched the existing controls. Each replay checked item conservation. At every sampled cross-store switch, the old key's presence and the chosen new key in the diagnostic options agreed with the actual decision. The two-day checks additionally match the archived activity IDs. The planner trace is inserted only by the diagnostic Vite configuration.

## Rules 259 comparison after the fix

Each pair starts from the same rules-256 save raised to 259, arrivals on. The off arm disables only workshop errand retention. Counts cover age 12 and over. An immediate return links two consecutive travel-review switches for the same person by activity ID and requires the third destination to equal the first. This hook method includes one additional River chain beyond the strict archived trip linkage.

| Start and duration | Cross-store switches, off to on | Immediate returns | Successful withdrawals | Successful deposits | Successful workshop operations |
|---|---:|---:|---:|---:|---:|
| Aspen day 96, two days | 33 to 5 | 6 to 0 | 73 to 64 | 174 to 172 | 33 to 35 |
| Gen-4 day 48, two days | 13 to 1 | 5 to 0 | 150 to 163 | 213 to 228 | 46 to 44 |
| River day 96, one day | 33 to 9 | 11 to 0 | 55 to 83 | 128 to 150 | 30 to 26 |

River person 1112 completed the water collection from bakery 50988 for oven 172895 at tick 230556 in the enabled arm. In the removal arm that walk ended in a switch at 230524. Every pair passed item conservation and retained all people alive at the start. These windows were selected because they contained reversals. The counts describe these runs, and the workshop operation totals include all successful operations during the window. Longer-term effects on production, survival and leisure are unknown.

To reproduce, run the following twice for each start and duration in the table, once with `--off` and a separate output filename. All six outputs are beside this report.

```powershell
node node_modules/vite-node/dist/cli.mjs scripts/workshop_errand_probe.ts -- --rules-up 259 --days 1 --load C:/dev/lw_saves/rules256/river-day96.save.json --out review_evidence/store-return/river-day96-259-on.json
```
