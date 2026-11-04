# P0.1a rules bisection (arrivals off, 25 days)

Cross-check (forest r121 vs recorded 1 alive / 28 deaths): **PASS**; alive 1, deaths 28, identical death list true, identical final save true.

## Alive at day 25 (deaths, arrivals, births)

| Seed | r118 | r119 | r120 | r121 |
|---|---|---|---|---|
| forest | 21 (10d, 0a, 3b) | 18 (10d, 0a, 0b) | 1 (28d, 0a, 1b) | 1 (28d, 0a, 1b) |
| river | 23 (7d, 0a, 2b) | 22 (9d, 0a, 3b) | 24 (6d, 0a, 2b) | 24 (6d, 0a, 2b) |
| meadow | 26 (2d, 0a, 0b) | 29 (2d, 0a, 3b) | 26 (4d, 0a, 2b) | 28 (2d, 0a, 2b) |

## Deaths by cause

| Seed | r118 | r119 | r120 | r121 |
|---|---|---|---|---|
| forest | hunger 7, fever 2, thirst 1 | hunger 6, exposure 3, wolf attack 1 | hunger 16, wolf attack 4, thirst 4, exposure 3, fever 1 | hunger 16, wolf attack 4, thirst 4, exposure 3, fever 1 |
| river | exposure 3, hunger 2, injuries 1, wolf attack 1 | hunger 4, exposure 2, fever 2, wolf attack 1 | hunger 5, exposure 1 | hunger 5, exposure 1 |
| meadow | fever 1, exposure 1 | injuries 1, hunger 1 | hunger 2, fever 1, injuries 1 | hunger 2 |

## Forest population by day (days 0-25)

- r118: 28 28 28 28 27 27 27 27 27 27 27 27 26 25 25 25 25 25 25 26 26 26 27 27 21 21
- r119: 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 28 23 18 18
- r120: 28 28 28 28 28 28 28 28 28 28 28 28 29 29 29 29 29 29 29 28 26 26 17 2 1 1
- r121: 28 28 28 28 28 28 28 28 28 28 28 28 29 29 29 29 29 29 29 28 26 26 17 2 1 1

## Forest deaths by day (days 1-25)

- r118: 0 0 0 1 0 0 0 0 0 0 0 1 1 0 0 0 0 0 0 0 0 0 1 6 0 | hunger days 12.5, 23.1, 23.1, 23.1, 23.2, 23.5, 23.7
- r119: 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 5 5 0 | hunger days 22.9, 23, 23, 23, 23.1, 23.2
- r120: 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 2 0 9 15 1 0 | hunger days 18.9, 19.8, 21, 21.3, 21.5, 21.6, 21.9, 22.1, 22.1, 22.4, 22.4, 22.4, 22.4, 22.6, 22.7, 23.2
- r121: 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 2 0 9 15 1 0 | hunger days 18.9, 19.8, 21, 21.3, 21.5, 21.6, 21.9, 22.1, 22.1, 22.4, 22.4, 22.4, 22.4, 22.6, 22.7, 23.2

## Run integrity

| Run | head | dirty | rules | arrivals on | stop | pure checks | conserved | twin | chronicle complete | 28 founders reconcile | s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| forest-r118 | 3f65f8c | false | 118 | false | horizon | 500 | true | true | true | yes | 316 |
| forest-r119 | 3f65f8c | false | 119 | false | horizon | 500 | true | true | true | yes | 336 |
| forest-r120 | 3f65f8c | false | 120 | false | horizon | 500 | true | true | true | yes | 318 |
| forest-r121 | 3f65f8c | false | 121 | false | horizon | 500 | true | true | true | yes | 312 |
| river-r118 | 3f65f8c | false | 118 | false | horizon | 500 | true | true | true | yes | 360 |
| river-r119 | 3f65f8c | false | 119 | false | horizon | 500 | true | true | true | yes | 376 |
| river-r120 | 3f65f8c | false | 120 | false | horizon | 500 | true | true | true | yes | 373 |
| river-r121 | 3f65f8c | false | 121 | false | horizon | 500 | true | true | true | yes | 376 |
| meadow-r118 | 3f65f8c | false | 118 | false | horizon | 500 | true | true | true | yes | 317 |
| meadow-r119 | 3f65f8c | false | 119 | false | horizon | 500 | true | true | true | yes | 318 |
| meadow-r120 | 3f65f8c | false | 120 | false | horizon | 500 | true | true | true | yes | 329 |
| meadow-r121 | 3f65f8c | false | 121 | false | horizon | 500 | true | true | true | yes | 338 |
