# Trip waste, second wave: tables (SCRATCH ONLY, 18 November 2026)

Reading: `READING_AMENDMENT_2.md` (SHA-256 `be94dbf6f3e2eec69251d04642edbe527c30ec7ad3a07214e2e426a683488c93`), on top of `READING.md` and amendment 1. The same three runs as the first wave (arm A, 30 days, day 48 saves, rules 250) with the observer extended to read the sim's own access rules. One run per world: a description, never a rate. No benefit claim.

## Checks

| world | end hash | expected | equal | purity | conservation | withdraw ticks equal | withdraws wave 2 = wave 1 | empty withdraws wave 2 = wave 1 |
|---|---|---|---|---|---|---|---|---|
| aspen | 168d98f7 | 168d98f7 | true | 600 | true | true | true (2495) | true (959) |
| river | 8f513a37 | 8f513a37 | true | 600 | true | true | true (1764) | true (519) |
| gen-4 | 523f2943 | 523f2943 | true | 600 | true | true | true (3057) | true (1226) |

## Why the sim allowed none where stock was there (withdraws that took none, empty, with stock there and nothing allowed)

| world | stock there, nothing allowed | earmarked to others | (owner in own household) | granary, no share | no access | guest stock | other | walking ticks of the earmarked | share of all adult walking ticks | belief named the person as client | belief showed output waiting | all empties |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aspen | 915 | 881 (96.3%) | 35 | 0 | 0 | 27 | 7 | 47039 | 3.8% | 18 | 907 | 959 |
| river | 489 | 481 (98.4%) | 21 | 0 | 0 | 0 | 8 | 28951 | 2.0% | 4 | 505 | 519 |
| gen-4 | 1168 | 753 (64.5%) | 37 | 1 | 0 | 414 | 0 | 44180 | 2.8% | 10 | 1116 | 1226 |

**Verdict by amendment 2: ACCESS IS EARMARK** (earmarked to others 96.3% / 98.4% / 64.5%, granary no share 0.0% / 0.0% / 0.1%, guest stock 3.0% / 0.0% / 35.4%, in aspen / river / gen-4, as shares of the withdraws with stock there and nothing allowed).

- aspen, by building type (reasons of the empty withdraws): bakery: earmarked to others 642; kiln: earmarked to others 75; smithy: earmarked to others 45, guest stock 27; food_rack: earmarked to others 44; quarry: earmarked to others 42; timber_yard: earmarked to others 26, other 5; mine: earmarked to others 7. Adult withdraws that reached work with stock there and a zero allowance: 913 of 2495.
- river, by building type (reasons of the empty withdraws): bakery: earmarked to others 169; mill: earmarked to others 76; timber_yard: earmarked to others 64, other 8; quarry: earmarked to others 63; kiln: earmarked to others 46; food_rack: earmarked to others 38; smithy: earmarked to others 21. Adult withdraws that reached work with stock there and a zero allowance: 486 of 1764.
- gen-4, by building type (reasons of the empty withdraws): timber_yard: guest stock 407, earmarked to others 97; bakery: earmarked to others 381; food_rack: earmarked to others 107; kiln: earmarked to others 56; mill: earmarked to others 47; quarry: earmarked to others 39, guest stock 7; smithy: earmarked to others 25. Adult withdraws that reached work with stock there and a zero allowance: 1173 of 3057.
