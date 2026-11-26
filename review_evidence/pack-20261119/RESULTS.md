# Step 3. Does putting materials down at home make gathering trips worthwhile?

**Decision. Keep rules 257 as measured.** Unloading before a stocking trip that starts within two tiles of home could reach at most **230 of 4,682** small, space-constrained gathers (4.9%). Each of the six starts falls below 6%, against the 50% reach threshold written before replay. This ceiling assumes free shelves, zero detour and permission to drop every unit of wood, stone, clay and seed. Some of these loads would still be small because the source holds too little or the person wants less.

Across three settlements at days 48 and 96, 7,783 of 10,757 successful gather walks with a positive measured pack gain ended with at most two units gained. In 4,682 of those trips the starting pack could hold at most two units of the target item. These figures describe 13 days at each start with arrivals and workshop access on. The two ages of a settlement share a history.

## What the trips were for

Of those 4,682 constrained gathers, 2,040 were for stocking. The original design asks about trips with a plan above two, but the food planner already caps a stocking plan by pack room. Only **seven stocking trips** appear in the 647-trip group selected by that test. Of those 647, **631 were to eat**. A hungry gatherer can consume food at the source even with a full pack. A small change in pack contents cannot establish whether the trip fed the person. The other nine were six animal-care trips, two for fire and one for a site. Departure room and planned amount describe different instants and should not be assumed identical. The movement record measures the change in pack contents after work and cannot by itself establish later delivery.

| Start | Positive gathers | Gain of 1–2 | Space-constrained | For stocking | Near-home upper bound | Plans above two | To eat among those plans |
|---|---:|---:|---:|---:|---:|---:|---:|
| Aspen 48 | 1409 | 999 | 568 | 213 | 25 (4.4%) | 83 | 78 |
| Aspen 96 | 2320 | 1579 | 999 | 485 | 53 (5.3%) | 83 | 80 |
| Gen-4 48 | 1306 | 903 | 666 | 308 | 38 (5.7%) | 76 | 75 |
| Gen-4 96 | 2251 | 1749 | 1066 | 478 | 47 (4.4%) | 167 | 165 |
| River 48 | 1316 | 885 | 532 | 204 | 24 (4.5%) | 55 | 53 |
| River 96 | 2155 | 1668 | 851 | 352 | 43 (5.1%) | 183 | 180 |

## What was actually spare

Each first-day replay matched 100% of the selected actors, activity IDs and pack contents at departure. Counts below are units carried across 369 departures. An item carried on two different departures counts twice.

| Item | Reserved or on an errand | Needed under current rules | Spare |
|---|---:|---:|---:|
| Wood | 218 | 222 | 6 |
| Stone | 64 | 131 | 3 |
| Seeds | 0 | 1,031 | 532 |

Only 9 of 644 wood and stone units were spare. Seeds were more often spare, but four seeds weigh the same as one unit of grain. The current wood-and-stone deposit option was available at 5 of the 369 departures. It requires spare materials, a pack at least three quarters full, manageable drives, a remembered home and room there. Seed storage has its own option. The per-start JSON gives the breakdown for every item. Food, water and equipment were protected in the room calculation. Among 79 units of clay, three were explicitly reserved. The existing wood-and-stone spare calculation does not certify the other clay as disposable.

Of the 49 first-day departures that met the original design test, releasing spare wood, stone and seeds restored the planned room in **5 of 49**. Even treating every carried unit of clay as disposable raised that to only **13 of 49**. That misses half for this sample. The full 13-day packs alone could make the answer look very different: ignoring all claims on all four materials and any travel to a store would restore room in 602 of 647. Outside the first day the trace does not establish which of those materials the person could actually spare.

| Start | First-day constrained departures | Plans above two | Restored by spare materials | Restored with all clay too | Wood/stone deposit offered |
|---|---:|---:|---:|---:|---:|
| Aspen 48 | 23 | 4 | 0 | 0 | 0 |
| Aspen 96 | 62 | 13 | 3 | 4 | 1 |
| Gen-4 48 | 51 | 9 | 0 | 3 | 1 |
| Gen-4 96 | 95 | 7 | 0 | 1 | 0 |
| River 48 | 46 | 8 | 1 | 3 | 0 |
| River 96 | 92 | 8 | 1 | 2 | 3 |

## Baseline walking, delivery and survival

Walking ticks per unit includes interrupted and empty gather walks in the numerator. The denominator is the positive measured pack gain from finished gather jobs. Deposit units are measured pack losses on completed deposit jobs. Hunger is the share of awake person-ticks across all ages with hunger below 62.

| Start | Units per positive gather | Gather walk ticks per unit | Deposit walks | Deposit walk ticks | Deposit units | Completed walk jobs | Ending store food | Hungry awake | Deaths |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Aspen 48 | 2.01 | 50.4 | 1016 | 64391 | 1688 | 7519 | 721 | 49.8% | 0 |
| Aspen 96 | 2.07 | 48.3 | 2699 | 164837 | 2837 | 14601 | 1324 | 43.9% | 0 |
| Gen-4 48 | 2.09 | 36.6 | 1118 | 75681 | 1901 | 8123 | 638 | 50.9% | 0 |
| Gen-4 96 | 1.82 | 77.7 | 1770 | 121297 | 2224 | 13461 | 749 | 53.7% | 1 |
| River 48 | 2.14 | 41.1 | 1260 | 83964 | 2032 | 8038 | 921 | 47.8% | 0 |
| River 96 | 1.83 | 100.2 | 1096 | 76290 | 1772 | 11548 | 779 | 59.6% | 0 |

The walking figures use the age band recorded when a trip opened (12 and over). The earlier observer's age-split check fails in some runs, so these ticks do not establish an exact share of adult waking time. The candidate failed its reach test before a changed-behaviour arm was warranted. Its effects on walking, hunger, deliveries and survival are unknown. A scoring penalty for small gathers also lacks support here because a small carried load can accompany a useful meal. The decision applies to pre-stocking departures within two tiles of the home centre. The effect of returning home from farther away remains open.

## Reproduce

Rules-256 saves were explicitly raised to 257 for measurement. Each per-start JSON names its save, initial hash, and first-day replay hash. The six observed replays ended at the same hashes as their respective unwatched twins and passed item conservation. The source window, cohort and decision thresholds are in [the reading](READING.md). The clay calculation is a sensitivity check. Raw controls are local and can also be generated with [the withdrawal runner](../withdraw-baseline-20261119/launch-fix.ps1).

Run from the feature worktree for each seed (aspen, gen-4, river) and each start (48, 96). For example:

```powershell
node node_modules/vite-node/dist/cli.mjs scripts/pack_step3.ts -- --load C:/dev/lw_saves/rules256/aspen-day48.save.json --rules-up 257 --trips review_evidence/withdraw-baseline-20261119/fix-runs/aspen-day48-on.json --out review_evidence/pack-20261119/aspen-day48.json
```
