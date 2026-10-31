# Genuine accumulated Large-world measurements at rules 109

The owner's Windows machine accumulated ordinary Large meadow for 45 days with
immigration off, no injected history/resources/decisions and frozen rules-109
simulation source. Generation provenance starts at `0b3e23f`; the later
documentation-only head `52b4ba3` names the benchmark. Both retain source hashes.
This is a rules-109 result, **not a current-rules-111/112 performance claim**.

Generation reached tick 108,000 in 1,435.61 seconds, with 900 pure sampled
inspections and full item conservation. The world has 110 living people, three
death records, 36 households, 95 buildings, 11 sites, 263 tools, 114 plots, 5,473
relationships and 67,350 personal beliefs. It still has **zero carts**. Counts
and the retained time budget are in `mature109-large-meadow-45/report.json`.
Generation itself did not run an unobserved 45-day twin; the benchmark below
checks exact saved continuation over its bounded 240-tick workload.

Machine: Intel Core Ultra 9 285K, 24 logical cores, Node v24.19.0. Other development
jobs were running; these are observed costs, not a controlled speed comparison.
The mature input SHA-256 is
`163efa8a309ad2a01fd8810b869e4dbfa1677802de7ac331e03f4f8c5209333e`.

| p95 milliseconds, except sizes | Fresh Normal | Fresh Large | Large at day 45 |
|---|---:|---:|---:|
| Simulation tick | 4.05 | 9.35 | 25.65 |
| Person inspection | 2.63 | 3.27 | 10.65 |
| History query | 0.056 | 0.079 | 0.313 |
| Save | 10.75 | 43.47 | 202.83 |
| Load | 32.48 | 104.86 | 796.20 |
| Serialized bytes | 869,645 | 3,175,902 | 21,781,866 |
| Paused browser frame submission | 2.20 | 3.00 | 4.80 |
| Forced UI refresh | 0.20 | 0.30 | 0.30 |
| Browser heap after GC, bytes | 13,033,912 | 17,636,420 | 79,346,856 |

All three cases completed 240 measured ticks, 60 inspection/history queries and
five save/load repetitions. Each preserved exact restored continuation, pure
inspection and item accounting. Browser measurements use those same hashed saves,
150 retained paused frames after 30 warmups, then 60 forced UI updates. All three
paused worlds remain byte-identical and there are no browser exceptions. The
mature screenshot was inspected and shows the real accumulated village and
person panel.

Frame submission is CPU drawing cost, not GPU completion or playing FPS. The
mature browser rAF interval p95 is 20 ms. Heap is the whole page after GC, not
retained simulation state alone. This bounded workload does not establish
long-session memory stability, mobile performance or a universal speed target.
No simulation history was removed or compressed to improve these figures.

Evidence: `autonomy_evidence/perf109-large-mature/{headless,browser}.json` and
three screenshots; generation `provenance.json` and `report.json`. Full saved
worlds and detailed plan samples remain local. Final combined current-rules Large
measurement stays open after the remaining programme changes.
