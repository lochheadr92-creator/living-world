# Where autonomous choices fall away at rules 259

20 November 2026. Brain investigation queue, P0 calibration and agency, items 1–2. One day from each day-96 Aspen, Gen-4 and River save, raised from rules 256 to 259 with arrivals on. Each fresh native launch counts once, including when no option can start. Routine mid-activity reviews are outside this denominator. Across 5,945 launches (1,950 / 2,098 / 1,897), the following counts are decisions with at least one option in that group. Several groups can be available at one decision.

| Group | Generated | Survived filters | In first 30 | In first 5 | Chosen | Start hook | Successful ending |
|---|---:|---:|---:|---:|---:|---:|---:|
| Immediate survival or bodily need | 5,945 | 5,248 | 4,935 | 3,402 | 2,318 | 2,318 | 1,459 |
| Work and remaining purposes | 5,327 | 4,370 | 4,360 | 3,735 | 2,509 | 2,501 | 1,360 |
| Social | 3,834 | 3,599 | 3,564 | 1,990 | 844 | 844 | 358 |
| Leisure | 5,945 | 5,737 | 4,725 | 1,051 | 237 | 237 | 85 |
| Exploration | 1,460 | 1,262 | 1,151 | 226 | 37 | 37 | 9 |

The native launcher tries up to five offers in score order. Top 30 is included for comparison to the old hybrid transcript. In 5,500 launches where leisure survived and another group won, work/other won 2,509 and survival 2,110. The chosen offer led the best leisure offer by 30.2 score points on average in those launches. Fallback wandering counts as leisure; a leisure option existing does not mean an evening fire or a game was available. Of the 237 leisure starts, 132 were tagged play, 59 idle, 44 leisure, and two rest. Of those starts, 127 were interrupted, 13 failed and 12 were still open. Of 844 social starts, 323 failed, 103 were interrupted and 60 were still open. Instrumental social actions can include requests, information and trades. Work/other includes household help. See choice_funnel.ts for the exact classifications.

Across 342 successful social activities with 120 ticks of follow-up, the social need meter averaged 6.47 points higher than at launch. Across 82 such leisure activities the mean was 1.22 points lower. Only successful, observable activities enter this measure. Other events in those ticks also affect need. Longer-lived relationship, skill, ambition and economic outcomes remain unmeasured.

## Partner proposals

Count decisions, not distinct people or couples. Of 4,636 adult/elder launches, 1,257 were by unpartnered people. At 926 of these both hunger and thirst drives were at most 25. At 798 someone passed the ordinary social candidate checks; at 785 a candidate was an adult within ten tiles. At 521 at least one passed cooldown and familiarity, and at 391 at least one was also unpartnered and non-kin. Among those 391 decisions, 24 had someone who cleared affinity 30, three had someone who cleared trust 20, and three cleared both for the same candidate. All three also passed spark. All three produced a real partnership option, all in River; one started and ended as failed. The ending reason was not recorded. The trust and affinity figures are parallel checks on eligible candidates. Reducing either cutoff has not been tested.

| Start | Decisions with a familiar, available candidate | Pass affinity | Pass trust | Real proposal generated |
|---|---:|---:|---:|---:|
| Aspen | 53 | 0 | 0 | 0 |
| Gen-4 | 219 | 12 | 0 | 0 |
| River | 119 | 12 | 3 | 3 |

## Reproduction and limits

The branch was codex/withdraw-baseline-20261119 at ff46700b, with existing local changes including the save loader. No product rules were edited. The diagnostic build inserts observations at native launch and reads the existing candidate list for the proposal check. Raw counts and final scores are aggregated without taking random draws. Each settlement reached the same end hash with the observer disabled, the choice observer alone and the two successive proposal audits. All 12 runs passed conservation. Final hashes: Aspen 243d5e61, Gen-4 e66b885f, River d1973df5. TypeScript checking passed. The eight work/other choices without a start hook are retained: the engine can end a layout claim before firing that hook. Their individual causes were not logged.

Bundle with node scripts/build_choice_funnel.mjs <bundle.cjs>. Run the bundle with --load C:/dev/lw_saves/rules256/<seed>-day96.save.json --rules-up 259 --observe on (and off) --out <output.json>. The three *-final.json files are the full audit; *-off.json are its replay controls. These are three observed settlement-days, with one trajectory per start and no intervention on ranking or relationship thresholds. The next numbered queue item concerns residents' actual aspirations and whether chosen activities advance them.

