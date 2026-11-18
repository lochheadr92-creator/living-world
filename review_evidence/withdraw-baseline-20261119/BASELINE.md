# Rules 256 baseline, six continuations

Each is a 13-day continuation with arrivals on from a rules-256 save. These are three settlements at two ages, not six independent settlements. All six end hashes match the previous controls and conservation passes. The withdrawal observer missed one ending in river day 96; its counts are incomplete by at least that event and the aggregate verification command exits 1. The diagnostic replay and its limitations are recorded in `DIAGNOSTIC.md`. The TripShape total walking ticks reconcile in all six, but its age-stage self-check fails in aspen 48, aspen 96 and river 96; adult-stage walking figures have that limitation.

| Start | Finished adult withdrawals | Empty | Empty / finished | Empty / observed arrived | Empty / finished with observed walking | Stock present and zero allowance | Unseen endings |
|---|---:|---:|---:|---:|---:|---:|---:|
| Aspen 48 | 1,074 | 340 | 31.7% | 38.6% | 42.3% | 309 | 0 |
| Aspen 96 | 3,711 | 1,330 | 35.8% | 56.9% | 40.1% | 1,202 | 0 |
| Gen-4 48 | 1,348 | 601 | 44.6% | 58.2% | 50.8% | 556 | 0 |
| Gen-4 96 | 2,760 | 1,103 | 40.0% | 63.4% | 42.9% | 925 | 0 |
| River 48 | 1,316 | 547 | 41.6% | 53.8% | 49.5% | 516 | 0 |
| River 96 | 1,514 | 504 | 33.3% | 67.9% | 34.7% | 455 | 1 |

The denominators answer different questions: the finished group includes activities interrupted before reaching work; the arrived group excludes them; walking counts include interrupted walks. A no-observed-walk record can include an activity already underway when the save was loaded. This comparison explains why denominator choices can produce very different percentages; it does not reconstruct the earlier reports' exact mismatch.

The zero-allowance subset is measured using the sim's actual allowance at the last sampled work tick, not the older observer label alone. Of that subset, earmarks to others account for 294, 1,042, 459, 910, 435 and 315 cases in table order. Stock was present with a positive recorded allowance for 6, 62, 14, 94, 8 and 27 empty cases respectively; those do not establish a zero-allowance cause. The counts describe these runs only and do not prove that a change will help the world.

Raw outputs remain in `runs/`; compact withdrawal and trip summaries and the fixed readings accompany this report. The original survival, walking and social baselines and noise arms are in `review_evidence/stage1d-20261118/RESULT_step8_baseline_lab.txt` on the starting commit.
