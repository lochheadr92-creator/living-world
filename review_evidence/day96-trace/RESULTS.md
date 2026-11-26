# What changed in the day-96 winter runs

The original winter results were committed on codex/withdraw-baseline-20261119 as 532645ea. Six diagnostic replays covered days 96–109 and reproduced each enabled/disabled end hash, total awake ticks, awake ticks aged 12+, walking ticks and hungry-without-food ticks. Two additional Aspen replays reproduced the original end hashes, awake counts and hunger counts while tracing the start of food-short spells. No simulation rules were edited. These are the same paired trajectories, with no new noise estimates for individual trip purposes.

## Walking by purpose

Changes are percentage points of waking time for people aged 12+. A walking spell is a contiguous series of walking samples within the same activity, including a spell already underway on day 96.

| Start | Net change | Largest increases and offsets |
|---|---:|---|
| Aspen | +0.21 | Walking to gatherings +0.47 (367 to 445 spells), to eat from stores +0.34 (413 to 481), to deposit goods +0.33. Gathering fell 0.25 and withdrawal walking fell 0.02. Within withdrawals, charcoal from smithies rose 0.44 while water from bakeries fell 0.47. The net change was inside the original 0.37-point control spread. |
| Gen-4 | +1.01 | Withdrawals +0.92 (2,124 to 2,265 spells), particularly dried fish from racks (+0.29) and water from bakeries (+0.24). Walking to sleep +0.44, to socialize +0.33 and to fetch water +0.31. Gathering fell 0.44. The original walking spread was 0.66. |
| River | +0.56 | Gathering +0.69 (5,221 to 5,444 spells), walking to fires for warmth +0.38 and relocating +0.32. Gathering attendance fell 0.40 and withdrawal walking fell 0.29. The original walking spread was 0.26. |

## Aspen's hungry time

All-age waking time below the hunger threshold of 62 fell slightly (43.91% to 43.87%). The narrower guardrail rose from 10.54% to 11.48%: the person had no edible units in their pack or own home while hungry. Pack and home were simultaneously empty for 20.69% versus 21.69% of waking ticks. Among those empty ticks the share below the hunger threshold rose from 50.96% to 52.91%. An absent home counts as empty. These measures do not count food at a granary, rack or bakery as accessible at home.

**Longer shortages accounted for most of the increase.** In both arms there were exactly 427 spells that began when hunger crossed the threshold while pack and home were already empty. Those spells contained 200,683 waking ticks with retention off and 229,727 on (470 versus 538 per spell). That accounts for 29,044 of the 31,418 additional raw ticks, or 92%. Episodes that began when a pack emptied contributed 2,064 fewer ticks. Those that began when home became empty added 4,274 ticks; spells already present at first observation added 164. Spells were tracked across sleep, with only waking ticks contributing.

**Food was harder to reach for particular households.** In household 1091, shortage time rose from 9.91% to 24.16% of its own waking ticks. Logged edible deposits at its home fell from 97 units (85 berries, four fruit, eight fish) to 38 (36 berries and two fruit). Edible units taken directly from its home to eat fell from 53 to 23. Members received 237 versus 212 paid portions, totalling 3,940 versus 3,880 nutrition. This household alone added 20,953 raw shortage ticks, while other households improved. Across ages, under-sevens added 21,569 raw shortage ticks. Across all ages, residents present at day 96 added 13,128 and later residents added 18,290. These are overlapping breakdowns.

Across Aspen, walking while hungry and empty to eat at a store rose from 23,397 to 33,297 ticks. Store-eating activities ending in failure rose from 206 to 258, interruptions from 46 to 84, and successes fell from 387 to 367. Resting accounted for another 11,985 extra shortage ticks. These observations explain where food relief was delayed in this replay. The comparison cannot assign a particular missed delivery, failed meal or child's wait to a particular retained workshop errand.

## Reproducing the trace

Use the world loader and simulation dependency versions documented with the winter commit, including its measurement-source.patch when starting from a clean revision. Bundle scripts/day96_trip_trace.ts and scripts/aspen_food_trace.ts individually with esbuild for Node as CommonJS. Run each with --rules-up 259 --load C:/dev/lw_saves/rules256/<seed>-day96.save.json --arm <on or off> --reference review_evidence/winter259/<seed>-day96-<arm>.json --out <output path>. The first runner produced the six settlement outputs here and the second produced food-on.json and food-off.json. Run node scripts/day96_trip_summary.mjs to regenerate the trip tables. Recipe tags are recorded only on enabled errands and are combined before comparing the same destination and load across arms. TypeScript checking and the summary syntax check passed.

[Detailed tables](tables.md) · [Original comparison](../winter259/RESULTS.md)
