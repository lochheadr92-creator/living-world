# The hall repair (rules 281)

Asked for: Ryan, 27 November 2026, "build hall fix", after the community-building count (`C:\dev\lw_labs\community_use\summary.txt`, rules 264)
and the brain `loops.md` line of 27 November. Code: `src/sim/hall_repair.ts`. Tests: `tests/hall_repair.test.ts`. Pin: `tests/v281_continuation.*`.

## What was wrong

- News never passed at a hall. `meals.ts` hallGossip ran when `tick % 90 === 17`, inside mealTick, which runs only when `tick % 10 === 3`.
  No tick satisfies both.
- Shared meals at a hall failed on the walk. The spot a host or guest walks to is the meal place with a spread (`meals.ts` mealSpot). At a hall
  it could fall on a tile nobody can stand on. Probe of aspen-day96 and gen-4-day96 at rules 279 (`C:\dev\_claude_scratch\hall`): 2 of the
  4 starts there had such a spot and ended "no way to get there"; the other side then waited out the window or found no meal.
- Nothing sent anybody to a hall outside a called gathering. At rules 279 people of 12 and over spent 0.1% of waking time at or going to one.

## The rule

Three parts, each switched (`rich-no-hall`, `rich-no-hall-news`, `rich-no-hall-table`, `rich-no-hall-evening`).

- **news.** From 281 the hall's phase is `tick % 90 === 3`, a tick mealTick runs on: one telling every 90 ticks between two people within
  4 tiles of a hall's middle, as the code always meant.
- **table.** A meal spot on a tile nobody can stand on becomes the nearest walkable tile within 3 (rings in a fixed order, no draw).
- **evening.** Beside the evening at the fire (`evening_fire.ts`, rules 216), a free evening may be spent at a sound hall (condition above 15)
  within reach of home: worth what the fire is worth, more for each person seen there, more in rain, storm or cold (the term the occasions
  use for a hall). One or the other each evening. Finished, it is company as at the fire. No story or song is told at the hall in this version.

## Measured (27 November 2026)

The same ten runs as `docs/BEDTIME.md` at rules 280 (`b4bd47ba`) and 281 (`5cb46296`); descriptions of two sets of runs, not effect sizes;
no removal arm run. `C:\dev\lw_labs\free_time\r280\report.txt`, `r281\report.txt`.

- Hall meal walks (probe, aspen, gen-4 and river day 96, 4 days): at 279, 11 starts, 2 with a spot nobody could stand on, 7 of 11 ended
  done; at 281, 10 starts, all on walkable tiles, all 10 ended done.
- Evenings, people of 12 and over, the three day-96 saves (the only runs with halls): evening at the hall 0.0% to 0.8% of waking time
  (plus 0.4% walking to it); evening at the fire 2.2% to 1.6%; free time at it 12.0% both. All ten runs: free time at it 10.5% both.

So the hall is used in the evening now, mostly by people who would have sat at the fire. It moves company under a roof and puts the
news exchange there; it does not add free time.

Not measured: how many tellings pass at a hall (only the arithmetic of the phase is tested); weather at the time of each evening; runs past
6 days in a settlement with a hall; the look in the app.
