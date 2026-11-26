# Ulric offers Pavel a drink

Two independent gen-4 replays start on day 96 from the rules-256 save raised to 259. Fork at each original welfare departure and follow the pair through day 97. Four runs passed conservation. Doorway-only controls reproduced both committed end hashes. At contact the two people shared room 6117, Ulric carried the one water offered, and the standard transfer moved zero.

| Departure → contact | Pavel’s hydration, control | Pavel’s hydration, direct drink | Control day-97 hash | Drink day-97 hash |
|---|---:|---:|---|---|
| 232179 → 232224 | 37.92 → 37.92 | 37.92 → 73.92 | 745a9b85 | 58c9aed1 |
| 232412 → 232470 | 33.19 → 33.19 | 33.19 → 69.19 | 4c380763 | bd5e23ae |

Both visits found a toy (0.25 weight), nine seeds (2.25), two grain (2), two berries (2), and one wood (2). Pavel had 0.5 weight free out of 9. One water weighs 1.5. The last inventory change was one wood added at tick 231434, taking the load from 6.5 to 8.5. His inventory then stayed the same through both contacts and the day-97 cutoff. The tick-by-tick inventory changes are in the JSON files.

The diagnostic tries the ordinary inventory transfer first. When it fails in this exact case, Pavel takes one drink during the completed welfare interaction. The test consumes one water from Ulric with the ordinary consumption ledger, gives Pavel the standard 36 hydration points, and applies the successful visit concern/cooldown handling. His pack stays at 8.5 and never holds that water. There were zero subsequent Ulric-to-Pavel visit launches in either control or either direct-drink replay. Each starts from its own original decision; the later starting hydration is not a consequence of the earlier experimental drink.

Build with node scripts/build_visit_door.mjs <bundle.cjs>. Run node <bundle.cjs> --load C:/dev/lw_saves/rules256/gen-4-day96.save.json --rules-up 259 --arm door --tick <232179 or 232412> --water-test <observe or drink> --out <file.json>. TypeScript and the 48 known-welfare, resident-care and water-budget tests passed. The experiment measures immediate consumption in these encounters only.
