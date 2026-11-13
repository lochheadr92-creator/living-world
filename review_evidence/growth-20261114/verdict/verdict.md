# Verdict: rules 244, the next lever, rules 245, gen-4 (14 November 2026)

One run per seed throughout: a description, not a test. The season pairing is a new tabulation of the daily records in `gen244/` and `gen238/`.

## A. Do years 1 to 11 answer the famine?

**Yes for the famine as measured (75 to 125 people); not for the sizes beyond it. Confidence: fair.**

- Lean seasons are fixed by seed and fall on the same days in both rule sets (12 of 12 seeds), so each is a pairing. Of the 47 seasons the 244 worlds reached, one cost 10 percent or more of the people (gen-4, days 101 to 107, 115 to 94). The same 47 at 238: nine.
- Seasons that broke 238 were passed at 244 at a larger size: meadow 127 to 131 (238: 95 to 50; 244: 120 to 122), fern 121 (122 to 99; 110 held), gen-5 126 (119 to 90; 110 to 111). Seven 244 worlds passed a season at 104 to 120 people.
- gen-4 is closer to a control than a counter-example: the one world with no granary has the one famine, on the days it had at 238 (99 to 55). With no granary known, `grainGoesToBins` never applies.
- Cannot tell: anything above 128 people (the wild is capped near 578 units); the large 238 losses still ahead (aspen day 127, gen-1 137, river 162, cedar 164, birch 174, fern 183).

**Do not relaunch the twelve runs at 244.** Rules 246 supersedes them, and the open question (130 people and up) is reached by four years from the day-96 and day-84 saves, the saved 244 world being one arm of the 246 test. The twenty-year set belongs after 246, the 245 decision and the gen-4 repair, as the milestone.

## B. The next lever

Grain is not short; turning it into food is. About 1.7 grain a head a day is grown (38 hunger points raw against a need near 58); 58 percent is eaten raw, 28 percent lost, 2.3 percent milled. Baked, grain is worth about 2.7 times as much and keeps.

| rank | lever | expected effect | cost and risk |
|---|---|---|---|
| 1 | bakery and mill throughput | large: half the grain baked covers the need from farming alone | medium (recipes, batches) |
| 2 | gen-4's missing granary | removes the one famine | small once diagnosed (D) |
| 3 | bin spoilage, 12.6 percent | modest; tending scores 15 against 37, chosen 6 times in 857 | small |
| 4 | stocking drive | the lean-season reserve | see C |
| 5 | field rot, 15.5 percent | small until bread flows | one constant, `RIPE_ROT_TICKS` |

Raw-grain eating is a symptom (grain was the only food in 12,774 of 12,776 bites). Throughput (`grain/third-draft/bake-meadow.txt`): a firing takes five or six trips, each scoring 19 to 32 against a first choice of 38 to 44, for four loaves; the oven runs 1.6 firings a day of a possible 8.

**Rules 246, a full oven** (`src/sim/oven_load.ts`, new). A milling or firing takes one, two or three measures, the largest the household's counted grain covers (pack, its share of the bins, its exact home count).

- Bakery milling 4, 8 or 12 grain to 3, 6 or 9 flour; mill 6, 12 or 18 to 5, 10 or 15; firing 3, 6 or 9 flour with 2, 3 or 4 water and one wood to 4, 8 or 12 loaves. Work 1, 1.5 and 2 times; burn unchanged.
- Modules: `recipes.ts` (variants behind the existing `minRules` gate), `production.ts` (the bread want near line 780, `bringInputs`, `operateLeaf`), `facilities.ts`, `batch_plan.ts`. If a batch cannot vary, build one double measure and say so.
- Switches: parts `mill` and `bake`; lab arm `rich-no-oven-load`.
- Tests failing at 245, passing at 246: a staged bakery with 12 grain gives 12 loaves in one firing; 8 grain takes the double measure. Guards: 4 grain still bakes 4; the ledger conserved; switch off equals 245; older saves unchanged.
- Pin: meadow, just past its first double firing.
- Measure: no bakery stands before day 25, so check only that three seeds end day 25 on the hash of 245. Then from the saves (aspen, cedar, fern, meadow day 96; birch, river day 84), four years, four arms: 244 as saved, 245, 246, 246 with own stores off. Read loaves a day, bread's share of bites, food a head before each lean season, deaths, people. `--load` keeps a save's rules version, so a scripts-only option must raise it. Save every 12 days; launch detached.

**Not to do:** more plots; a loaf worth more; forbidding raw grain (the starving ate 201 units); two levers in one rules number.

246 goes first: every other lever moves grain that still ends up raw. The gen-4 diagnostic changes no rule and runs alongside.

## C. Rules 245

**Keep the knowledge; change the stocking drive if the four-arm run says so; do not drop it. Confidence: moderate.** The famine came of too little put by, and 245 halves it (933 to 540). The reason is in `hhState`: the target is 6 units a head, two days, and only the false count of one made households overshoot. Dropping 245 restores a false count that happens to work. If the 245 arm meets lean seasons with less a head or loses more people, the repair is its own rules number: a target in days of food on the true count (four days), bread counted at its worth (`foodCount` leaves it out).

## D. gen-4 never builds a granary

Source narrows it; a run must confirm. No granary site is in any of eleven year-end records, yet the same want code gave gen-4 a bakery in year 2 and a mill in year 3. What is particular to the granary is its ground: `findBuildSpot` looks only 3 to 11 tiles from the hub (bakery 5 to 14, kiln 7 to 15), and gen-4 is the most crowded world at year 1 (37 people, 29 homes). Likeliest: no free footprint, "no suitable spot", a 900-tick refusal, repeated. Otherwise: laid out and abandoned between year ends.

Diagnostic (there is no gen-4 save): replay gen-4 at 244 to day 36 saving every 12 days; from day 24 a read-only probe for twelve days: whether `facilityWants` returns a granary, which gate of `optPlanFacilities` stops it, the `plan_site:granary` refusals, and free footprints within 3 to 11 and 3 to 20 tiles.

## Orchestrator's next steps

1. Record this verdict in one GROWTH_PLAN section; no relaunch at 244. (Haiku)
2. Tabulate the 47 season pairings into the evidence folder. (Haiku)
3. Replay gen-4 to day 36 with saves, detached. (Haiku)
4. Write and run the gen-4 granary probe. (Sonnet)
5. Read how recipes and batches take quantities; confirm or reduce the 246 design. (Sonnet)
6. Build rules 246 with tests and pin. (Sonnet)
7. Add the scripts-only option that raises a save's rules version. (Sonnet)
8. Launch the four-arm, four-year run from the six saves, detached. (Haiku)
9. Read it: does 244 hold past 128 people, bread's share at 246, the reserve at 245. (Fable)
10. Choose 247 (granary ground or stocking target); schedule the milestone twenty-year set on the owner's word. (Fable)
