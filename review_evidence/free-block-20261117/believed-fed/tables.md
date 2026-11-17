## Checks

| run | arm flags | end hash | stop | conservation | purity checks | travel totals equal | LifeTally equal | window check equal | DayShape self checks | TripShape self checks | waking 12+ equal | people start | end | born | came | died | causes | plenty factors | seconds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen-A | (none) | 168d98f7 | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 51 | 68 | 4 | 15 | 2 | thirst 1, wolf attack 1 | {"wild":2,"crops":2} | 821.7 |
| aspen-N1 | --nudge 1 | 1b558976 | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 51 | 73 | 4 | 19 | 2 | exposure 1, wolf attack 1 | {"wild":2,"crops":2} | 846.9 |
| aspen-N2 | --nudge 2 | 223810d7 | horizon | ok | 600 | ok | ok | ok | ok | FAIL | ok | 51 | 71 | 3 | 17 | 0 | - | {"wild":2,"crops":2} | 882.6 |
| aspen-D | --block-from 0.62 | a5f9e6c5 | horizon | ok | 600 | ok | ok | ok | ok | FAIL | ok | 51 | 73 | 5 | 17 | 0 | - | {"wild":2,"crops":2} | 892.3 |
| aspen-E | --block-from 0.5 | 9b18443b | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 51 | 66 | 3 | 12 | 0 | - | {"wild":2,"crops":2} | 872.6 |
| aspen-Drepeat | --block-from 0.62 | a5f9e6c5 | horizon | ok | 600 | ok | ok | ok | ok | FAIL | ok | 51 | 73 | 5 | 17 | 0 | - | {"wild":2,"crops":2} | 896.9 |
| river-A | (none) | 8f513a37 | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 55 | 80 | 3 | 22 | 0 | - | {"wild":2,"crops":2} | 986.7 |
| river-N1 | --nudge 1 | f5c94bc3 | horizon | ok | 600 | ok | ok | ok | ok | FAIL | ok | 55 | 82 | 2 | 25 | 0 | - | {"wild":2,"crops":2} | 1027.3 |
| river-N2 | --nudge 2 | 6bbef310 | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 55 | 77 | 1 | 21 | 0 | - | {"wild":2,"crops":2} | 994.7 |
| river-D | --block-from 0.62 | fda566ff | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 55 | 80 | 4 | 21 | 0 | - | {"wild":2,"crops":2} | 950.5 |
| river-E | --block-from 0.5 | 4c7bb7ec | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 55 | 77 | 2 | 22 | 3 | thirst 1, wolf attack 1, fever 1 | {"wild":2,"crops":2} | 944.1 |
| gen-4-A | (none) | 523f2943 | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 55 | 74 | 2 | 18 | 1 | old age 1 | {"wild":2,"crops":2} | 913.9 |
| gen-4-N1 | --nudge 1 | eeaa0e36 | horizon | ok | 600 | ok | ok | ok | ok | FAIL | ok | 55 | 71 | 0 | 16 | 0 | - | {"wild":2,"crops":2} | 891 |
| gen-4-N2 | --nudge 2 | 1169383e | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 55 | 77 | 3 | 20 | 1 | thirst 1 | {"wild":2,"crops":2} | 926.8 |
| gen-4-D | --block-from 0.62 | 2551f4c0 | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 55 | 73 | 2 | 19 | 3 | wolf attack 2, thirst 1 | {"wild":2,"crops":2} | 878.7 |
| gen-4-E | --block-from 0.5 | f7be2479 | horizon | ok | 600 | ok | ok | ok | ok | ok | ok | 55 | 76 | 1 | 20 | 0 | - | {"wild":2,"crops":2} | 930 |

### The four hash equality checks

- aspen A ends on 168d98f7; expected 168d98f7: EQUAL.
- river A ends on 8f513a37; expected 8f513a37: EQUAL.
- gen-4 A ends on 523f2943; expected 523f2943: EQUAL.
- aspen D ends on a5f9e6c5; the repeat ends on a5f9e6c5: EQUAL.
- All of the start hashes of one world (the save as loaded): aspen dee927ec; river 4fa2271f; gen-4 65d632bc.

## Main table, people aged 12 and over (share of their waking ticks, per cent)

| world | arm | travel | work | social_contact | leisure | waiting | rest | idle | eating_drinking_warming | other | LIFE (social + leisure) | outdoor company | hungry, no food in pack or home | sleep before bedtime, window D (% of window ticks) | window E |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | A | 55.1 | 14.1 | 10.9 | 0.3 | 9.7 | 4.6 | 0.7 | 3.7 | 1.1 | 11.1 | 40.3 | 14.5 | 1.5 | 0.9 |
| aspen | N1 | 48.7 | 13.1 | 9.9 | 0.3 | 8.6 | 13.0 | 0.6 | 5.5 | 0.4 | 10.2 | 42.6 | 20.7 | 1.4 | 0.9 |
| aspen | N2 | 53.0 | 14.1 | 10.9 | 0.3 | 8.2 | 7.4 | 0.7 | 4.9 | 0.5 | 11.1 | 42.7 | 16.2 | 1.8 | 1.2 |
| aspen | D | 54.1 | 13.9 | 11.0 | 0.4 | 7.5 | 7.6 | 0.7 | 4.4 | 0.5 | 11.4 | 42.9 | 17.0 | 1.9 | 1.2 |
| aspen | E | 53.4 | 13.7 | 11.1 | 0.5 | 9.7 | 5.9 | 0.7 | 4.3 | 0.7 | 11.6 | 42.1 | 15.2 | 1.5 | 1.0 |
| river | A | 48.3 | 11.3 | 11.2 | 0.2 | 9.1 | 12.5 | 0.6 | 6.6 | 0.3 | 11.4 | 44.8 | 20.2 | 1.4 | 1.0 |
| river | N1 | 53.9 | 12.4 | 11.0 | 0.2 | 8.0 | 9.2 | 0.6 | 4.2 | 0.5 | 11.2 | 45.0 | 18.4 | 0.9 | 0.6 |
| river | N2 | 54.7 | 12.5 | 10.8 | 0.3 | 8.7 | 7.4 | 0.6 | 4.5 | 0.4 | 11.1 | 44.5 | 18.2 | 0.8 | 0.6 |
| river | D | 54.2 | 11.8 | 10.9 | 0.3 | 8.3 | 9.4 | 0.6 | 4.2 | 0.2 | 11.2 | 41.6 | 15.9 | 1.4 | 0.9 |
| river | E | 53.5 | 11.5 | 11.5 | 0.3 | 8.8 | 9.1 | 0.6 | 4.0 | 0.6 | 11.8 | 42.1 | 16.0 | 1.2 | 0.8 |
| gen-4 | A | 55.4 | 11.9 | 10.7 | 0.3 | 9.2 | 7.8 | 0.6 | 3.6 | 0.4 | 11.0 | 39.7 | 15.3 | 1.2 | 0.8 |
| gen-4 | N1 | 53.7 | 11.7 | 9.8 | 0.3 | 7.6 | 9.9 | 0.6 | 5.8 | 0.4 | 10.2 | 40.4 | 14.4 | 1.5 | 1.1 |
| gen-4 | N2 | 51.9 | 11.5 | 11.0 | 0.3 | 9.1 | 9.8 | 0.6 | 5.3 | 0.5 | 11.2 | 42.1 | 17.6 | 1.3 | 0.8 |
| gen-4 | D | 53.5 | 11.5 | 10.8 | 0.5 | 9.5 | 8.6 | 0.6 | 4.4 | 0.7 | 11.3 | 39.2 | 15.8 | 0.9 | 0.6 |
| gen-4 | E | 51.9 | 11.7 | 11.3 | 0.3 | 9.7 | 9.3 | 0.6 | 4.8 | 0.4 | 11.6 | 42.0 | 15.4 | 1.7 | 1.3 |

## The same for everyone (per cent of waking ticks)

| world | arm | travel | work | social_contact | leisure | waiting | rest | idle | eating_drinking_warming | other | LIFE (social + leisure) | outdoor company | hungry, no food in pack or home |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | A | 47.8 | 10.0 | 16.4 | 1.8 | 13.0 | 6.2 | 0.6 | 3.3 | 0.8 | 18.2 | 42.5 | 18.9 |
| aspen | N1 | 43.2 | 9.8 | 13.6 | 1.5 | 11.1 | 14.7 | 0.6 | 5.2 | 0.3 | 15.1 | 43.7 | 26.1 |
| aspen | N2 | 46.1 | 10.2 | 15.7 | 1.9 | 11.3 | 8.9 | 0.6 | 4.8 | 0.4 | 17.6 | 44.7 | 21.3 |
| aspen | D | 47.8 | 10.2 | 15.9 | 1.8 | 9.9 | 9.2 | 0.6 | 4.1 | 0.4 | 17.7 | 44.9 | 22.0 |
| aspen | E | 46.1 | 10.0 | 15.6 | 1.8 | 13.1 | 8.2 | 0.6 | 4.2 | 0.5 | 17.4 | 43.5 | 18.6 |
| river | A | 42.6 | 8.6 | 14.6 | 1.2 | 12.2 | 13.8 | 0.6 | 6.3 | 0.3 | 15.7 | 45.6 | 25.8 |
| river | N1 | 46.9 | 9.5 | 14.7 | 1.5 | 11.3 | 11.0 | 0.6 | 4.1 | 0.4 | 16.3 | 45.9 | 23.1 |
| river | N2 | 47.3 | 9.6 | 14.6 | 1.5 | 12.3 | 9.2 | 0.6 | 4.6 | 0.4 | 16.1 | 45.0 | 20.3 |
| river | D | 47.7 | 8.9 | 15.1 | 2.0 | 11.1 | 10.3 | 0.6 | 4.1 | 0.2 | 17.0 | 43.4 | 20.5 |
| river | E | 46.6 | 8.6 | 15.4 | 1.5 | 12.0 | 10.9 | 0.6 | 3.8 | 0.5 | 16.9 | 43.3 | 22.1 |
| gen-4 | A | 50.5 | 9.5 | 14.0 | 1.4 | 11.1 | 8.9 | 0.6 | 3.5 | 0.3 | 15.4 | 40.8 | 18.6 |
| gen-4 | N1 | 49.2 | 9.4 | 13.2 | 1.4 | 9.5 | 11.0 | 0.6 | 5.4 | 0.4 | 14.6 | 41.2 | 17.8 |
| gen-4 | N2 | 47.2 | 9.3 | 13.5 | 1.2 | 11.1 | 11.4 | 0.6 | 5.3 | 0.5 | 14.7 | 42.4 | 21.4 |
| gen-4 | D | 48.8 | 9.3 | 13.7 | 1.6 | 11.5 | 9.7 | 0.6 | 4.3 | 0.6 | 15.3 | 40.0 | 18.9 |
| gen-4 | E | 46.2 | 9.1 | 14.3 | 1.3 | 12.2 | 11.3 | 0.6 | 4.7 | 0.4 | 15.7 | 42.4 | 19.1 |

## Food, work and people (everyone; food at the end of day 30; gathered and jobs are a head a day)

| world | arm | food held a head, end | in packs | in home stores | in granaries | in other buildings (incl. cellars, granaries) | food gathered | wood gathered | share of gathered units by 12 and over % | work jobs finished (TripShape life kind work) | all jobs finished | people start | people end | died | causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | A | 9.04 | 1.85 | 0.18 | 6.15 | 6.96 | 2.22 | 0.59 | 96.3 | 2.51 | 7.69 | 51 | 68 | 2 | thirst 1, wolf attack 1 |
| aspen | N1 | 10.77 | 2.04 | 0.09 | 8.16 | 8.64 | 2.21 | 0.61 | 96.1 | 2.33 | 7.35 | 51 | 73 | 2 | exposure 1, wolf attack 1 |
| aspen | N2 | 10.29 | 2.38 | 0.16 | 6.90 | 7.74 | 2.30 | 0.61 | 96.3 | 2.51 | 7.79 | 51 | 71 | 0 | - |
| aspen | D | 6.92 | 1.89 | 0.14 | 3.97 | 4.86 | 2.24 | 0.64 | 97.4 | 2.40 | 7.52 | 51 | 73 | 0 | - |
| aspen | E | 9.91 | 2.38 | 0.32 | 5.97 | 7.08 | 2.18 | 0.59 | 96.5 | 2.57 | 7.86 | 51 | 66 | 0 | - |
| river | A | 6.10 | 1.61 | 0.27 | 3.82 | 4.23 | 2.03 | 0.55 | 94.2 | 2.19 | 7.30 | 55 | 80 | 0 | - |
| river | N1 | 7.42 | 1.51 | 0.36 | 4.83 | 5.54 | 2.09 | 0.61 | 94.2 | 2.45 | 7.58 | 55 | 82 | 0 | - |
| river | N2 | 8.57 | 2.53 | 0.10 | 5.47 | 5.93 | 1.94 | 0.65 | 93.3 | 2.54 | 7.68 | 55 | 77 | 0 | - |
| river | D | 4.46 | 1.88 | 0.13 | 1.68 | 2.45 | 2.21 | 0.58 | 94.0 | 2.34 | 7.54 | 55 | 80 | 0 | - |
| river | E | 5.92 | 2.12 | 0.22 | 3.22 | 3.57 | 2.14 | 0.55 | 94.8 | 2.27 | 7.45 | 55 | 77 | 3 | thirst 1, wolf attack 1, fever 1 |
| gen-4 | A | 10.34 | 2.03 | 0.08 | 6.82 | 8.22 | 2.51 | 0.66 | 95.8 | 2.41 | 7.49 | 55 | 74 | 1 | old age 1 |
| gen-4 | N1 | 8.44 | 1.97 | 0.18 | 5.79 | 6.27 | 2.45 | 0.62 | 95.5 | 2.36 | 7.37 | 55 | 71 | 0 | - |
| gen-4 | N2 | 7.77 | 2.08 | 0.34 | 4.60 | 5.27 | 2.33 | 0.60 | 96.0 | 2.25 | 7.38 | 55 | 77 | 1 | thirst 1 |
| gen-4 | D | 8.45 | 2.82 | 0.28 | 4.31 | 5.35 | 2.57 | 0.62 | 94.9 | 2.29 | 7.44 | 55 | 73 | 3 | wolf attack 2, thirst 1 |
| gen-4 | E | 6.39 | 2.32 | 0.24 | 2.99 | 3.79 | 2.42 | 0.61 | 95.5 | 2.24 | 7.38 | 55 | 76 | 0 | - |

The window columns are the share of person-ticks of people aged 12 and over inside that window (from F to their own bedtime) that are asleep. "Food gathered" and "wood gathered" are units a head a day from TripShape (gather walks that ended inside the run), as scripts out\pace\tables.md counted them. "Other buildings" include cellars and granaries; "in granaries" is the granary part of it, from the same daily food row.

## Window table: where the predicate holds (people aged 12 and over, per world, arm and window)

Window D starts at day fraction 0.62, window E at 0.50, each until the person's own bedtime (0.8 + chrono). Both windows are accounted in every run, gate on or off. A person-tick is counted whether the person is asleep or awake. "Holds" means the gate would apply: no need under its CRITICAL level and, as that person believes it, at least one day (4 units) of food a head in their household.

| run | window | window person-ticks | holds % | fails: urgent need only % | household short only % | both % | holding ticks: outdoor company % | gate on in this run for this window |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen-A | D | 534513 | 10.1 | 0.0 | 89.2 | 0.6 | 42.9 |  |
| aspen-A | E | 890303 | 9.8 | 0.0 | 89.5 | 0.7 | 43.0 |  |
| aspen-N1 | D | 574028 | 8.5 | 0.0 | 90.5 | 1.0 | 42.9 |  |
| aspen-N1 | E | 956406 | 8.5 | 0.0 | 90.4 | 1.1 | 42.8 |  |
| aspen-N2 | D | 572379 | 9.4 | 0.0 | 90.3 | 0.3 | 40.1 |  |
| aspen-N2 | E | 947639 | 9.2 | 0.0 | 90.6 | 0.2 | 39.8 |  |
| aspen-D | D | 585131 | 10.2 | 0.0 | 89.5 | 0.2 | 58.4 | yes (its own window) |
| aspen-D | E | 975469 | 10.2 | 0.0 | 89.5 | 0.2 | 53.3 |  |
| aspen-E | D | 566940 | 11.9 | 0.0 | 87.8 | 0.4 | 60.8 |  |
| aspen-E | E | 937469 | 11.8 | 0.0 | 87.8 | 0.3 | 56.9 | yes (its own window) |
| aspen-Drepeat | D | 585131 | 10.2 | 0.0 | 89.5 | 0.2 | 58.4 | yes (its own window) |
| aspen-Drepeat | E | 975469 | 10.2 | 0.0 | 89.5 | 0.2 | 53.3 |  |
| river-A | D | 638346 | 9.5 | 0.0 | 90.1 | 0.4 | 43.9 |  |
| river-A | E | 1077808 | 9.1 | 0.0 | 90.5 | 0.4 | 44.8 |  |
| river-N1 | D | 658329 | 13.1 | 0.0 | 86.5 | 0.5 | 48.3 |  |
| river-N1 | E | 1107749 | 13.1 | 0.0 | 86.4 | 0.5 | 46.5 |  |
| river-N2 | D | 636000 | 14.9 | 0.0 | 84.7 | 0.4 | 49.1 |  |
| river-N2 | E | 1073571 | 14.8 | 0.0 | 84.9 | 0.3 | 47.0 |  |
| river-D | D | 619118 | 14.6 | 0.1 | 84.6 | 0.8 | 52.7 | yes (its own window) |
| river-D | E | 1045625 | 14.0 | 0.0 | 85.3 | 0.6 | 48.2 |  |
| river-E | D | 627692 | 10.8 | 0.0 | 88.7 | 0.5 | 63.0 |  |
| river-E | E | 1060193 | 10.5 | 0.0 | 89.0 | 0.5 | 57.1 | yes (its own window) |
| gen-4-A | D | 652714 | 17.7 | 0.0 | 82.0 | 0.3 | 45.1 |  |
| gen-4-A | E | 1091767 | 17.7 | 0.0 | 82.1 | 0.3 | 43.8 |  |
| gen-4-N1 | D | 638949 | 19.4 | 0.0 | 80.3 | 0.2 | 45.6 |  |
| gen-4-N1 | E | 1074823 | 18.5 | 0.0 | 81.3 | 0.2 | 44.5 |  |
| gen-4-N2 | D | 674054 | 14.6 | 0.1 | 85.0 | 0.4 | 48.9 |  |
| gen-4-N2 | E | 1127425 | 14.0 | 0.1 | 85.5 | 0.5 | 48.2 |  |
| gen-4-D | D | 638490 | 19.3 | 0.1 | 79.4 | 1.2 | 54.9 | yes (its own window) |
| gen-4-D | E | 1071185 | 19.1 | 0.1 | 79.7 | 1.0 | 49.1 |  |
| gen-4-E | D | 668580 | 13.9 | 0.0 | 85.6 | 0.5 | 58.7 |  |
| gen-4-E | E | 1114255 | 13.6 | 0.0 | 86.0 | 0.4 | 53.8 | yes (its own window) |

### The holding ticks by TimeBudget category (% of holding ticks)

| run | window | holding ticks | travel | work | social_contact | leisure | waiting | rest | idle | eating_drinking_warming | sleep | failure_recovery | defence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen-A | D | 54034 | 55.7 | 18.7 | 12.0 | 1.6 | 0.6 | 4.2 | 0.9 | 5.1 | 1.0 | 0.2 | 0.0 |
| aspen-A | E | 87625 | 55.7 | 17.7 | 13.5 | 1.0 | 0.5 | 4.2 | 0.9 | 5.6 | 0.6 | 0.2 | 0.0 |
| aspen-N1 | D | 49012 | 59.7 | 18.5 | 10.9 | 1.4 | 0.6 | 4.4 | 0.8 | 2.8 | 0.4 | 0.3 | 0.3 |
| aspen-N1 | E | 81494 | 59.3 | 18.0 | 12.7 | 0.8 | 0.5 | 4.1 | 0.8 | 3.2 | 0.2 | 0.3 | 0.2 |
| aspen-N2 | D | 53863 | 62.8 | 18.6 | 11.7 | 1.0 | 0.5 | 1.1 | 0.9 | 2.6 | 0.6 | 0.3 | 0.1 |
| aspen-N2 | E | 87318 | 62.5 | 19.2 | 12.3 | 0.6 | 0.4 | 0.8 | 0.9 | 2.6 | 0.4 | 0.3 | 0.1 |
| aspen-D | D | 59559 | 51.3 | 6.4 | 25.1 | 4.5 | 0.1 | 5.2 | 0.6 | 3.9 | 2.4 | 0.3 | 0.4 |
| aspen-D | E | 99597 | 54.9 | 10.9 | 22.3 | 2.7 | 0.2 | 3.1 | 0.7 | 3.4 | 1.4 | 0.2 | 0.2 |
| aspen-E | D | 67335 | 43.4 | 4.0 | 26.1 | 6.9 | 0.6 | 11.1 | 0.5 | 6.7 | 0.4 | 0.3 | 0.0 |
| aspen-E | E | 111042 | 47.4 | 5.7 | 25.5 | 4.3 | 0.4 | 8.9 | 0.6 | 6.5 | 0.2 | 0.3 | 0.1 |
| aspen-Drepeat | D | 59559 | 51.3 | 6.4 | 25.1 | 4.5 | 0.1 | 5.2 | 0.6 | 3.9 | 2.4 | 0.3 | 0.4 |
| aspen-Drepeat | E | 99597 | 54.9 | 10.9 | 22.3 | 2.7 | 0.2 | 3.1 | 0.7 | 3.4 | 1.4 | 0.2 | 0.2 |
| river-A | D | 60566 | 53.0 | 12.3 | 16.9 | 0.9 | 0.5 | 10.3 | 0.7 | 4.5 | 0.8 | 0.2 | 0.0 |
| river-A | E | 97897 | 52.2 | 12.1 | 18.5 | 0.5 | 0.5 | 10.3 | 0.7 | 4.4 | 0.5 | 0.2 | 0.0 |
| river-N1 | D | 85882 | 56.9 | 15.1 | 16.7 | 1.1 | 0.4 | 5.3 | 0.7 | 2.5 | 1.0 | 0.3 | 0.0 |
| river-N1 | E | 144653 | 58.0 | 15.2 | 16.5 | 0.7 | 0.4 | 5.7 | 0.7 | 2.1 | 0.6 | 0.3 | 0.0 |
| river-N2 | D | 95042 | 55.1 | 15.0 | 16.6 | 1.6 | 0.5 | 6.9 | 0.7 | 2.7 | 0.4 | 0.3 | 0.2 |
| river-N2 | E | 158673 | 56.9 | 15.7 | 16.1 | 1.0 | 0.4 | 6.3 | 0.7 | 2.4 | 0.2 | 0.3 | 0.1 |
| river-D | D | 90188 | 52.0 | 6.8 | 22.6 | 3.2 | 0.9 | 8.5 | 0.6 | 3.9 | 1.2 | 0.3 | 0.1 |
| river-D | E | 146605 | 54.1 | 11.4 | 19.8 | 2.0 | 0.6 | 6.4 | 0.6 | 4.1 | 0.7 | 0.2 | 0.1 |
| river-E | D | 67566 | 43.2 | 3.8 | 26.4 | 5.1 | 1.1 | 8.9 | 0.5 | 9.1 | 1.6 | 0.3 | 0.0 |
| river-E | E | 111134 | 48.2 | 5.7 | 25.8 | 3.1 | 1.3 | 6.7 | 0.5 | 7.4 | 1.0 | 0.3 | 0.0 |
| gen-4-A | D | 115618 | 57.3 | 13.2 | 14.7 | 1.6 | 0.3 | 8.6 | 0.7 | 3.0 | 0.3 | 0.3 | 0.0 |
| gen-4-A | E | 192818 | 58.1 | 13.8 | 16.0 | 1.0 | 0.3 | 7.1 | 0.7 | 2.5 | 0.2 | 0.3 | 0.1 |
| gen-4-N1 | D | 123990 | 61.6 | 12.2 | 13.5 | 1.3 | 0.3 | 5.6 | 0.6 | 3.4 | 0.7 | 0.3 | 0.5 |
| gen-4-N1 | E | 198564 | 61.2 | 13.8 | 14.7 | 0.8 | 0.2 | 4.5 | 0.6 | 3.1 | 0.5 | 0.3 | 0.3 |
| gen-4-N2 | D | 98166 | 55.8 | 13.4 | 16.4 | 1.2 | 0.6 | 4.9 | 0.7 | 6.1 | 0.5 | 0.2 | 0.1 |
| gen-4-N2 | E | 157476 | 57.3 | 13.1 | 17.1 | 0.8 | 0.4 | 4.1 | 0.7 | 5.8 | 0.3 | 0.2 | 0.1 |
| gen-4-D | D | 123407 | 50.5 | 6.3 | 22.7 | 5.2 | 0.3 | 8.9 | 0.5 | 4.7 | 0.5 | 0.2 | 0.1 |
| gen-4-D | E | 205121 | 56.9 | 9.4 | 19.2 | 3.1 | 0.3 | 6.0 | 0.6 | 3.7 | 0.3 | 0.2 | 0.2 |
| gen-4-E | D | 92837 | 46.0 | 3.4 | 29.6 | 2.7 | 0.6 | 13.3 | 0.5 | 3.2 | 0.4 | 0.2 | 0.1 |
| gen-4-E | E | 151270 | 49.9 | 5.3 | 27.5 | 1.7 | 0.4 | 10.6 | 0.5 | 3.5 | 0.2 | 0.3 | 0.1 |

### The holding ticks by activity kind: the ten largest (% of holding ticks)

| run | window | ten largest kinds |
| --- | --- | --- |
| aspen-A | D | gather 13.4, deposit 10.2, converse 9.1, withdraw 6.2, rest 5.5, drink 5.4, attend 4.0, wander 3.8, give 3.7, harvest 3.6 |
| aspen-A | E | deposit 12.8, gather 12.4, converse 9.8, withdraw 7.1, attend 5.1, rest 5.1, drink 4.5, socialize 4.1, warm 3.8, operate 3.5 |
| aspen-N1 | D | gather 12.3, deposit 11.5, operate 9.7, converse 8.5, withdraw 7.6, socialize 6.1, drink 5.2, rest 5.1, harvest 4.2, attend 3.8 |
| aspen-N1 | E | gather 12.5, deposit 12.2, converse 9.0, operate 8.0, withdraw 7.5, attend 6.0, drink 5.0, socialize 4.8, rest 4.5, harvest 3.9 |
| aspen-N2 | D | gather 17.3, deposit 12.6, converse 9.0, withdraw 8.2, operate 6.4, drink 5.3, attend 5.0, socialize 4.4, plan_site 3.4, give 3.4 |
| aspen-N2 | E | gather 16.8, deposit 13.9, withdraw 9.2, converse 9.0, operate 6.3, attend 6.0, drink 5.0, socialize 4.0, haul 3.4, plan_site 3.0 |
| aspen-D | D | converse 19.0, wander 11.2, socialize 10.9, attend 10.5, give 6.2, rest 6.1, drink 4.8, sleep 4.4, fetch_water 3.9, gather 3.3 |
| aspen-D | E | converse 15.0, attend 11.4, gather 8.2, socialize 7.5, deposit 6.7, wander 6.7, drink 4.7, give 4.6, withdraw 4.5, rest 3.6 |
| aspen-E | D | converse 20.4, rest 15.2, wander 13.2, socialize 9.9, fetch_water 7.8, attend 7.0, warm 5.2, drink 4.6, give 4.3, fuel_fire 2.5 |
| aspen-E | E | converse 19.5, rest 12.2, socialize 10.8, wander 9.2, attend 8.9, fetch_water 7.1, warm 5.1, give 4.4, drink 4.1, gather 3.6 |
| aspen-Drepeat | D | converse 19.0, wander 11.2, socialize 10.9, attend 10.5, give 6.2, rest 6.1, drink 4.8, sleep 4.4, fetch_water 3.9, gather 3.3 |
| aspen-Drepeat | E | converse 15.0, attend 11.4, gather 8.2, socialize 7.5, deposit 6.7, wander 6.7, drink 4.7, give 4.6, withdraw 4.5, rest 3.6 |
| river-A | D | rest 12.9, gather 12.7, attend 10.5, deposit 10.0, converse 9.5, withdraw 6.7, drink 5.9, operate 2.7, repair 2.6, fetch_water 2.4 |
| river-A | E | attend 13.3, rest 12.6, gather 11.2, converse 10.1, deposit 10.1, withdraw 7.0, drink 4.7, repair 2.7, build 2.6, operate 2.5 |
| river-N1 | D | gather 10.9, attend 10.1, deposit 10.0, withdraw 9.7, converse 9.3, rest 7.1, drink 4.9, harvest 4.0, operate 3.8, haul 3.7 |
| river-N1 | E | gather 12.1, attend 11.8, deposit 10.0, withdraw 9.9, converse 8.2, rest 6.8, operate 4.4, drink 4.4, harvest 3.7, haul 3.2 |
| river-N2 | D | withdraw 10.9, gather 10.6, attend 10.3, rest 10.0, deposit 10.0, converse 9.9, drink 4.3, harvest 4.0, socialize 3.4, operate 3.3 |
| river-N2 | E | gather 12.4, attend 11.7, deposit 10.9, withdraw 10.6, converse 9.0, rest 8.6, drink 3.8, harvest 3.5, socialize 3.4, give 3.1 |
| river-D | D | converse 15.9, attend 13.9, rest 11.9, socialize 9.2, wander 8.8, drink 5.2, give 5.1, gather 5.0, fetch_water 4.6, deposit 2.5 |
| river-D | E | converse 13.6, attend 12.0, gather 9.9, rest 9.2, socialize 6.7, deposit 5.7, wander 5.4, drink 5.1, fetch_water 3.8, give 3.7 |
| river-E | D | converse 16.7, attend 14.2, rest 13.3, wander 12.0, socialize 7.5, warm 7.2, fetch_water 5.8, drink 4.8, give 4.6, sleep 2.9 |
| river-E | E | attend 18.0, converse 15.8, rest 11.2, socialize 8.5, wander 8.2, warm 5.7, fetch_water 4.6, drink 4.6, give 3.9, gather 3.3 |
| gen-4-A | D | deposit 11.8, gather 10.9, rest 9.9, converse 9.8, withdraw 8.4, attend 7.9, operate 6.0, drink 4.7, harvest 3.9, socialize 3.1 |
| gen-4-A | E | deposit 12.0, gather 11.8, converse 10.4, attend 9.3, rest 8.8, withdraw 8.5, operate 5.7, drink 4.2, socialize 3.7, harvest 3.7 |
| gen-4-N1 | D | deposit 12.5, withdraw 11.8, gather 11.5, rest 9.7, converse 9.3, attend 6.8, operate 5.6, drink 5.2, socialize 3.0, repair 2.7 |
| gen-4-N1 | E | gather 13.7, deposit 11.8, withdraw 11.5, converse 9.6, attend 8.4, rest 7.2, operate 5.7, drink 4.4, socialize 3.4, repair 3.1 |
| gen-4-N2 | D | gather 12.7, deposit 12.2, converse 11.4, withdraw 8.1, attend 8.0, rest 6.9, drink 5.1, operate 4.6, warm 4.3, socialize 3.1 |
| gen-4-N2 | E | gather 12.3, deposit 11.9, converse 10.9, attend 10.6, withdraw 8.3, rest 5.6, drink 4.9, operate 4.9, warm 4.1, socialize 3.7 |
| gen-4-D | D | converse 16.7, wander 13.9, rest 12.2, attend 11.3, socialize 7.0, drink 6.4, gather 5.1, give 4.8, fetch_water 3.5, warm 3.1 |
| gen-4-D | E | converse 14.2, attend 9.7, gather 9.0, rest 8.7, wander 8.4, deposit 7.0, socialize 5.7, withdraw 5.4, drink 5.1, give 4.1 |
| gen-4-E | D | converse 19.7, rest 19.3, attend 15.4, socialize 9.6, wander 8.5, give 5.0, fetch_water 4.1, drink 3.6, gather 2.4, fuel_fire 1.9 |
| gen-4-E | E | attend 18.6, converse 18.3, rest 15.3, socialize 10.0, wander 6.2, give 4.9, drink 4.1, gather 4.0, fetch_water 4.0, deposit 1.6 |

### What the gate did in the runs where it was on (counts of calls to rankOptions, which include the 600 observer samples)

| run | calls with the gate on | calls where it applied | options removed | running activity kept (exempt) | removed by kind |
| --- | --- | --- | --- | --- | --- |
| aspen-D | 70084 | 1148 | 19435 | 103 | withdraw 6552, gather 3442, deposit 2355, tend 1313, repair 1246, operate 1026, explore 667, plant 616, plan_site 534, tree_work 523, build 468, till 257, harvest 233, tool_work 93, haul 90, craft 20 |
| aspen-E | 69019 | 2297 | 37658 | 131 | withdraw 11062, gather 7086, deposit 4581, repair 2659, tend 2474, operate 2328, explore 1524, plan_site 1480, tree_work 996, build 905, harvest 653, till 630, plant 587, haul 418, tool_work 170, craft 105 |
| aspen-Drepeat | 70084 | 1148 | 19435 | 103 | withdraw 6552, gather 3442, deposit 2355, tend 1313, repair 1246, operate 1026, explore 667, plant 616, plan_site 534, tree_work 523, build 468, till 257, harvest 233, tool_work 93, haul 90, craft 20 |
| river-D | 76572 | 1826 | 28607 | 118 | withdraw 11037, gather 4717, deposit 3227, tend 1941, repair 1749, plan_site 1187, operate 984, explore 923, plant 748, tree_work 684, till 541, build 397, harvest 263, haul 115, craft 62, tool_work 32 |
| river-E | 78923 | 2271 | 36030 | 106 | withdraw 13174, gather 6096, deposit 4571, tend 2084, repair 2028, operate 1475, plan_site 1381, explore 1267, plant 939, tree_work 887, harvest 768, till 588, build 484, haul 164, craft 86, tool_work 38 |
| gen-4-D | 73268 | 2473 | 40565 | 167 | withdraw 14455, gather 7306, deposit 4382, repair 3019, tend 2517, operate 2506, plan_site 1727, explore 1206, plant 1008, tree_work 901, till 499, harvest 441, build 299, tool_work 154, haul 113, craft 32 |
| gen-4-E | 78430 | 3072 | 52424 | 155 | withdraw 17949, gather 9193, deposit 5798, operate 5220, tend 2957, repair 2413, plan_site 2209, explore 1654, tree_work 1247, plant 1124, till 797, harvest 703, build 637, haul 221, tool_work 162, craft 140 |

## The fixed reading, applied

Measures are for people aged 12 and over. life = social_contact + leisure, share of waking time. Noise, per world and measure, is the larger of |N1 - A| and |N2 - A|. Survival holds for an arm in a world when deaths <= the highest of A, N1, N2 plus 2, and hungry-with-no-food share <= A + noise + 3 points.

| world | life A | N1 | N2 | D | E | noise (life) | hungry no food A | N1 | N2 | D | E | noise (hungry) | deaths A/N1/N2/D/E | survival D | survival E | E: predicate holds % of window ticks | E: waiting+idle+rest+sleep % of holding ticks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | 11.1 | 10.2 | 11.1 | 11.4 | 11.6 | 1.0 | 14.5 | 20.7 | 16.2 | 17.0 | 15.2 | 6.3 | 2/2/0/0/0 | holds | holds | 11.8 | 10.1 |
| river | 11.4 | 11.2 | 11.1 | 11.2 | 11.8 | 0.3 | 20.2 | 18.4 | 18.2 | 15.9 | 16.0 | 2.0 | 0/0/0/0/3 | holds | FAILS | 10.5 | 9.5 |
| gen-4 | 11.0 | 10.2 | 11.2 | 11.3 | 11.6 | 0.9 | 15.3 | 14.4 | 17.6 | 15.8 | 15.4 | 2.3 | 1/0/1/3/0 | holds | holds | 13.6 | 11.8 |

Worlds with a complete set: aspen, river, gen-4 (3 of 3).

- SURVIVAL COST (survival fails for E in at least 2 of 3 worlds): 1 of 3 worlds fail -> no
- GATE RARELY ACTIVE (in E the predicate holds for under 60% of window person-ticks in at least 2 of 3 worlds): 3 of 3 -> YES
- OPENS A LIFE (in at least 2 of 3 worlds: life E - A >= 8 points and > noise, life D - A > noise, survival holds for D and E): 0 of 3 -> no
- TIME OPENS, NOTHING FILLS IT (predicate holds for >= 60% of window ticks in E and waiting+idle+rest+early sleep > half of the holding ticks, in at least 2 of 3 worlds): 0 of 3 -> no

**VERDICT by the fixed order (survival cost, rarely active, opens a life, time opens and nothing fills it, else mixed): GATE RARELY ACTIVE.**

Per world: aspen: life E-A 0.4, D-A 0.3 points; survival fails for E false; rarely active true; opens false; nothing fills false. river: life E-A 0.3, D-A -0.2 points; survival fails for E true; rarely active true; opens false; nothing fills false. gen-4: life E-A 0.5, D-A 0.3 points; survival fails for E false; rarely active true; opens false; nothing fills false.

## Where the time went, category by category (people aged 12 and over, % of waking ticks; E minus A against the noise of the nudged controls)

| world | category | A | N1 | N2 | D | E | D - A | E - A | noise = max(|N1-A|, |N2-A|) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | travel | 55.1 | 48.7 | 53.0 | 54.1 | 53.4 | -1.0 | -1.6 | 6.4 |
| aspen | work | 14.1 | 13.1 | 14.1 | 13.9 | 13.7 | -0.2 | -0.4 | 1.0 |
| aspen | social_contact | 10.9 | 9.9 | 10.9 | 11.0 | 11.1 | 0.2 | 0.2 | 1.0 |
| aspen | leisure | 0.3 | 0.3 | 0.3 | 0.4 | 0.5 | 0.1 | 0.2 | 0.0 |
| aspen | waiting | 9.7 | 8.6 | 8.2 | 7.5 | 9.7 | -2.2 | 0.0 | 1.5 |
| aspen | rest | 4.6 | 13.0 | 7.4 | 7.6 | 5.9 | 3.0 | 1.4 | 8.4 |
| aspen | idle | 0.7 | 0.6 | 0.7 | 0.7 | 0.7 | -0.0 | -0.0 | 0.1 |
| aspen | eating_drinking_warming | 3.7 | 5.5 | 4.9 | 4.4 | 4.3 | 0.7 | 0.6 | 1.9 |
| aspen | other | 1.1 | 0.4 | 0.5 | 0.5 | 0.7 | -0.6 | -0.4 | 0.7 |
| river | travel | 48.3 | 53.9 | 54.7 | 54.2 | 53.5 | 5.9 | 5.3 | 6.5 |
| river | work | 11.3 | 12.4 | 12.5 | 11.8 | 11.5 | 0.5 | 0.3 | 1.3 |
| river | social_contact | 11.2 | 11.0 | 10.8 | 10.9 | 11.5 | -0.3 | 0.2 | 0.4 |
| river | leisure | 0.2 | 0.2 | 0.3 | 0.3 | 0.3 | 0.1 | 0.1 | 0.1 |
| river | waiting | 9.1 | 8.0 | 8.7 | 8.3 | 8.8 | -0.7 | -0.2 | 1.0 |
| river | rest | 12.5 | 9.2 | 7.4 | 9.4 | 9.1 | -3.1 | -3.5 | 5.2 |
| river | idle | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.0 | 0.0 | 0.0 |
| river | eating_drinking_warming | 6.6 | 4.2 | 4.5 | 4.2 | 4.0 | -2.4 | -2.5 | 2.4 |
| river | other | 0.3 | 0.5 | 0.4 | 0.2 | 0.6 | -0.1 | 0.3 | 0.2 |
| gen-4 | travel | 55.4 | 53.7 | 51.9 | 53.5 | 51.9 | -2.0 | -3.6 | 3.5 |
| gen-4 | work | 11.9 | 11.7 | 11.5 | 11.5 | 11.7 | -0.5 | -0.3 | 0.4 |
| gen-4 | social_contact | 10.7 | 9.8 | 11.0 | 10.8 | 11.3 | 0.0 | 0.6 | 0.9 |
| gen-4 | leisure | 0.3 | 0.3 | 0.3 | 0.5 | 0.3 | 0.2 | -0.0 | 0.0 |
| gen-4 | waiting | 9.2 | 7.6 | 9.1 | 9.5 | 9.7 | 0.3 | 0.5 | 1.5 |
| gen-4 | rest | 7.8 | 9.9 | 9.8 | 8.6 | 9.3 | 0.8 | 1.6 | 2.2 |
| gen-4 | idle | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | -0.0 | -0.0 | 0.0 |
| gen-4 | eating_drinking_warming | 3.6 | 5.8 | 5.3 | 4.4 | 4.8 | 0.8 | 1.2 | 2.2 |
| gen-4 | other | 0.4 | 0.4 | 0.5 | 0.7 | 0.4 | 0.3 | 0.0 | 0.2 |

