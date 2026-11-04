# P0.1a rules bisection (arrivals on, 25 days)

Cross-check (forest r121 vs recorded 4 alive / 29 deaths): **PASS**; alive 4, deaths 29, identical death list true, identical final save true.

## Alive at day 25 (deaths, arrivals, births)

| Seed | r118 | r119 | r120 | r121 |
|---|---|---|---|---|
| forest | 3 (30d, 4a, 1b) | 3 (32d, 5a, 2b) | 0 (31d, 3a, 0b) | 4 (29d, 4a, 1b) |
| river | 26 (13d, 10a, 1b) | 16 (24d, 9a, 3b) | 14 (24d, 8a, 2b) | 19 (21d, 10a, 2b) |
| meadow | 28 (12d, 9a, 3b) | 32 (6d, 6a, 4b) | 28 (8d, 6a, 2b) | 33 (8d, 11a, 2b) |
| fern | 18 (18d, 7a, 1b) | 18 (14d, 3a, 1b) | 8 (29d, 9a, 0b) | 8 (29d, 9a, 0b) |
| aspen | 28 (7d, 6a, 1b) | 28 (9d, 9a, 0b) | 28 (6d, 6a, 0b) | 29 (8d, 7a, 2b) |

## Deaths by cause

| Seed | r118 | r119 | r120 | r121 |
|---|---|---|---|---|
| forest | hunger 13, exposure 8, fever 4, wolf attack 4, injuries 1 | hunger 14, exposure 11, wolf attack 3, thirst 2, injuries 1, fever 1 | hunger 19, exposure 5, fever 4, thirst 2, wolf attack 1 | hunger 14, exposure 6, fever 4, thirst 3, wolf attack 1, injuries 1 |
| river | hunger 7, fever 4, thirst 1, exposure 1 | hunger 15, exposure 3, fever 3, wolf attack 1, injuries 1, thirst 1 | hunger 15, exposure 4, wolf attack 2, fever 2, injuries 1 | hunger 13, exposure 2, fever 2, injuries 2, thirst 1, wolf attack 1 |
| meadow | hunger 8, fever 3, injuries 1 | thirst 3, hunger 2, fever 1 | hunger 5, exposure 1, old age 1, injuries 1 | exposure 4, fever 3, hunger 1 |
| fern | hunger 10, fever 4, wolf attack 3, thirst 1 | hunger 9, fever 3, wolf attack 1, exposure 1 | exposure 12, hunger 9, fever 3, thirst 3, injuries 1, wolf attack 1 | exposure 12, hunger 9, fever 3, thirst 3, injuries 1, wolf attack 1 |
| aspen | hunger 5, injuries 2 | hunger 4, fever 2, injuries 1, wolf attack 1, exposure 1 | injuries 3, hunger 2, fever 1 | hunger 5, wolf attack 1, injuries 1, exposure 1 |

## Forest population by day (days 0-25)

- r118: 28 28 28 29 29 29 29 30 30 30 28 27 27 27 29 29 29 30 30 30 30 27 18 10 3 3
- r119: 28 28 28 30 30 30 30 30 30 30 30 29 29 28 32 32 32 32 32 32 32 30 27 8 3 3
- r120: 28 28 28 28 31 31 31 31 31 31 30 28 28 28 28 28 28 28 28 28 28 27 18 1 0 0
- r121: 28 28 28 28 31 31 31 31 31 31 31 30 28 28 29 29 29 29 29 28 28 27 22 6 4 4

## Forest deaths by day (days 1-25)

- r118: 0 0 0 0 0 0 0 0 0 2 1 0 0 0 0 0 0 0 0 0 3 9 8 7 0 | hunger days 9.7, 21, 21.1, 21.6, 21.9, 22.5, 22.6, 22.7, 22.7, 22.8, 23, 23.1, 23.1
- r119: 0 0 0 0 0 0 0 0 0 0 1 0 1 0 0 0 0 0 0 0 2 4 19 5 0 | hunger days 10.4, 21.7, 21.8, 21.9, 22, 22.4, 22.4, 22.5, 22.7, 22.7, 22.7, 22.8, 22.8, 23.1
- r120: 0 0 0 0 0 0 0 0 0 1 2 0 0 0 0 0 0 0 0 0 1 9 17 1 0 | hunger days 20.8, 21.2, 21.5, 21.7, 21.7, 21.9, 22.1, 22.1, 22.1, 22.5, 22.5, 22.5, 22.6, 22.6, 22.6, 22.6, 22.7, 22.9, 23.2
- r121: 0 0 0 0 0 0 0 0 0 0 1 2 0 0 0 0 0 0 1 0 1 5 17 2 0 | hunger days 21.9, 22, 22, 22, 22.1, 22.1, 22.2, 22.3, 22.3, 22.4, 22.4, 22.7, 22.9, 23.1

## Run integrity

| Run | head | dirty | rules | arrivals on | stop | pure checks | conserved | twin | chronicle complete | 28 founders reconcile | s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| forest-r118 | 3df2ac8 | false | 118 | true | horizon | 500 | true | true | true | yes | 313 |
| forest-r119 | 3df2ac8 | false | 119 | true | horizon | 500 | true | true | true | yes | 314 |
| forest-r120 | 3df2ac8 | false | 120 | true | horizon | 500 | true | true | true | yes | 282 |
| forest-r121 | 3df2ac8 | false | 121 | true | horizon | 500 | true | true | true | yes | 292 |
| river-r118 | 3df2ac8 | false | 118 | true | horizon | 500 | true | true | true | yes | 468 |
| river-r119 | 3df2ac8 | false | 119 | true | horizon | 500 | true | true | true | yes | 440 |
| river-r120 | 3df2ac8 | false | 120 | true | horizon | 500 | true | true | true | yes | 420 |
| river-r121 | 3df2ac8 | false | 121 | true | horizon | 500 | true | true | true | yes | 454 |
| meadow-r118 | 3df2ac8 | false | 118 | true | horizon | 500 | true | true | true | yes | 370 |
| meadow-r119 | 3df2ac8 | false | 119 | true | horizon | 500 | true | true | true | yes | 355 |
| meadow-r120 | 3df2ac8 | false | 120 | true | horizon | 500 | true | true | true | yes | 346 |
| meadow-r121 | 3df2ac8 | false | 121 | true | horizon | 500 | true | true | true | yes | 340 |
| fern-r118 | 3df2ac8 | false | 118 | true | horizon | 500 | true | true | true | yes | 226 |
| fern-r119 | 3df2ac8 | false | 119 | true | horizon | 500 | true | true | true | yes | 255 |
| fern-r120 | 3df2ac8 | false | 120 | true | horizon | 500 | true | true | true | yes | 179 |
| fern-r121 | 3df2ac8 | false | 121 | true | horizon | 500 | true | true | true | yes | 179 |
| aspen-r118 | 3df2ac8 | false | 118 | true | horizon | 500 | true | true | true | yes | 296 |
| aspen-r119 | 3df2ac8 | false | 119 | true | horizon | 500 | true | true | true | yes | 282 |
| aspen-r120 | 3df2ac8 | false | 120 | true | horizon | 500 | true | true | true | yes | 286 |
| aspen-r121 | 3df2ac8 | false | 121 | true | horizon | 500 | true | true | true | yes | 312 |
