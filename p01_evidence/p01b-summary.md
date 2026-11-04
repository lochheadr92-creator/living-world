# P0.1b switch ablation at rules 121 (arrivals off, Normal, fork day 4, 21 days)

People alive at the end of each arm. Floor = control, nudge:1, nudge:2; an arm is marked * when it lies outside the floor range.

| Seed | done | control | nudge:1 | nudge:2 | floor mean | rich-no-childhood | rich-no-lived-life | rich-no-critical-search | rich-no-reachable-tilling |
|---|---|---|---|---|---|---|---|---|---|
| forest | true | 1 (28d) | 2 (28d) | 1 (28d) | 1.3 | 5* (25d) | 2 (28d) | 1 (28d) | 16* (13d) |
| aspen | true | 22 (8d) | 22 (8d) | 26 (3d) | 23.3 | 27* (3d) | 22 (9d) | 22 (8d) | 22 (8d) |
| birch | true | 10 (21d) | 10 (19d) | 9 (20d) | 9.7 | 11* (18d) | 19* (12d) | 10 (21d) | 11* (19d) |
| cedar | true | 24 (5d) | 17 (11d) | 20 (10d) | 20.3 | 16* (13d) | 18 (11d) | 24 (5d) | 25* (5d) |
| fern | true | 12 (16d) | 12 (16d) | 13 (15d) | 12.3 | 19* (9d) | 16* (12d) | 12 (16d) | 18* (11d) |
| gen-1 | true | 10 (20d) | 15 (16d) | 17 (14d) | 14.0 | 22* (7d) | 18* (12d) | 10 (20d) | 22* (7d) |
| gen-2 | true | 28 (1d) | 26 (3d) | 28 (1d) | 27.3 | 28 (2d) | 27 (2d) | 28 (1d) | 26 (3d) |
| meadow | true | 28 (2d) | 28 (2d) | 29 (1d) | 28.3 | 28 (1d) | 26* (4d) | 28 (2d) | 28 (1d) |
| river | true | 24 (6d) | 29 (2d) | 28 (2d) | 27.0 | 24 (5d) | 29 (1d) | 24 (6d) | 24 (6d) |

## Per arm across seeds

| Arm | seeds | mean difference from floor mean | outside floor range |
|---|---|---|---|
| rich-no-childhood | 9 | 1.81 | 6 of 9 |
| rich-no-lived-life | 9 | 1.48 | 4 of 9 |
| rich-no-critical-search | 9 | -0.52 | 0 of 9 |
| rich-no-reachable-tilling | 9 | 3.15 | 5 of 9 |

## Forest people by day after the fork (fork = day 4)

- control: 28 28 28 28 28 28 28 29 29 29 29 29 29 29 28 26 26 17 2 1 1
- nudge:1: 28 28 28 28 28 28 28 29 28 29 29 29 29 29 29 29 28 19 4 2 2
- nudge:2: 28 28 28 28 28 28 28 29 29 29 29 29 29 29 28 26 26 17 2 1 1
- rich-no-childhood: 28 28 28 28 28 28 28 29 29 29 29 29 30 30 30 30 29 22 8 5 5
- rich-no-lived-life: 28 28 28 28 28 28 28 29 29 29 29 29 29 30 30 30 29 22 6 2 2
- rich-no-critical-search: 28 28 28 28 28 28 28 29 29 29 29 29 29 29 28 26 26 17 2 1 1
- rich-no-reachable-tilling: 28 28 28 28 28 28 27 28 28 28 28 28 28 28 28 28 28 28 21 18 16
