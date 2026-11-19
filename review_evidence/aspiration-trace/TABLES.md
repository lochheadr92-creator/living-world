# Aspiration trace tables

## First assignment recovered from the day-96 saves

| World | Living | Home | Family | Trade | Stores | Reputation | No goal yet |
|---|---|---|---|---|---|---|---|
| aspen | 128 | 24 | 21 | 17 | 17 | 12 | 37 |
| gen-4 | 125 | 22 | 17 | 15 | 20 | 19 | 32 |
| river | 127 | 21 | 18 | 13 | 21 | 16 | 38 |

## Assignments, movement and achievement through day 109

Each row counts goal episodes. Open includes goals unfinished at entry and goals taken up during observation. Revised company hopes count separately. Up and down compare successive recorded scores. Met uses the simulation’s achievement event. Still met uses the raw score of the original hope at day 109, even after the resident has moved on. A resident who died is excluded from the live endpoint.

| Hope | Open | New first | New successor | Moved up | Moved down | Met | Met and alive at end | Still at 100% |
|---|---|---|---|---|---|---|---|---|
| home | 28 | 7 | 1 | 3 | 1 | 2 | 2 | 0 |
| family | 64 | 12 | 3 | 5 | 0 | 6 | 6 | 6 |
| trade | 4 | 4 | 0 | 2 | 0 | 4 | 4 | 4 |
| stocked | 129 | 8 | 5 | 78 | 75 | 0 | 0 | 0 |
| respected | 93 | 5 | 2 | 8 | 2 | 2 | 2 | 2 |
| company | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## What happened to the hopes already unfinished on day 96

| Hope | Unfinished at start | At zero | At least ten days old | Recorded score rose at least once | Recorded score ever fell | Achieved by day 109 | Resident alive at endpoint |
|---|---|---|---|---|---|---|---|
| home | 20 | 15 | 10 | 2 | 0 | 1 | 20 |
| family | 49 | 26 | 39 | 5 | 0 | 5 | 49 |
| trade | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| stocked | 116 | 105 | 106 | 74 | 71 | 0 | 115 |
| respected | 86 | 14 | 79 | 8 | 2 | 2 | 86 |
| company | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Action opportunities by hope

Counts are decisions by residents with an unfinished goal. Offered means at least one surviving ranked option qualifies for the native +4 score. Selected counts a qualifying activity launched. Success counts its reported ending.

| Hope | Decisions | Offered | Selected | Succeeded | Failed | Interrupted | Partial | Open at end |
|---|---|---|---|---|---|---|---|---|
| home | 5701 | 2394 | 129 | 34 | 21 | 27 | 46 | 1 |
| family | 14012 | 2961 | 559 | 203 | 317 | 37 | 0 | 2 |
| trade | 23 | 8 | 3 | 1 | 0 | 1 | 1 | 0 |
| stocked | 31973 | 23924 | 7014 | 3368 | 1367 | 1655 | 591 | 33 |
| respected | 23158 | 3949 | 1236 | 616 | 358 | 259 | 0 | 3 |
| company | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Within-activity change on day 96

Raw progress for the same hope at launch and outcome. Only successful activities are included here. Other residents can affect the result in the interval. The raw JSON includes other outcomes and all action types.

| Hope | Successful aligned | Up | Flat | Down | Successful other | Up | Flat | Down |
|---|---|---|---|---|---|---|---|---|
| home | 6 | 0 | 6 | 0 | 193 | 0 | 193 | 0 |
| family | 22 | 0 | 22 | 0 | 489 | 0 | 489 | 0 |
| trade | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| stocked | 292 | 20 | 269 | 3 | 1141 | 8 | 1109 | 24 |
| respected | 56 | 0 | 56 | 0 | 929 | 0 | 929 | 0 |
| company | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## From a handover to a milestone on day 96

| World | Completed gifts for reputation | Incoming affinity grew | Recipient already at 40 | Recipient crossed 40 | Completed deposits for stocked hope | At own home | At own home and score grew |
|---|---|---|---|---|---|---|---|
| aspen | 26 | 0 | 26 | 0 | 26 | 5 | 5 |
| gen-4 | 19 | 0 | 19 | 0 | 57 | 11 | 8 |
| river | 11 | 1 | 11 | 0 | 82 | 7 | 7 |

## Residents and achievements by world

| World | Distinct goal holders | Open episodes | Open episodes at entry | New first goals | New successor goals | Newly achieved | Newly achieved and still met at end |
|---|---|---|---|---|---|---|---|
| aspen | 103 | 105 | 90 | 12 | 3 | 6 | 6 |
| gen-4 | 105 | 107 | 92 | 12 | 3 | 3 | 2 |
| river | 101 | 106 | 89 | 12 | 5 | 5 | 4 |

## Selected proposal approaches

| World | Day | Actor | Target ID | Purpose | Approach outcome | Recorded detail |
|---|---|---|---|---|---|---|
| river | 96.409 | Silas | 60773 | to share a household | failed | Kira was too busy to stop |

## Repeat social approaches

Pairs are directed. Change is from the first to the last selected approach by the same person toward that target. Intervening events can change relationships.

| World | Directed pairs | Selected at least twice | Trust higher | Affinity higher |
|---|---|---|---|---|
| aspen | 2146 | 639 | 306 | 269 |
| gen-4 | 2234 | 523 | 249 | 227 |
| river | 2616 | 642 | 313 | 275 |

## Replay verification

| World | Day 96 | Day 97 | Day 109 | Conservation at both endpoints |
|---|---|---|---|---|
| aspen | 9696240c | 243d5e61 | 865567ff | pass |
| gen-4 | 029a8363 | e66b885f | 6937c1e6 | pass |
| river | 47144ccf | d1973df5 | 631f0bc8 | pass |
