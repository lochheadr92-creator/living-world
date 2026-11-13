# Lean seasons: rules 244 (killed early) vs rules 238

Lean value used: `hardship === "lean"`. Values seen: "" (none), "dry", "lean". A lean season is a maximal run of consecutive days with that value. "dry" runs were not counted (see the run list below).

Definitions: before = alive on day first-1. Lowest = min alive from first through last+4. Loss% = (before - lowest) / before * 100. A 244 season counts as reached when last+4 <= daysRun. 238 is measured over the same window; if its window runs past 238's daysRun it is marked n/a.

## All lean runs (day ranges)

- aspen: 244 26-29, 49-53, 86-88 | 238 26-29, 49-53, 86-88, 127-131, 149-152, 187-190, 210-212, 231-235
- birch: 244 17-20, 42-46, 66-70, 102-105 | 238 17-20, 42-46, 66-70, 102-105, 134-136, 174-177, 200-202, 221-225
- cedar: 244 19-21, 49-52, 88-90, 122-125 | 238 19-21, 49-52, 88-90, 122-125, 164-168, 200-204, 218-220
- fern: 244 29-32, 52-56, 85-87, 121-123 | 238 29-32, 52-56, 85-87, 121-123, 146-148, 183-187, 208-211, 235-239
- gen-1: 244 19-23, 44-46, 66-70, 98-100 | 238 19-23, 44-46, 66-70, 98-100, 137-141, 176-180, 211-213, 236-240
- gen-2: 244 25-27, 61-65, 97-100, 121-125 | 238 25-27, 61-65, 97-100, 121-125, 159-162, 181-185, 219-222
- gen-3: 244 26-30, 66-68, 103-105, 123-127 | 238 26-30, 66-68, 103-105, 123-127, 157-159, 186-189, 217-220
- gen-4: 244 15-19, 40-43, 68-70, 101-104 | 238 15-19, 40-43, 68-70, 101-104, 137-140, 158-160, 198-202, 229-233
- gen-5: 244 17-21, 40-43, 75-78, 99-101, 126-128 | 238 17-21, 40-43, 75-78, 99-101, 126-128, 151-154, 183-186, 220-223
- gen-6: 244 26-29, 66-68, 98-100 | 238 26-29, 66-68, 98-100, 127-131, 157-160, 200-202, 218-222
- meadow: 244 31-35, 54-56, 92-94, 127-131 | 238 31-35, 54-56, 92-94, 127-131, 163-166, 200-203, 220-224
- river: 244 18-22, 42-45, 79-82, 98-102 | 238 18-22, 42-45, 79-82, 98-102, 124-127, 162-166, 184-188, 212-214

## Pairs (244 reached seasons)

| seed | 244 days | 238 days | match | before 244 | lowest 244 | loss% 244 | before 238 | lowest 238 | loss% 238 |
|---|---|---|---|---|---|---|---|---|---|
| aspen | 26-29 | 26-29 | same days | 45 | 45 | 0.0 | 39 | 40 | -2.6 |
| aspen | 49-53 | 49-53 | same days | 66 | 66 | 0.0 | 55 | 55 | 0.0 |
| aspen | 86-88 | 86-88 | same days | 96 | 98 | -2.1 | 84 | 85 | -1.2 |
| birch | 17-20 | 17-20 | same days | 37 | 40 | -8.1 | 34 | 36 | -5.9 |
| birch | 42-46 | 42-46 | same days | 63 | 65 | -3.2 | 57 | 57 | 0.0 |
| birch | 66-70 | 66-70 | same days | 83 | 83 | 0.0 | 68 | 60 | 11.8 |
| birch | 102-105 | 102-105 | same days | 106 | 106 | 0.0 | 74 | 71 | 4.1 |
| cedar | 19-21 | 19-21 | same days | 41 | 41 | 0.0 | 40 | 40 | 0.0 |
| cedar | 49-52 | 49-52 | same days | 60 | 63 | -5.0 | 59 | 61 | -3.4 |
| cedar | 88-90 | 88-90 | same days | 88 | 88 | 0.0 | 86 | 78 | 9.3 |
| cedar | 122-125 | 122-125 | same days | 111 | 111 | 0.0 | 99 | 99 | 0.0 |
| fern | 29-32 | 29-32 | same days | 43 | 43 | 0.0 | 51 | 53 | -3.9 |
| fern | 52-56 | 52-56 | same days | 55 | 55 | 0.0 | 70 | 70 | 0.0 |
| fern | 85-87 | 85-87 | same days | 80 | 82 | -2.5 | 94 | 94 | 0.0 |
| fern | 121-123 | 121-123 | same days | 110 | 110 | 0.0 | 122 | 99 | 18.9 |
| gen-1 | 19-23 | 19-23 | same days | 43 | 43 | 0.0 | 37 | 35 | 5.4 |
| gen-1 | 44-46 | 44-46 | same days | 56 | 56 | 0.0 | 49 | 49 | 0.0 |
| gen-1 | 66-70 | 66-70 | same days | 69 | 70 | -1.4 | 63 | 51 | 19.0 |
| gen-1 | 98-100 | 98-100 | same days | 96 | 97 | -1.0 | 68 | 70 | -2.9 |
| gen-2 | 25-27 | 25-27 | same days | 41 | 41 | 0.0 | 39 | 39 | 0.0 |
| gen-2 | 61-65 | 61-65 | same days | 64 | 64 | 0.0 | 64 | 64 | 0.0 |
| gen-2 | 97-100 | 97-100 | same days | 84 | 84 | 0.0 | 86 | 86 | 0.0 |
| gen-2 | 121-125 | 121-125 | same days | 104 | 104 | 0.0 | 86 | 73 | 15.1 |
| gen-3 | 26-30 | 26-30 | same days | 42 | 42 | 0.0 | 42 | 42 | 0.0 |
| gen-3 | 66-68 | 66-68 | same days | 66 | 68 | -3.0 | 75 | 76 | -1.3 |
| gen-3 | 103-105 | 103-105 | same days | 95 | 98 | -3.2 | 105 | 74 | 29.5 |
| gen-3 | 123-127 | 123-127 | same days | 112 | 114 | -1.8 | 73 | 63 | 13.7 |
| gen-4 | 15-19 | 15-19 | same days | 38 | 38 | 0.0 | 36 | 38 | -5.6 |
| gen-4 | 40-43 | 40-43 | same days | 53 | 53 | 0.0 | 56 | 56 | 0.0 |
| gen-4 | 68-70 | 68-70 | same days | 79 | 79 | 0.0 | 79 | 79 | 0.0 |
| gen-4 | 101-104 | 101-104 | same days | 115 | 94 | 18.3 | 99 | 55 | 44.4 |
| gen-5 | 17-21 | 17-21 | same days | 37 | 37 | 0.0 | 39 | 39 | 0.0 |
| gen-5 | 40-43 | 40-43 | same days | 50 | 53 | -6.0 | 48 | 51 | -6.3 |
| gen-5 | 75-78 | 75-78 | same days | 77 | 78 | -1.3 | 77 | 77 | 0.0 |
| gen-5 | 99-101 | 99-101 | same days | 94 | 96 | -2.1 | 94 | 95 | -1.1 |
| gen-5 | 126-128 | 126-128 | same days | 110 | 111 | -0.9 | 119 | 90 | 24.4 |
| gen-6 | 26-29 | 26-29 | same days | 40 | 42 | -5.0 | 45 | 46 | -2.2 |
| gen-6 | 66-68 | 66-68 | same days | 76 | 76 | 0.0 | 68 | 69 | -1.5 |
| gen-6 | 98-100 | 98-100 | same days | 102 | 102 | 0.0 | 93 | 95 | -2.2 |
| meadow | 31-35 | 31-35 | same days | 47 | 47 | 0.0 | 44 | 46 | -4.5 |
| meadow | 54-56 | 54-56 | same days | 59 | 59 | 0.0 | 56 | 57 | -1.8 |
| meadow | 92-94 | 92-94 | same days | 91 | 93 | -2.2 | 87 | 83 | 4.6 |
| river | 18-22 | 18-22 | same days | 39 | 39 | 0.0 | 38 | 39 | -2.6 |
| river | 42-45 | 42-45 | same days | 57 | 59 | -3.5 | 54 | 57 | -5.6 |
| river | 79-82 | 79-82 | same days | 85 | 85 | 0.0 | 74 | 67 | 9.5 |
| river | 98-102 | 98-102 | same days | 96 | 96 | 0.0 | 75 | 76 | -1.3 |

## Counts

- Seasons reached by the 244 runs: 46
- Pairs at 10% or more loss: 244 = 1; 238 = 8

### 238 loss >= 10% and 244 loss < 10% (same pair)
- birch 244 66-70 (238 66-70): 244 before 83, loss 0.0%; 238 loss 11.8%
- fern 244 121-123 (238 121-123): 244 before 110, loss 0.0%; 238 loss 18.9%
- gen-1 244 66-70 (238 66-70): 244 before 69, loss -1.4%; 238 loss 19.0%
- gen-2 244 121-125 (238 121-125): 244 before 104, loss 0.0%; 238 loss 15.1%
- gen-3 244 103-105 (238 103-105): 244 before 95, loss -3.2%; 238 loss 29.5%
- gen-3 244 123-127 (238 123-127): 244 before 112, loss -1.8%; 238 loss 13.7%
- gen-5 244 126-128 (238 126-128): 244 before 110, loss -0.9%; 238 loss 24.4%

### 244 loss >= 10%
- gen-4 101-104: 115 to 94 (18.3%); 238 101-104: 99 to 55 (44.4%)

### 244 passes with loss < 10% where 238 lost >= 10%, with people-before at 244
- birch 66-70: before 83 at 244, loss 0.0%
- fern 121-123: before 110 at 244, loss 0.0%
- gen-1 66-70: before 69 at 244, loss -1.4%
- gen-2 121-125: before 104 at 244, loss 0.0%
- gen-3 103-105: before 95 at 244, loss -3.2%
- gen-3 123-127: before 112 at 244, loss -1.8%
- gen-5 126-128: before 110 at 244, loss -0.9%

## Reviewer claims vs these numbers

| claim | this run | status |
|---|---|---|
| 47 seasons reached by 244 | 46 reached (last+4 <= daysRun). Adding meadow 127-131 with its window cut at daysRun 132 gives 47 | differs by definition |
| one at 244 >= 10% (gen-4, 101-107, 115 to 94) | gen-4 101-104: before 115, lowest 94 on day 108 (window last+4), 18.3% | reproduces; the reviewer's day span 101-107 is first..last+3, ours is first..last+4 |
| nine at 238 >= 10% | 8 among the 46 reached pairs, plus meadow 127-131 (not reached at 244) = 9 | reproduces when unreached seasons are included |
| meadow 127-131 (238: 95 to 50; 244: 120 to 122) | 238: 95 to 50 (window 127-135). 244: 120 to 122 (window cut at daysRun 132, partial) | reproduces; the 244 figure is a partial window, not a reached season |
| fern 121 (238: 122 to 99) | fern 121-123 at 238: 122 to 99, 18.9% | reproduces |
| gen-5 126 (238: 119 to 90) | gen-5 126-128 at 238: 119 to 90, 24.4% | reproduces |

Re-read check (separate script `check-lean.mjs`, raw JSON, no shared code):
- fern 238 121-123: before 122, lowest 99, loss 18.9%. Matches the table.
- gen-3 244 103-105: before 95, lowest 98, loss -3.2%. Matches.
- aspen 244 49-53: before 66, lowest 66, loss 0.0%. Matches.

Seasons at 238 with 10% or more loss, in the 9 counted above: birch 66-70, fern 121-123, gen-1 66-70, gen-2 121-125, gen-3 103-105, gen-3 123-127, gen-5 126-128, meadow 127-131, plus gen-4 101-104 (44.4%).

Notes:
- Lean is the value used. "dry" also occurs (4 to 29 days per seed at 238), but its run count was not checked. "lean" gives 7 to 8 runs per seed at 238 (one every 2 to 3 years), which matches the stated cadence. Dry runs were not tabulated.
- Every 244 pair is an exact same-day match with its 238 season, so no day-range mismatches were found.
- Several 238 losses are not in the 244 data at all because the 244 runs stop early (120 or 132 days).
