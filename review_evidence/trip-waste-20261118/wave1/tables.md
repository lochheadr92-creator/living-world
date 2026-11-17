# Trip waste measurement: tables (SCRATCH ONLY, 18 November 2026)

Reading: `READING.md` (SHA-256 `c223694b8482d55675cb174633956f6d52b033d20fab677e33b2a5625dadc47d`) with `READING_AMENDMENT_1.md` (question 1 replaced; SHA-256 `ad35c7f96e529a1569d96a184fed1feef7b014574ba09a595cff8e7db09b897f`). Rules 250, day 48 saves, 30 days, one run per arm. Questions 1 and 3 read the nine control runs of `out\free` (A, N1, N2), question 2 the three new runs. People of 12 and over, walks closed and not under way at the first sample. One run per arm is a description, never a rate. No benefit claim.

## Question 1: loads (gather walks that did their job and took at least one unit)

| world | run | gather walks | did job, took >=1 | tiny (T<=2) | share tiny | pack full | short of plan | small plan | other | tiny walking ticks / all walking ticks |
|---|---|---|---|---|---|---|---|---|---|---|
| aspen | A | 4218 | 2500 | 1734 | 69.4% | 1007 | 555 | 172 | 0 | 8.6% |
| aspen | N1 | 3977 | 2533 | 1764 | 69.6% | 916 | 658 | 190 | 0 | 8.8% |
| aspen | N2 | 4550 | 2726 | 1913 | 70.2% | 1062 | 645 | 206 | 0 | 9.0% |
| aspen | **pooled** | 12745 | 7759 | 5411 | 69.7% | 55.2% | 34.3% | 10.5% | 0.0% | 8.8% |
| river | A | 4752 | 2774 | 2067 | 74.5% | 1207 | 639 | 221 | 0 | 9.0% |
| river | N1 | 4694 | 2874 | 2114 | 73.6% | 1347 | 575 | 192 | 0 | 8.2% |
| river | N2 | 4423 | 2674 | 1965 | 73.5% | 1233 | 550 | 182 | 0 | 7.7% |
| river | **pooled** | 13869 | 8322 | 6146 | 73.9% | 61.6% | 28.7% | 9.7% | 0.0% | 8.3% |
| gen-4 | A | 4878 | 2922 | 1950 | 66.7% | 1153 | 565 | 232 | 0 | 7.3% |
| gen-4 | N1 | 4598 | 2764 | 1813 | 65.6% | 1075 | 569 | 169 | 0 | 7.3% |
| gen-4 | N2 | 4779 | 2829 | 1920 | 67.9% | 1107 | 616 | 197 | 0 | 7.4% |
| gen-4 | **pooled** | 14255 | 8515 | 5683 | 66.7% | 58.7% | 30.8% | 10.5% | 0.0% | 7.3% |

**Verdict, question 1: TINY LOADS ARE THE PACK** (pooled shares of the tiny gathers; pack full 55.2% / 61.6% / 58.7%, small plan 10.5% / 9.7% / 10.5%, short of plan 34.3% / 28.7% / 30.8%, in aspen / river / gen-4).

Units taken by a gather that did its job (pooled), room at the start of the walk, what the pack held, and what the tiny gathers were for:

| world | taken 1 | 2 | 3 | 4 | 5 | 6+ | room 0-2 | room 3-5 | room 6+ | pack weight / capacity at start | in it: food | wood | stone | other materials | tools | seeds | other |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aspen | 3417 | 1994 | 1369 | 692 | 277 | 10 | 2990 | 2529 | 2240 | 65.0% | 11.9% | 7.2% | 8.0% | 5.6% | 22.1% | 8.2% | 2.0% |
| river | 4071 | 2075 | 1233 | 689 | 234 | 20 | 3794 | 2431 | 2097 | 68.8% | 10.7% | 8.5% | 10.4% | 8.8% | 22.0% | 6.3% | 2.1% |
| gen-4 | 3563 | 2120 | 1421 | 1050 | 361 | 0 | 3337 | 2702 | 2476 | 65.4% | 10.4% | 8.6% | 8.6% | 8.3% | 22.6% | 6.1% | 0.9% |

- aspen, tiny gathers by purpose: stock 2035; eat 1574; site 681; repair 561; fire 374; craft 130. By source type: berry_bush 1577; tree 1504; wild_grain 751; fish_spot 740; fruit_tree 541; outcrop 144; clay_pit 85; rock 65.
- river, tiny gathers by purpose: stock 2232; eat 1864; repair 627; fire 622; site 575; craft 97. By source type: berry_bush 1869; tree 1656; wild_grain 999; fish_spot 821; fruit_tree 490; outcrop 134; rock 116; clay_pit 51.
- gen-4, tiny gathers by purpose: stock 2019; eat 1666; repair 765; site 590; fire 518; craft 73. By source type: berry_bush 1944; tree 1574; fish_spot 704; wild_grain 531; fruit_tree 506; outcrop 243; rock 124; clay_pit 43.

## Question 2: withdraws (the three new runs; people of 12 and over)

| world | end hash | expected (control A) | equal | purity | conservation | withdraw ticks WithdrawCheck = TripShape | withdraws | took all | took some | took none, empty | took none, other | ended before arrival | open at end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| aspen | 168d98f7 | 168d98f7 | true | 600 | true | true (95679) | 2495 | 1172 | 19 | 959 | 10 | 333 | 2 |
| river | 8f513a37 | 8f513a37 | true | 600 | true | true (86242) | 1764 | 775 | 16 | 519 | 3 | 445 | 6 |
| gen-4 | 523f2943 | 523f2943 | true | 600 | true | true (126045) | 3057 | 1288 | 26 | 1226 | 13 | 500 | 4 |

The empty withdraws (arrived, "there was nothing to take"), by what was true:

| world | empty withdraws | stale at departure | (with a belief of 1+ unit) | drained on the way | emptied while waiting | stock there, nothing allowed | glance (belief 1, true 2+) | belief age median (ticks) | walking ticks of the empty ones | share of all adult withdraw walking ticks | share of all adult walking ticks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| aspen | 959 | 16 | 6 | 16 | 12 | 915 | 778 (81.1%) | 2 | 51464 | 53.8% | 4.1% |
| river | 519 | 8 | 6 | 16 | 6 | 489 | 400 (77.1%) | 2 | 31274 | 36.3% | 2.2% |
| gen-4 | 1226 | 13 | 7 | 26 | 19 | 1168 | 1075 (87.7%) | 2 | 61686 | 48.9% | 3.9% |

**Verdict, question 2: EMPTY WITHDRAWS ARE ACCESS** (stale with a belief 0.6% / 1.2% / 0.6%, race 2.9% / 4.2% / 3.7%, access 95.4% / 94.2% / 95.3%, in aspen / river / gen-4, as shares of the empty withdraws).

### aspen

- Store class (result counts): shared: all 2360, took all 1074, empty 931, before arrival 325; pile: all 20, took all 19, empty 1, before arrival 0; own_household: all 78, took all 76, empty 0, before arrival 1; gone: all 1, took all 0, empty 0, before arrival 1; other_household: all 36, took all 3, empty 27, before arrival 6.
- Building type: bakery: all 958, empty 672; granary: all 376, empty 5; smithy: all 319, empty 73; kiln: all 210, empty 77; quarry: all 198, empty 42; timber_yard: all 193, empty 34; food_rack: all 80, empty 45; mill: all 36, empty 3.
- Belief class at departure (all withdraws): exact: all 686, empty 175; believed_less_than_there: all 1721, empty 778; believed_more_than_there: all 87, empty 6; place_gone: all 1, empty 0. Glance among all withdraws: 1720 (68.9%).
- Pack room for the wanted kind at departure: room_for_all: all 2495, took none 969. Units wanted median 1 (mean 1.737); units taken when something was taken median 1 (mean 1.202).
- Repeat empties at the same place: 944 second-or-later empty walks, 932 by a different person than the last; ticks from the last empty end to the next walk start: median -0.5.
- Belief source of the empty ones: {"seen":959}; belief age (ticks) p25/median/p75: 1/2/64.5.
- What the withdraws were for (top goals): other | to bake the household's grain into bread, which feeds further and keep 1382; other | the smithy burns charcoal to smelt and forge 227; other | the smithy forges tools from iron (smelted iron) 83; other | the smithy forges tools from iron 72; other | bring preserved food back for meals 66; other | keep spare food for later meals (dried fish) 64; other | for my household’s house (fired bricks) 59; material:stone | for my household’s cellar 46.

### river

- Store class (result counts): shared: all 1709, took all 731, empty 518, before arrival 435; pile: all 41, took all 35, empty 1, before arrival 5; own_household: all 9, took all 9, empty 0, before arrival 0; gone: all 5, took all 0, empty 0, before arrival 5.
- Building type: bakery: all 479, empty 176; smithy: all 290, empty 31; timber_yard: all 281, empty 75; quarry: all 240, empty 63; kiln: all 170, empty 49; mill: all 145, empty 81; food_rack: all 50, empty 39; pile: all 41, empty 1.
- Belief class at departure (all withdraws): exact: all 481, empty 111; believed_less_than_there: all 1178, empty 400; believed_more_than_there: all 100, empty 8; place_gone: all 5, empty 0. Glance among all withdraws: 1174 (66.6%).
- Pack room for the wanted kind at departure: room_for_all: all 1764, took none 522. Units wanted median 1 (mean 1.485); units taken when something was taken median 1 (mean 1.24).
- Repeat empties at the same place: 506 second-or-later empty walks, 502 by a different person than the last; ticks from the last empty end to the next walk start: median 33.5.
- Belief source of the empty ones: {"seen":519}; belief age (ticks) p25/median/p75: 1/2/20.5.
- What the withdraws were for (top goals): other | to bake the household's grain into bread, which feeds further and keep 697; other | the smithy burns charcoal to smelt and forge 220; other | supplies for known sheep care 163; other | the smithy forges tools from iron (smelted iron) 85; material:stone | for my household’s cellar 71; other | bring preserved food back for meals 50; material:stone | to repair the cellar 49; material:stone | for my household’s hut 39.

### gen-4

- Store class (result counts): shared: all 2373, took all 1172, empty 733, before arrival 439; other_household: all 534, took all 2, empty 482, before arrival 38; pile: all 81, took all 66, empty 5, before arrival 10; own_household: all 61, took all 48, empty 6, before arrival 5; gone: all 8, took all 0, empty 0, before arrival 8.
- Building type: bakery: all 929, empty 416; timber_yard: all 647, empty 508; kiln: all 437, empty 62; smithy: all 258, empty 29; granary: all 220, empty 1; food_rack: all 189, empty 109; quarry: all 149, empty 47; mill: all 93, empty 48.
- Belief class at departure (all withdraws): believed_less_than_there: all 2104, empty 1075; exact: all 790, empty 144; believed_more_than_there: all 155, empty 7; place_gone: all 8, empty 0. Glance among all withdraws: 2099 (68.7%).
- Pack room for the wanted kind at departure: room_for_all: all 3056, took none 1239; room_for_some: all 1, took none 0. Units wanted median 1 (mean 1.607); units taken when something was taken median 1 (mean 1.152).
- Repeat empties at the same place: 1208 second-or-later empty walks, 1194 by a different person than the last; ticks from the last empty end to the next walk start: median 12.
- Belief source of the empty ones: {"seen":1226}; belief age (ticks) p25/median/p75: 1/2/16.
- What the withdraws were for (top goals): other | to bake the household's grain into bread, which feeds further and keep 1501; other | for a public project I support hall 172; other | bring preserved food back for meals 164; other | for the shared granary 156; other | the smithy forges tools from iron (smelted iron) (charcoal) 142; other | for my household’s house 125; other | to see # iron through at the smithy 118; other | the smithy forges tools from iron (smelted iron) 102.

## Question 3: walks dropped before arrival (nine controls, pooled by world)

| world | walks | walking ticks | dropped walks, ticks | share of all walking ticks | of which gather+withdraw: ticks | the place looked empty | something better came up + switched to something else | danger nearby | other reasons | arrived, no job: ticks | share of all walking ticks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| aspen | 61044 | 3761282 | 762314 | 20.3% | 296217 | 14.7% | 68.1% | 15.6% | 1.6% | 341980 | 9.1% |
| river | 68184 | 4525137 | 880016 | 19.4% | 344129 | 14.6% | 77.2% | 6.5% | 1.7% | 336468 | 7.4% |
| gen-4 | 69585 | 4638463 | 953763 | 20.6% | 396822 | 16.4% | 72.5% | 8.4% | 2.7% | 480312 | 10.4% |

**Verdict, question 3: DROPPED WALKS ARE REVIEW SWITCHES** (gather and withdraw walks ended before arrival, by walking ticks: the place looked empty 14.7% / 14.6% / 16.4%, review switches 68.1% / 77.2% / 72.5%, in aspen / river / gen-4).

- aspen, dropped walking ticks by kind: gather 230806; deposit 72277; explore 70688; withdraw 65411; flee 49651; give 43206; operate 35232. Largest switches (from -> to, ticks): gather -> gather 106487; gather -> flee 44267; explore -> flee 19268; gather -> sleep 14479; withdraw -> withdraw 13351; flee -> gather 12501.
  Reasons, top (kind | outcome | detail, ticks): gather|interrupted | something better came up 136553; deposit|interrupted | something better came up 71066; withdraw|interrupted | something better came up 65054; explore|interrupted | something better came up 50933; flee|interrupted | something better came up 48778; gather|interrupted | danger nearby 45970; gather|interrupted | the place looked empty 43459.
- river, dropped walking ticks by kind: gather 243184; withdraw 100945; explore 99292; deposit 68109; operate 45807; give 38352; socialize 29059. Largest switches (from -> to, ticks): gather -> gather 137511; withdraw -> withdraw 23276; gather -> flee 21714; explore -> drink 15837; gather -> sleep 15250; explore -> gather 14653.
  Reasons, top (kind | outcome | detail, ticks): gather|interrupted | something better came up 164877; withdraw|interrupted | something better came up 100898; explore|interrupted | something better came up 84222; deposit|interrupted | something better came up 67500; gather|interrupted | the place looked empty 50115; operate|interrupted | something better came up 45788; give|interrupted | something better came up 33593.
- gen-4, dropped walking ticks by kind: gather 291130; withdraw 105692; deposit 87045; explore 69535; operate 67270; socialize 34534; haul 32092. Largest switches (from -> to, ticks): gather -> gather 156281; gather -> flee 32186; withdraw -> withdraw 26516; gather -> sleep 17375; socialize -> socialize 16756; deposit -> operate 14469.
  Reasons, top (kind | outcome | detail, ticks): gather|interrupted | something better came up 182522; withdraw|interrupted | something better came up 105123; deposit|interrupted | something better came up 85703; operate|interrupted | something better came up 66798; gather|interrupted | the place looked empty 65086; explore|interrupted | something better came up 60337; gather|interrupted | danger nearby 32957.

## Walking ticks counted as waste, as a share of all walking ticks of people of 12 and over (arm A of each world; the three overlap and are not added)

| world | withdraws that took none, empty | gathers that took 2 units or fewer | walks dropped before arrival (all kinds) | walks that arrived with no job (all kinds) |
|---|---|---|---|---|
| aspen | 4.1% | 8.6% | 20.9% | 8.6% |
| river | 2.2% | 9.0% | 19.1% | 6.7% |
| gen-4 | 3.9% | 7.3% | 20.4% | 11.2% |

The first column reads the new runs (their own walking ticks as the denominator); the other three read the control A runs of `out\free`, which the new runs equal by hash, so the denominators agree.

## Arrived with no job: what the walks were (nine controls pooled)

- aspen: operate|failed | lacks # flour 51120; gather|failed | nothing left 34613; gather|failed | it is gone 29071; operate|failed | it is burning; there is nothing to do but wait 23671; deposit|failed | the cellar doorway is inaccessible 13400; operate|failed | lacks # clay 11622; eat_store|failed | there is no food there 10842; socialize|failed | they walked away 8797.
- river: gather|failed | nothing left 53776; gather|failed | it is gone 36594; operate|failed | lacks # flour 31986; operate|failed | it is burning; there is nothing to do but wait 16803; socialize|failed | they walked away 10463; harvest|failed | it is not ripe 10149; gather|failed | someone else is already taking it 8814; eat_store|failed | there is no food there 8588.
- gen-4: operate|failed | lacks # wood 130382; gather|failed | nothing left 67932; gather|failed | it is gone 38883; operate|failed | lacks # flour 22434; socialize|failed | they walked away 13587; operate|failed | it is burning; there is nothing to do but wait 13187; eat_store|failed | there is no food there 13021; deposit|failed | the cellar doorway is inaccessible 11546.
