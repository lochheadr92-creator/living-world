# Four years from a saved settlement: rules 244 as saved against rules 245, with one-draw nudges

One run per arm per world: a description, not a test. A = as saved (rules 244); B = `--rules-up 245`; A1, A2 = A with `--nudge 1`, `--nudge 2` (the lab's one extra random draw at the start, the noise floor). Aspen, cedar, fern, meadow continue from day 96 to day 144; birch and river from day 84 to day 132. "People" is people alive; "store a head" is food in stores and piles over people alive; "hungry share" is the mean over the window days of the day's share of 40-tick samples with hunger under 42.

## Runs

| world | arm | rules | days | done | minutes |
|---|---|---|---|---|---|
| aspen | A | 244 | 96-144 | True | 104.6 |
| aspen | B | 245 | 96-144 | True | 104.3 |
| aspen | A1 | 244 | 96-144 | True | 104.2 |
| aspen | A2 | 244 | 96-144 | True | 103.8 |
| cedar | A | 244 | 96-144 | True | 100.5 |
| cedar | B | 245 | 96-144 | True | 99.6 |
| cedar | A1 | 244 | 96-144 | True | 99.2 |
| cedar | A2 | 244 | 96-144 | True | 101.1 |
| fern | A | 244 | 96-144 | True | 102.1 |
| fern | B | 245 | 96-144 | True | 102.1 |
| fern | A1 | 244 | 96-144 | True | 103.5 |
| fern | A2 | 244 | 96-144 | True | 107.1 |
| meadow | A | 244 | 96-144 | True | 100.2 |
| meadow | B | 245 | 96-144 | True | 99.3 |
| meadow | A1 | 244 | 96-144 | True | 98.1 |
| meadow | A2 | 244 | 96-144 | True | 95 |
| birch | A | 244 | 84-132 | True | 97.6 |
| birch | B | 245 | 84-132 | True | 101.5 |
| birch | A1 | 244 | 84-132 | True | 101.1 |
| birch | A2 | 244 | 84-132 | True | 98.9 |
| river | A | 244 | 84-132 | True | 99.4 |
| river | B | 245 | 84-132 | True | 85.3 |
| river | A1 | 244 | 84-132 | True | 89.6 |
| river | A2 | 244 | 84-132 | True | 96.2 |

## Per world

### aspen

| arm | people y1 | y2 | y3 | y4 | born | deaths | d:exposure | d:fever | d:hunger | d:injuries | d:old age | d:thirst | d:wolf attack | store/head end | store/head mean | hungry share | plots | granary | bakery | mill | buildings | households (of one) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 115 | 128 | 136 | 143 | 16 | 3 | 0 | 1 | 2 | 0 | 0 | 0 | 0 | 1.37 | 4.14 | 0.114 | 221 | 1 | 3 | 0 | 141 | 57 (22) |
| B | 117 | 125 | 134 | 140 | 15 | 4 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 0.09 | 3.16 | 0.160 | 215 | 1 | 4 | 0 | 144 | 55 (20) |
| A1 | 118 | 128 | 136 | 141 | 16 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0.74 | 3.89 | 0.134 | 220 | 1 | 3 | 0 | 141 | 55 (21) |
| A2 | 112 | 117 | 132 | 142 | 20 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 1.56 | 4.34 | 0.102 | 215 | 1 | 3 | 0 | 144 | 55 (23) |

Lean seasons (hardship = lean). before = people the day before; low = lowest people from the first lean day through four days after the last; loss = before - low; deaths and births over that same span.

| arm | lean days | before | low | loss | deaths | births |
|---|---|---|---|---|---|---|
| A | day 127-131, to day 135 | 135 | 135 | 0 | 2 | 0 |
| B | day 127-131, to day 135 | 132 | 132 | 0 | 3 | 2 |
| A1 | day 127-131, to day 135 | 133 | 133 | 0 | 1 | 2 |
| A2 | day 127-131, to day 135 | 125 | 125 | 0 | 1 | 6 |

### cedar

| arm | people y1 | y2 | y3 | y4 | born | deaths | d:exposure | d:fever | d:hunger | d:injuries | d:old age | d:thirst | d:wolf attack | store/head end | store/head mean | hungry share | plots | granary | bakery | mill | buildings | households (of one) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 98 | 111 | 117 | 124 | 7 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1.81 | 5.16 | 0.140 | 195 | 4 | 3 | 1 | 129 | 59 (31) |
| B | 102 | 112 | 122 | 131 | 9 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2.02 | 4.89 | 0.137 | 201 | 4 | 2 | 1 | 146 | 59 (24) |
| A1 | 103 | 113 | 118 | 123 | 8 | 8 | 5 | 2 | 0 | 0 | 0 | 0 | 1 | 1.73 | 4.09 | 0.164 | 202 | 4 | 3 | 1 | 112 | 57 (25) |
| A2 | 104 | 113 | 123 | 129 | 4 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1.58 | 5.18 | 0.152 | 206 | 4 | 3 | 1 | 127 | 59 (25) |

Lean seasons (hardship = lean). before = people the day before; low = lowest people from the first lean day through four days after the last; loss = before - low; deaths and births over that same span.

| arm | lean days | before | low | loss | deaths | births |
|---|---|---|---|---|---|---|
| A | day 122-125, to day 129 | 111 | 111 | 0 | 0 | 1 |
| B | day 122-125, to day 129 | 112 | 115 | -3 | 0 | 1 |
| A1 | day 122-125, to day 129 | 116 | 116 | 0 | 0 | 0 |
| A2 | day 122-125, to day 129 | 113 | 116 | -3 | 0 | 0 |

### fern

| arm | people y1 | y2 | y3 | y4 | born | deaths | d:exposure | d:fever | d:hunger | d:injuries | d:old age | d:thirst | d:wolf attack | store/head end | store/head mean | hungry share | plots | granary | bakery | mill | buildings | households (of one) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 99 | 110 | 118 | 127 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 10.24 | 10.68 | 0.071 | 225 | 3 | 1 | 1 | 121 | 63 (32) |
| B | 101 | 111 | 124 | 136 | 19 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 8.77 | 9.97 | 0.082 | 227 | 3 | 1 | 1 | 121 | 61 (28) |
| A1 | 98 | 111 | 121 | 132 | 14 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 8.81 | 10.86 | 0.083 | 222 | 4 | 1 | 1 | 121 | 62 (29) |
| A2 | 100 | 113 | 125 | 139 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 11.24 | 12.10 | 0.072 | 231 | 4 | 1 | 1 | 133 | 64 (29) |

Lean seasons (hardship = lean). before = people the day before; low = lowest people from the first lean day through four days after the last; loss = before - low; deaths and births over that same span.

| arm | lean days | before | low | loss | deaths | births |
|---|---|---|---|---|---|---|
| A | day 121-123, to day 127 | 110 | 110 | 0 | 0 | 2 |
| B | day 121-123, to day 127 | 111 | 111 | 0 | 0 | 4 |
| A1 | day 121-123, to day 127 | 111 | 112 | -1 | 0 | 3 |
| A2 | day 121-123, to day 127 | 113 | 116 | -3 | 0 | 3 |

### meadow

| arm | people y1 | y2 | y3 | y4 | born | deaths | d:exposure | d:fever | d:hunger | d:injuries | d:old age | d:thirst | d:wolf attack | store/head end | store/head mean | hungry share | plots | granary | bakery | mill | buildings | households (of one) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 104 | 115 | 124 | 133 | 12 | 3 | 1 | 0 | 0 | 1 | 1 | 0 | 0 | 5.45 | 6.83 | 0.126 | 229 | 3 | 4 | 1 | 144 | 57 (24) |
| B | 103 | 114 | 130 | 136 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6.76 | 7.95 | 0.126 | 231 | 3 | 3 | 1 | 133 | 60 (27) |
| A1 | 103 | 115 | 111 | 116 | 7 | 12 | 7 | 0 | 0 | 1 | 1 | 0 | 3 | 6.58 | 8.16 | 0.116 | 222 | 3 | 3 | 1 | 133 | 53 (23) |
| A2 | 105 | 119 | 127 | 134 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4.13 | 7.06 | 0.132 | 225 | 3 | 2 | 1 | 124 | 60 (30) |

Lean seasons (hardship = lean). before = people the day before; low = lowest people from the first lean day through four days after the last; loss = before - low; deaths and births over that same span.

| arm | lean days | before | low | loss | deaths | births |
|---|---|---|---|---|---|---|
| A | day 127-131, to day 135 | 120 | 122 | -2 | 2 | 1 |
| B | day 127-131, to day 135 | 123 | 126 | -3 | 0 | 3 |
| A1 | day 127-131, to day 135 | 119 | 111 | 8 | 11 | 0 |
| A2 | day 127-131, to day 135 | 124 | 124 | 0 | 0 | 1 |

### birch

| arm | people y1 | y2 | y3 | y4 | born | deaths | d:exposure | d:fever | d:hunger | d:injuries | d:old age | d:thirst | d:wolf attack | store/head end | store/head mean | hungry share | plots | granary | bakery | mill | buildings | households (of one) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 102 | 108 | 120 | 132 | 8 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 4.39 | 4.99 | 0.142 | 184 | 2 | 3 | 1 | 125 | 51 (14) |
| B | 104 | 113 | 127 | 135 | 11 | 3 | 1 | 0 | 0 | 0 | 2 | 0 | 0 | 7.32 | 6.41 | 0.141 | 199 | 3 | 2 | 1 | 128 | 54 (18) |
| A1 | 102 | 112 | 115 | 126 | 6 | 2 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 5.25 | 6.51 | 0.138 | 185 | 3 | 2 | 1 | 121 | 53 (20) |
| A2 | 98 | 105 | 116 | 124 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7.02 | 7.44 | 0.117 | 190 | 2 | 2 | 1 | 121 | 53 (22) |

Lean seasons (hardship = lean). before = people the day before; low = lowest people from the first lean day through four days after the last; loss = before - low; deaths and births over that same span.

| arm | lean days | before | low | loss | deaths | births |
|---|---|---|---|---|---|---|
| A | day 102-105, to day 109 | 106 | 106 | 0 | 4 | 2 |
| B | day 102-105, to day 109 | 109 | 109 | 0 | 0 | 1 |
| A1 | day 102-105, to day 109 | 108 | 110 | -2 | 0 | 1 |
| A2 | day 102-105, to day 109 | 101 | 101 | 0 | 0 | 2 |

### river

| arm | people y1 | y2 | y3 | y4 | born | deaths | d:exposure | d:fever | d:hunger | d:injuries | d:old age | d:thirst | d:wolf attack | store/head end | store/head mean | hungry share | plots | granary | bakery | mill | buildings | households (of one) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | 96 | 106 | 114 | 117 | 10 | 5 | 1 | 1 | 2 | 0 | 0 | 1 | 0 | 0.10 | 3.03 | 0.214 | 149 | 1 | 3 | 0 | 137 | 52 (23) |
| B | 101 | 101 | 107 | 108 | 11 | 9 | 2 | 2 | 2 | 1 | 0 | 1 | 1 | 0.17 | 2.57 | 0.224 | 147 | 2 | 2 | 0 | 133 | 45 (18) |
| A1 | 103 | 112 | 113 | 90 | 13 | 34 | 24 | 2 | 6 | 0 | 0 | 0 | 2 | 0.20 | 2.77 | 0.222 | 155 | 1 | 3 | 0 | 127 | 37 (16) |
| A2 | 100 | 107 | 118 | 64 | 8 | 60 | 20 | 4 | 29 | 6 | 0 | 0 | 1 | 0.14 | 2.85 | 0.226 | 147 | 1 | 3 | 0 | 139 | 32 (16) |

Lean seasons (hardship = lean). before = people the day before; low = lowest people from the first lean day through four days after the last; loss = before - low; deaths and births over that same span.

| arm | lean days | before | low | loss | deaths | births |
|---|---|---|---|---|---|---|
| A | day 98-102, to day 106 | 96 | 96 | 0 | 0 | 3 |
| A | day 124-127, to day 131 | 118 | 117 | 1 | 3 | 1 |
| B | day 98-102, to day 106 | 101 | 101 | 0 | 3 | 2 |
| B | day 124-127, to day 131 | 111 | 107 | 4 | 5 | 1 |
| A1 | day 98-102, to day 106 | 105 | 105 | 0 | 0 | 5 |
| A1 | day 124-127, to day 131 | 115 | 92 | 23 | 27 | 2 |
| A2 | day 98-102, to day 106 | 101 | 101 | 0 | 0 | 1 |
| A2 | day 124-127, to day 131 | 121 | 67 | 54 | 56 | 1 |

## Aggregate over the six worlds

Mean over the worlds of A, B, and of each nudge arm; the differences are of means. "B - A in worlds": in how many worlds |B - A| is larger than both |A1 - A| and |A2 - A| (beyond), and in how many the sign agrees with the mean difference (same sign). Verdict word: **beyond** = the mean difference is larger than both nudge mean differences and beyond in at least 5 of the worlds with the same sign in at least 5; **most** = larger than both and beyond in 4 with the same sign in 4 or more; otherwise **within**. The range column counts the worlds in which B is below the lowest, or above the highest, of the three arms A, A1, A2 (what chance alone gave). A description of one run per arm, not a test.

| metric | mean A | mean B | B - A | A1 - A | A2 - A | worlds beyond | same sign | B below / above the range of A,A1,A2 | verdict |
|---|---|---|---|---|---|---|---|---|---|
| people, end of year 1 | 102.3 | 104.7 | 2.3 | 2.2 | 0.8 | 1/6 | 5/6 | 0 / 2 | within |
| people, end of year 2 | 113.0 | 112.7 | -0.3 | 2.2 | -0.7 | 1/6 | 3/6 | 2 / 1 | within |
| people, end of year 3 | 121.5 | 124.0 | 2.5 | -2.5 | 2.0 | 2/6 | 4/6 | 1 / 2 | within |
| people, end of year 4 | 129.3 | 131.0 | 1.7 | -8.0 | -7.3 | 2/6 | 4/6 | 1 / 3 | within |
| people at the end (year 4) | 129.3 | 131.0 | 1.7 | -8.0 | -7.3 | 2/6 | 4/6 | 1 / 3 | within |
| births | 10.5 | 13.0 | 2.5 | 0.2 | 0.7 | 2/6 | 5/6 | 1 / 3 | within |
| deaths, all | 2.8 | 3.2 | 0.3 | 6.8 | 7.7 | 1/6 | 3/6 | 1 / 2 | within |
| deaths, exposure | 1.0 | 0.7 | -0.3 | 5.2 | 2.5 | 0/6 | 2/6 | 0 / 0 | within |
| deaths, fever | 0.3 | 0.5 | 0.2 | 0.5 | 0.5 | 1/6 | 2/6 | 0 / 1 | within |
| deaths, hunger | 0.7 | 0.8 | 0.2 | 0.5 | 4.3 | 0/6 | 1/6 | 0 / 1 | within |
| deaths, injuries | 0.2 | 0.3 | 0.2 | 0.0 | 0.8 | 1/6 | 2/6 | 0 / 1 | within |
| deaths, old age | 0.3 | 0.3 | 0.0 | 0.0 | -0.3 | 1/6 | 0/6 | 0 / 1 | within |
| deaths, thirst | 0.2 | 0.2 | 0.0 | -0.2 | -0.2 | 0/6 | 0/6 | 0 / 0 | within |
| deaths, wolf attack | 0.2 | 0.3 | 0.2 | 0.8 | 0.0 | 0/6 | 1/6 | 0 / 0 | within |
| hungry share (window mean) | 0.135 | 0.145 | 0.011 | 0.008 | -0.001 | 1/6 | 4/6 | 1 / 1 | within |
| hungry share (last year) | 0.157 | 0.177 | 0.019 | 0.027 | 0.022 | 2/6 | 3/6 | 2 / 2 | within |
| store a head, end | 3.89 | 4.19 | 0.29 | -0.01 | 0.38 | 3/6 | 4/6 | 2 / 3 | within |
| store a head, window mean | 5.81 | 5.83 | 0.02 | 0.24 | 0.69 | 2/6 | 2/6 | 3 / 0 | within |
| hungry time, waking share, whole window (life counter) | 0.572 | 0.585 | 0.013 | 0.007 | -0.005 | 1/6 | 4/6 | 1 / 3 | within |
| work share, whole window (life counter) | 0.183 | 0.179 | -0.004 | -0.007 | -0.002 | 1/6 | 3/6 | 1 / 1 | within |
| thirsty time, waking share, whole window (life counter) | 0.392 | 0.396 | 0.004 | 0.005 | 0.004 | 1/6 | 3/6 | 2 / 1 | within |
| meals from a store, whole window | 1367 | 1308 | -59 | 2 | -97 | 3/6 | 4/6 | 2 / 1 | within |
| arrivals | 27.8 | 27.3 | -0.5 | -1.3 | -0.3 | 1/6 | 4/6 | 1 / 0 | within |
| plots, end | 200.5 | 203.3 | 2.8 | 0.5 | 1.8 | 1/6 | 4/6 | 0 / 2 | within |
| granary, end | 2.33 | 2.67 | 0.33 | 0.33 | 0.17 | 1/6 | 2/6 | 0 / 1 | within |
| bakery, end | 2.83 | 2.33 | -0.50 | -0.33 | -0.50 | 3/6 | 4/6 | 2 / 1 | within |
| mill, end | 0.67 | 0.67 | 0.00 | 0.00 | 0.00 | 0/6 | 0/6 | 0 / 0 | zero |
| buildings, end | 132.8 | 134.2 | 1.3 | -7.0 | -1.5 | 0/6 | 3/6 | 0 / 2 | within |
| households, end | 56.5 | 55.7 | -0.8 | -3.7 | -2.7 | 2/6 | 3/6 | 1 / 1 | within |

### Each world: B - A beside the nudges

**people at the end (year 4)**: aspen: -3 (nudges -2, -1); cedar: 7 (nudges -1, 5); fern: 9 (nudges 5, 12); meadow: 3 (nudges -17, 1); birch: 3 (nudges -6, -8); river: -9 (nudges -27, -53)

**births**: aspen: -1 (nudges 0, 4); cedar: 2 (nudges 1, -3); fern: 9 (nudges 4, 3); meadow: 1 (nudges -5, 1); birch: 3 (nudges -2, 1); river: 1 (nudges 3, -2)

**deaths, all**: aspen: 1 (nudges -2, -2); cedar: -1 (nudges 6, 0); fern: 2 (nudges 1, 0); meadow: -3 (nudges 9, -3); birch: -1 (nudges -2, -4); river: 4 (nudges 29, 55)

**deaths, exposure**: aspen: 0 (nudges 0, 0); cedar: 0 (nudges 5, 1); fern: 1 (nudges 1, 0); meadow: -1 (nudges 6, -1); birch: -3 (nudges -4, -4); river: 1 (nudges 23, 19)

**deaths, fever**: aspen: -1 (nudges -1, -1); cedar: 0 (nudges 2, 1); fern: 1 (nudges 0, 0); meadow: 0 (nudges 0, 0); birch: 0 (nudges 1, 0); river: 1 (nudges 1, 3)

**deaths, hunger**: aspen: 1 (nudges -1, -1); cedar: 0 (nudges 0, 0); fern: 0 (nudges 0, 0); meadow: 0 (nudges 0, 0); birch: 0 (nudges 0, 0); river: 0 (nudges 4, 27)

**deaths, injuries**: aspen: 1 (nudges 0, 0); cedar: 0 (nudges 0, 0); fern: 0 (nudges 0, 0); meadow: -1 (nudges 0, -1); birch: 0 (nudges 0, 0); river: 1 (nudges 0, 6)

**deaths, old age**: aspen: 0 (nudges 0, 0); cedar: -1 (nudges -1, -1); fern: 0 (nudges 0, 0); meadow: -1 (nudges 0, -1); birch: 2 (nudges 1, 0); river: 0 (nudges 0, 0)

**deaths, thirst**: aspen: 0 (nudges 0, 0); cedar: 0 (nudges 0, 0); fern: 0 (nudges 0, 0); meadow: 0 (nudges 0, 0); birch: 0 (nudges 0, 0); river: 0 (nudges -1, -1)

**deaths, wolf attack**: aspen: 0 (nudges 0, 0); cedar: 0 (nudges 0, -1); fern: 0 (nudges 0, 0); meadow: 0 (nudges 3, 0); birch: 0 (nudges 0, 0); river: 1 (nudges 2, 1)

**hungry share (window mean)**: aspen: 0.046 (nudges 0.020, -0.012); cedar: -0.003 (nudges 0.024, 0.012); fern: 0.011 (nudges 0.012, 0.001); meadow: 0.000 (nudges -0.010, 0.006); birch: -0.001 (nudges -0.004, -0.025); river: 0.010 (nudges 0.008, 0.012)

**store a head, end**: aspen: -1.28 (nudges -0.63, 0.19); cedar: 0.21 (nudges -0.08, -0.23); fern: -1.46 (nudges -1.43, 1.01); meadow: 1.31 (nudges 1.13, -1.32); birch: 2.93 (nudges 0.86, 2.63); river: 0.06 (nudges 0.10, 0.04)

**plots, end**: aspen: -6 (nudges -1, -6); cedar: 6 (nudges 7, 11); fern: 2 (nudges -3, 6); meadow: 2 (nudges -7, -4); birch: 15 (nudges 1, 6); river: -2 (nudges 6, -2)

## Lean-season losses, summed over the lean seasons of the window

Loss = people the day before a lean season less the lowest people from its first day through four days after its last. Seasons that begin on the first window day have no day before and are left out of the loss sum; the number left out is shown.

| world | arm | seasons | loss | deaths in the spans | left out |
|---|---|---|---|---|---|
| aspen | A | 1 | 0 | 2 | 0 |
| aspen | B | 1 | 0 | 3 | 0 |
| aspen | A1 | 1 | 0 | 1 | 0 |
| aspen | A2 | 1 | 0 | 1 | 0 |
| cedar | A | 1 | 0 | 0 | 0 |
| cedar | B | 1 | -3 | 0 | 0 |
| cedar | A1 | 1 | 0 | 0 | 0 |
| cedar | A2 | 1 | -3 | 0 | 0 |
| fern | A | 1 | 0 | 0 | 0 |
| fern | B | 1 | 0 | 0 | 0 |
| fern | A1 | 1 | -1 | 0 | 0 |
| fern | A2 | 1 | -3 | 0 | 0 |
| meadow | A | 1 | -2 | 2 | 0 |
| meadow | B | 1 | -3 | 0 | 0 |
| meadow | A1 | 1 | 8 | 11 | 0 |
| meadow | A2 | 1 | 0 | 0 | 0 |
| birch | A | 1 | 0 | 4 | 0 |
| birch | B | 1 | 0 | 0 | 0 |
| birch | A1 | 1 | -2 | 0 | 0 |
| birch | A2 | 1 | 0 | 0 | 0 |
| river | A | 2 | 1 | 3 | 0 |
| river | B | 2 | 4 | 8 | 0 |
| river | A1 | 2 | 23 | 27 | 0 |
| river | A2 | 2 | 54 | 56 | 0 |

| arm | seasons | loss, six worlds | deaths in the spans | left out |
|---|---|---|---|---|
| A | 7 | -1 | 11 | 0 |
| B | 7 | -2 | 11 | 0 |
| A1 | 7 | 28 | 39 | 0 |
| A2 | 7 | 48 | 57 | 0 |

