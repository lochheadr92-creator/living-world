## Checks

- The reading: `FREE_UPPER_READING.md` sha256 now 07f7cad94eabe5c8af9d0aa2939613a3c6f7f0dd6d896498b37c324af806f625; recorded at launch in out\free-upper\commands.txt 07f7cad94eabe5c8af9d0aa2939613a3c6f7f0dd6d896498b37c324af806f625; the copy out\free-upper\READING.md 07f7cad94eabe5c8af9d0aa2939613a3c6f7f0dd6d896498b37c324af806f625: ALL EQUAL (not edited after the runs started).
- Controls used (not rerun): aspen A 168d98f7 (expected 168d98f7: EQUAL); river A 8f513a37 (expected 8f513a37: EQUAL); gen-4 A 523f2943 (expected 523f2943: EQUAL).
- Gate off is inert on the edited source: see the one-day smoke recorded in the report (aspen A one day: 510f235b before and after the edit).

| run | arm flags | end hash | stop | conservation | purity checks | travel equal | LifeTally equal | window check equal | DayShape checks | TripShape checks | people start | end | born | came | died | causes | seconds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen-UD | --block-from 0.62 --ignore-food | 2a72b50a | horizon | ok | 600 | ok | ok | ok | ok | FAIL | 51 | 72 | 4 | 17 | 1 | wolf attack 1 | 762.3 |
| aspen-UE | --block-from 0.5 --ignore-food | c64f8aa6 | horizon | ok | 600 | ok | ok | ok | ok | ok | 51 | 70 | 0 | 19 | 0 | - | 787.5 |
| river-UD | --block-from 0.62 --ignore-food | 4ac0ab4a | horizon | ok | 600 | ok | ok | ok | ok | FAIL | 55 | 76 | 1 | 20 | 0 | - | 926.4 |
| river-UE | --block-from 0.5 --ignore-food | ecc5cbd3 | horizon | ok | 600 | ok | ok | ok | ok | FAIL | 55 | 74 | 3 | 16 | 0 | - | 908.9 |
| gen-4-UD | --block-from 0.62 --ignore-food | 7d059d09 | horizon | ok | 600 | ok | ok | ok | ok | FAIL | 55 | 75 | 2 | 18 | 0 | - | 876.9 |
| gen-4-UE | --block-from 0.5 --ignore-food | 80c52e3d | horizon | ok | 600 | ok | ok | ok | ok | ok | 55 | 75 | 1 | 19 | 0 | - | 873.2 |

## Main table, people aged 12 and over (share of their waking ticks, per cent; A, N1, N2, D, E are the earlier runs)

| world | arm | travel | work | social_contact | leisure | waiting | rest | idle | eating_drinking_warming | other | LIFE (social + leisure) | outdoor company | hungry, no food in pack or home |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | A | 55.1 | 14.1 | 10.9 | 0.3 | 9.7 | 4.6 | 0.7 | 3.7 | 1.1 | 11.1 | 40.3 | 14.5 |
| aspen | N1 | 48.7 | 13.1 | 9.9 | 0.3 | 8.6 | 13.0 | 0.6 | 5.5 | 0.4 | 10.2 | 42.6 | 20.7 |
| aspen | N2 | 53.0 | 14.1 | 10.9 | 0.3 | 8.2 | 7.4 | 0.7 | 4.9 | 0.5 | 11.1 | 42.7 | 16.2 |
| aspen | D (believed-fed, earlier) | 54.1 | 13.9 | 11.0 | 0.4 | 7.5 | 7.6 | 0.7 | 4.4 | 0.5 | 11.4 | 42.9 | 17.0 |
| aspen | E (believed-fed, earlier) | 53.4 | 13.7 | 11.1 | 0.5 | 9.7 | 5.9 | 0.7 | 4.3 | 0.7 | 11.6 | 42.1 | 15.2 |
| aspen | UD (upper bound, 0.62) | 48.5 | 12.5 | 12.2 | 1.6 | 10.9 | 8.6 | 0.6 | 4.7 | 0.5 | 13.8 | 43.7 | 16.8 |
| aspen | UE (upper bound, 0.50) | 48.9 | 11.0 | 15.2 | 2.8 | 10.0 | 6.9 | 0.6 | 4.2 | 0.3 | 18.0 | 50.2 | 19.7 |
| river | A | 48.3 | 11.3 | 11.2 | 0.2 | 9.1 | 12.5 | 0.6 | 6.6 | 0.3 | 11.4 | 44.8 | 20.2 |
| river | N1 | 53.9 | 12.4 | 11.0 | 0.2 | 8.0 | 9.2 | 0.6 | 4.2 | 0.5 | 11.2 | 45.0 | 18.4 |
| river | N2 | 54.7 | 12.5 | 10.8 | 0.3 | 8.7 | 7.4 | 0.6 | 4.5 | 0.4 | 11.1 | 44.5 | 18.2 |
| river | D (believed-fed, earlier) | 54.2 | 11.8 | 10.9 | 0.3 | 8.3 | 9.4 | 0.6 | 4.2 | 0.2 | 11.2 | 41.6 | 15.9 |
| river | E (believed-fed, earlier) | 53.5 | 11.5 | 11.5 | 0.3 | 8.8 | 9.1 | 0.6 | 4.0 | 0.6 | 11.8 | 42.1 | 16.0 |
| river | UD (upper bound, 0.62) | 52.7 | 11.2 | 11.4 | 1.4 | 10.1 | 7.1 | 0.6 | 5.2 | 0.3 | 12.8 | 44.4 | 18.7 |
| river | UE (upper bound, 0.50) | 46.0 | 9.6 | 14.2 | 2.4 | 9.1 | 9.1 | 0.6 | 8.8 | 0.2 | 16.6 | 51.0 | 20.9 |
| gen-4 | A | 55.4 | 11.9 | 10.7 | 0.3 | 9.2 | 7.8 | 0.6 | 3.6 | 0.4 | 11.0 | 39.7 | 15.3 |
| gen-4 | N1 | 53.7 | 11.7 | 9.8 | 0.3 | 7.6 | 9.9 | 0.6 | 5.8 | 0.4 | 10.2 | 40.4 | 14.4 |
| gen-4 | N2 | 51.9 | 11.5 | 11.0 | 0.3 | 9.1 | 9.8 | 0.6 | 5.3 | 0.5 | 11.2 | 42.1 | 17.6 |
| gen-4 | D (believed-fed, earlier) | 53.5 | 11.5 | 10.8 | 0.5 | 9.5 | 8.6 | 0.6 | 4.4 | 0.7 | 11.3 | 39.2 | 15.8 |
| gen-4 | E (believed-fed, earlier) | 51.9 | 11.7 | 11.3 | 0.3 | 9.7 | 9.3 | 0.6 | 4.8 | 0.4 | 11.6 | 42.0 | 15.4 |
| gen-4 | UD (upper bound, 0.62) | 56.3 | 11.1 | 11.3 | 1.5 | 10.7 | 4.5 | 0.6 | 3.7 | 0.4 | 12.8 | 41.4 | 16.8 |
| gen-4 | UE (upper bound, 0.50) | 45.7 | 9.0 | 14.0 | 2.6 | 10.3 | 8.9 | 0.6 | 8.7 | 0.2 | 16.6 | 51.2 | 23.1 |

## The same for everyone (per cent of waking ticks)

| world | arm | travel | work | social_contact | leisure | waiting | rest | idle | eating_drinking_warming | other | LIFE (social + leisure) | outdoor company | hungry, no food in pack or home |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | A | 47.8 | 10.0 | 16.4 | 1.8 | 13.0 | 6.2 | 0.6 | 3.3 | 0.8 | 18.2 | 42.5 | 18.9 |
| aspen | N1 | 43.2 | 9.8 | 13.6 | 1.5 | 11.1 | 14.7 | 0.6 | 5.2 | 0.3 | 15.1 | 43.7 | 26.1 |
| aspen | N2 | 46.1 | 10.2 | 15.7 | 1.9 | 11.3 | 8.9 | 0.6 | 4.8 | 0.4 | 17.6 | 44.7 | 21.3 |
| aspen | D (believed-fed, earlier) | 47.8 | 10.2 | 15.9 | 1.8 | 9.9 | 9.2 | 0.6 | 4.1 | 0.4 | 17.7 | 44.9 | 22.0 |
| aspen | E (believed-fed, earlier) | 46.1 | 10.0 | 15.6 | 1.8 | 13.1 | 8.2 | 0.6 | 4.2 | 0.5 | 17.4 | 43.5 | 18.6 |
| aspen | UD (upper bound, 0.62) | 42.5 | 8.9 | 16.6 | 2.9 | 13.6 | 9.9 | 0.6 | 4.6 | 0.4 | 19.5 | 45.3 | 20.1 |
| aspen | UE (upper bound, 0.50) | 44.4 | 8.2 | 19.3 | 3.8 | 11.9 | 7.3 | 0.6 | 4.3 | 0.3 | 23.1 | 52.8 | 22.3 |
| river | A | 42.6 | 8.6 | 14.6 | 1.2 | 12.2 | 13.8 | 0.6 | 6.3 | 0.3 | 15.7 | 45.6 | 25.8 |
| river | N1 | 46.9 | 9.5 | 14.7 | 1.5 | 11.3 | 11.0 | 0.6 | 4.1 | 0.4 | 16.3 | 45.9 | 23.1 |
| river | N2 | 47.3 | 9.6 | 14.6 | 1.5 | 12.3 | 9.2 | 0.6 | 4.6 | 0.4 | 16.1 | 45.0 | 20.3 |
| river | D (believed-fed, earlier) | 47.7 | 8.9 | 15.1 | 2.0 | 11.1 | 10.3 | 0.6 | 4.1 | 0.2 | 17.0 | 43.4 | 20.5 |
| river | E (believed-fed, earlier) | 46.6 | 8.6 | 15.4 | 1.5 | 12.0 | 10.9 | 0.6 | 3.8 | 0.5 | 16.9 | 43.3 | 22.1 |
| river | UD (upper bound, 0.62) | 47.0 | 8.9 | 15.3 | 2.7 | 12.5 | 7.5 | 0.6 | 5.2 | 0.3 | 18.0 | 46.2 | 20.2 |
| river | UE (upper bound, 0.50) | 41.1 | 7.5 | 16.9 | 3.4 | 11.5 | 10.2 | 0.6 | 8.8 | 0.2 | 20.3 | 52.0 | 23.0 |
| gen-4 | A | 50.5 | 9.5 | 14.0 | 1.4 | 11.1 | 8.9 | 0.6 | 3.5 | 0.3 | 15.4 | 40.8 | 18.6 |
| gen-4 | N1 | 49.2 | 9.4 | 13.2 | 1.4 | 9.5 | 11.0 | 0.6 | 5.4 | 0.4 | 14.6 | 41.2 | 17.8 |
| gen-4 | N2 | 47.2 | 9.3 | 13.5 | 1.2 | 11.1 | 11.4 | 0.6 | 5.3 | 0.5 | 14.7 | 42.4 | 21.4 |
| gen-4 | D (believed-fed, earlier) | 48.8 | 9.3 | 13.7 | 1.6 | 11.5 | 9.7 | 0.6 | 4.3 | 0.6 | 15.3 | 40.0 | 18.9 |
| gen-4 | E (believed-fed, earlier) | 46.2 | 9.1 | 14.3 | 1.3 | 12.2 | 11.3 | 0.6 | 4.7 | 0.4 | 15.7 | 42.4 | 19.1 |
| gen-4 | UD (upper bound, 0.62) | 52.1 | 8.9 | 15.1 | 2.6 | 12.1 | 4.8 | 0.6 | 3.5 | 0.3 | 17.7 | 43.0 | 20.1 |
| gen-4 | UE (upper bound, 0.50) | 42.0 | 7.3 | 16.4 | 3.3 | 12.3 | 9.7 | 0.6 | 8.3 | 0.2 | 19.7 | 51.5 | 25.6 |

## Food, work and people (everyone; food at the end of day 30; gathered and jobs are a head a day)

| world | arm | food held a head, end | in packs | in home stores | in granaries | in other buildings | food gathered | wood gathered | work jobs finished | people start | people end | died | causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | A | 9.04 | 1.85 | 0.18 | 6.15 | 6.96 | 2.22 | 0.59 | 2.51 | 51 | 68 | 2 | thirst 1, wolf attack 1 |
| aspen | N1 | 10.77 | 2.04 | 0.09 | 8.16 | 8.64 | 2.21 | 0.61 | 2.33 | 51 | 73 | 2 | exposure 1, wolf attack 1 |
| aspen | N2 | 10.29 | 2.38 | 0.16 | 6.90 | 7.74 | 2.30 | 0.61 | 2.51 | 51 | 71 | 0 | - |
| aspen | D (believed-fed, earlier) | 6.92 | 1.89 | 0.14 | 3.97 | 4.86 | 2.24 | 0.64 | 2.40 | 51 | 73 | 0 | - |
| aspen | E (believed-fed, earlier) | 9.91 | 2.38 | 0.32 | 5.97 | 7.08 | 2.18 | 0.59 | 2.57 | 51 | 66 | 0 | - |
| aspen | UD (upper bound, 0.62) | 7.08 | 2.71 | 0.19 | 3.60 | 4.18 | 2.18 | 0.55 | 2.07 | 51 | 72 | 1 | wolf attack 1 |
| aspen | UE (upper bound, 0.50) | 5.50 | 2.13 | 0.21 | 2.69 | 3.13 | 2.25 | 0.49 | 1.75 | 51 | 70 | 0 | - |
| river | A | 6.10 | 1.61 | 0.27 | 3.82 | 4.23 | 2.03 | 0.55 | 2.19 | 55 | 80 | 0 | - |
| river | N1 | 7.42 | 1.51 | 0.36 | 4.83 | 5.54 | 2.09 | 0.61 | 2.45 | 55 | 82 | 0 | - |
| river | N2 | 8.57 | 2.53 | 0.10 | 5.47 | 5.93 | 1.94 | 0.65 | 2.54 | 55 | 77 | 0 | - |
| river | D (believed-fed, earlier) | 4.46 | 1.88 | 0.13 | 1.68 | 2.45 | 2.21 | 0.58 | 2.34 | 55 | 80 | 0 | - |
| river | E (believed-fed, earlier) | 5.92 | 2.12 | 0.22 | 3.22 | 3.57 | 2.14 | 0.55 | 2.27 | 55 | 77 | 3 | thirst 1, wolf attack 1, fever 1 |
| river | UD (upper bound, 0.62) | 6.91 | 2.43 | 0.21 | 3.80 | 4.19 | 2.00 | 0.60 | 2.21 | 55 | 76 | 0 | - |
| river | UE (upper bound, 0.50) | 5.44 | 1.75 | 0.22 | 2.78 | 3.47 | 1.88 | 0.49 | 1.83 | 55 | 74 | 0 | - |
| gen-4 | A | 10.34 | 2.03 | 0.08 | 6.82 | 8.22 | 2.51 | 0.66 | 2.41 | 55 | 74 | 1 | old age 1 |
| gen-4 | N1 | 8.44 | 1.97 | 0.18 | 5.79 | 6.27 | 2.45 | 0.62 | 2.36 | 55 | 71 | 0 | - |
| gen-4 | N2 | 7.77 | 2.08 | 0.34 | 4.60 | 5.27 | 2.33 | 0.60 | 2.25 | 55 | 77 | 1 | thirst 1 |
| gen-4 | D (believed-fed, earlier) | 8.45 | 2.82 | 0.28 | 4.31 | 5.35 | 2.57 | 0.62 | 2.29 | 55 | 73 | 3 | wolf attack 2, thirst 1 |
| gen-4 | E (believed-fed, earlier) | 6.39 | 2.32 | 0.24 | 2.99 | 3.79 | 2.42 | 0.61 | 2.24 | 55 | 76 | 0 | - |
| gen-4 | UD (upper bound, 0.62) | 4.67 | 2.15 | 0.28 | 1.48 | 2.15 | 2.40 | 0.62 | 2.07 | 55 | 75 | 0 | - |
| gen-4 | UE (upper bound, 0.50) | 3.72 | 2.45 | 0.15 | 0.85 | 1.09 | 2.23 | 0.46 | 1.62 | 55 | 75 | 0 | - |

## How often the gate was on, and where the time went (people aged 12 and over, per window)

The upper-bound gate is on for every window person-tick with no need under CRITICAL. In a control run that count is the window ticks less the urgent-need ones (urgent only plus both, at most about 1% of window ticks in the earlier runs); the controls have no per-tick record of which kinds of activity fall in the non-urgent ticks, so the controls' category split below is of ALL window ticks, which is within that margin of the safe ticks.

| run | window | window person-ticks | gate on % | urgent-need ticks % | upper gate: outdoor company % of its ticks |
| --- | --- | --- | --- | --- | --- |
| aspen-UD | D | 564972 | 99.7 | 0.3 | 55.1 |
| river-UD | D | 656978 | 99.0 | 1.0 | 55.9 |
| gen-4-UD | D | 656347 | 99.8 | 0.2 | 52.9 |
| aspen-UE | E | 976985 | 99.9 | 0.1 | 60.8 |
| river-UE | E | 1061822 | 99.8 | 0.2 | 61.4 |
| gen-4-UE | E | 1102154 | 99.7 | 0.3 | 61.1 |

### The ticks where the gate was on, by TimeBudget category (% of those ticks); the controls' row is all window ticks of the same window

| run | window | ticks | travel | work | social_contact | leisure | waiting | rest | idle | eating_drinking_warming | sleep | failure_recovery | defence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen-A | D (all window ticks) | 534513 | 57.6 | 15.6 | 14.6 | 1.0 | 0.4 | 4.2 | 0.7 | 3.2 | 1.5 | 0.2 | 1.0 |
| aspen-UD | D (gate-on ticks) | 563365 | 46.0 | 8.2 | 24.7 | 6.0 | 0.8 | 8.4 | 0.6 | 3.4 | 1.4 | 0.2 | 0.3 |
| aspen-A | E (all window ticks) | 890303 | 57.5 | 16.4 | 15.4 | 0.6 | 0.3 | 3.5 | 0.7 | 3.5 | 0.9 | 0.2 | 1.0 |
| aspen-UE | E (gate-on ticks) | 976197 | 46.8 | 6.9 | 26.8 | 6.5 | 0.7 | 6.6 | 0.5 | 3.8 | 0.9 | 0.2 | 0.1 |
| river-A | D (all window ticks) | 638346 | 52.2 | 13.7 | 16.2 | 0.6 | 0.6 | 9.5 | 0.6 | 4.9 | 1.4 | 0.2 | 0.1 |
| river-UD | D (gate-on ticks) | 650622 | 49.1 | 6.3 | 23.2 | 5.5 | 1.1 | 8.9 | 0.5 | 3.5 | 1.5 | 0.2 | 0.3 |
| river-A | E (all window ticks) | 1077808 | 51.9 | 13.8 | 17.7 | 0.4 | 0.5 | 9.1 | 0.6 | 4.6 | 1.0 | 0.2 | 0.2 |
| river-UE | E (gate-on ticks) | 1059879 | 44.3 | 6.4 | 27.1 | 6.1 | 0.6 | 8.4 | 0.5 | 5.7 | 0.7 | 0.2 | 0.1 |
| gen-4-A | D (all window ticks) | 652714 | 57.6 | 13.4 | 14.8 | 1.0 | 0.4 | 7.8 | 0.6 | 2.6 | 1.2 | 0.2 | 0.1 |
| gen-4-UD | D (gate-on ticks) | 655059 | 53.7 | 6.4 | 23.0 | 5.5 | 0.8 | 5.8 | 0.5 | 2.3 | 1.8 | 0.2 | 0.0 |
| gen-4-A | E (all window ticks) | 1091767 | 58.5 | 14.0 | 15.7 | 0.6 | 0.4 | 6.4 | 0.6 | 2.4 | 0.8 | 0.2 | 0.2 |
| gen-4-UE | E (gate-on ticks) | 1099134 | 43.0 | 5.5 | 25.6 | 6.3 | 0.5 | 9.4 | 0.5 | 8.4 | 0.7 | 0.2 | 0.0 |

### The ten largest activity kinds in the gate-on ticks (% of those ticks)

| run | window | ten largest kinds |
| --- | --- | --- |
| aspen-UD | D | converse 18.8, wander 12.8, rest 11.2, gather 9.4, attend 9.3, socialize 6.4, give 6.1, drink 4.5, fetch_water 3.9, sleep 2.5 |
| river-UD | D | converse 16.1, wander 13.5, attend 13.1, rest 12.6, gather 7.7, socialize 6.1, drink 4.8, fetch_water 3.8, give 3.5, sleep 2.8 |
| gen-4-UD | D | converse 18.2, wander 16.3, attend 10.5, rest 8.2, gather 8.1, socialize 7.7, drink 5.2, fetch_water 3.8, give 3.5, sleep 3.4 |
| aspen-UE | E | converse 20.6, wander 14.0, attend 11.9, gather 9.6, rest 8.2, socialize 7.4, give 5.7, fetch_water 4.0, drink 3.6, warm 2.4 |
| river-UE | E | converse 17.6, attend 17.0, wander 11.9, rest 11.5, gather 8.2, socialize 5.5, warm 5.0, give 3.7, drink 3.5, fetch_water 3.2 |
| gen-4-UE | E | converse 17.6, attend 13.6, wander 12.9, rest 11.7, gather 8.9, warm 7.5, socialize 5.9, drink 4.0, fetch_water 3.2, give 3.1 |

### What the gate did (counts of calls to rankOptions, which include the 600 observer samples)

| run | calls with the gate set | calls where it applied | options removed | running activity kept (exempt) | removed by kind |
| --- | --- | --- | --- | --- | --- |
| aspen-D (earlier) | 70084 | 1148 | 19435 | 103 | withdraw 6552, gather 3442, deposit 2355, tend 1313, repair 1246, operate 1026, explore 667, plant 616, plan_site 534, tree_work 523, build 468, till 257, harvest 233, tool_work 93, haul 90, craft 20 |
| aspen-E (earlier) | 69019 | 2297 | 37658 | 131 | withdraw 11062, gather 7086, deposit 4581, repair 2659, tend 2474, operate 2328, explore 1524, plan_site 1480, tree_work 996, build 905, harvest 653, till 630, plant 587, haul 418, tool_work 170, craft 105 |
| aspen-UD | 71352 | 10983 | 194846 | 631 | withdraw 59993, gather 41873, deposit 20863, tend 16935, repair 13696, operate 10636, explore 6844, plant 4472, tree_work 4406, build 4278, plan_site 3229, till 2853, haul 1706, harvest 1443, tool_work 902, craft 717 |
| aspen-UE | 68472 | 18905 | 359056 | 924 | withdraw 104161, gather 96522, deposit 34420, tend 26629, repair 23710, operate 18574, explore 12463, plant 8612, tree_work 8135, build 6997, plan_site 6162, till 4638, haul 3237, harvest 2379, tool_work 1258, craft 1159 |
| river-D (earlier) | 76572 | 1826 | 28607 | 118 | withdraw 11037, gather 4717, deposit 3227, tend 1941, repair 1749, plan_site 1187, operate 984, explore 923, plant 748, tree_work 684, till 541, build 397, harvest 263, haul 115, craft 62, tool_work 32 |
| river-E (earlier) | 78923 | 2271 | 36030 | 106 | withdraw 13174, gather 6096, deposit 4571, tend 2084, repair 2028, operate 1475, plan_site 1381, explore 1267, plant 939, tree_work 887, harvest 768, till 588, build 484, haul 164, craft 86, tool_work 38 |
| river-UD | 76765 | 12747 | 187873 | 772 | withdraw 75650, gather 34980, tend 16150, deposit 15830, repair 14189, operate 8238, explore 5742, tree_work 3838, plant 3337, build 2278, till 2016, plan_site 1882, harvest 1828, haul 1073, craft 498, tool_work 344 |
| river-UE | 75707 | 20701 | 412142 | 939 | withdraw 164036, gather 86234, deposit 34535, repair 34229, tend 26251, operate 11642, explore 11318, plant 10598, tree_work 7642, build 7383, plan_site 5488, harvest 4279, till 4114, haul 2699, craft 1123, tool_work 571 |
| gen-4-D (earlier) | 73268 | 2473 | 40565 | 167 | withdraw 14455, gather 7306, deposit 4382, repair 3019, tend 2517, operate 2506, plan_site 1727, explore 1206, plant 1008, tree_work 901, till 499, harvest 441, build 299, tool_work 154, haul 113, craft 32 |
| gen-4-E (earlier) | 78430 | 3072 | 52424 | 155 | withdraw 17949, gather 9193, deposit 5798, operate 5220, tend 2957, repair 2413, plan_site 2209, explore 1654, tree_work 1247, plant 1124, till 797, harvest 703, build 637, haul 221, tool_work 162, craft 140 |
| gen-4-UD | 74786 | 12758 | 211361 | 912 | withdraw 75563, gather 37148, repair 22495, deposit 17822, tend 14885, operate 14566, explore 5713, plan_site 4851, tree_work 4689, plant 4119, build 3384, till 1962, haul 1931, harvest 1330, craft 465, tool_work 438 |
| gen-4-UE | 75690 | 21379 | 399469 | 935 | withdraw 136243, gather 86857, operate 38607, deposit 30795, repair 27201, tend 21064, explore 12090, plan_site 9191, plant 9175, build 8499, tree_work 6995, haul 4418, harvest 3828, till 3088, craft 786, tool_work 632 |

## The fixed reading (FREE_UPPER_READING.md), applied

People aged 12 and over. life = social_contact + leisure, share of waking time. noise = the larger of |N1 - A| and |N2 - A| in that world. A world counts toward LIFE OPENS when UE life minus A life is at least 8 points, and more than the noise, and survival holds for UE (deaths <= the highest of A, N1, N2 plus 2, and hungry-with-no-food <= A + noise + 3 points). LIFE OPENS when at least 2 of 3 worlds count. SURVIVAL COST when survival fails for UE in at least 2 of 3 worlds. Order: SURVIVAL COST, LIFE OPENS, else NOT OPENED. UD is reported, not part of the headline.

| world | life A | N1 | N2 | UD | UE | noise (life) | UE - A | >= 8 points | > noise | deaths A/N1/N2/UD/UE | survival UD | survival UE | world |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | 11.1 | 10.2 | 11.1 | 13.8 | 18.0 | 1.0 | 6.9 | no | yes | 2/2/0/1/0 | holds | holds | does not count |
| river | 11.4 | 11.2 | 11.1 | 12.8 | 16.6 | 0.3 | 5.2 | no | yes | 0/0/0/0/0 | holds | holds | does not count |
| gen-4 | 11.0 | 10.2 | 11.2 | 12.8 | 16.6 | 0.9 | 5.6 | no | yes | 1/0/1/0/0 | holds | FAILS (deaths 0 vs limit 3; hungry no food 23.1 vs limit 20.6) | does not count |

- SURVIVAL COST (survival fails for UE in at least 2 of 3 worlds): 1 of 3 fail -> no
- LIFE OPENS (UE life above A by at least 8 points and above the noise, with survival holding, in at least 2 of 3 worlds): 0 of 3 worlds count -> no

**VERDICT by the fixed order: NOT OPENED (freed time does not become life even when the gate is always on).**

Per world: aspen: UE-A 6.9 points (noise 1.0), survival holds; river: UE-A 5.2 points (noise 0.3), survival holds; gen-4: UE-A 5.6 points (noise 0.9), survival FAILS.

## Where the time went over the whole waking day (people aged 12 and over, % of waking ticks; against the noise of the nudged controls)

| world | category | A | N1 | N2 | D (earlier) | E (earlier) | UD | UE | UD - A | UE - A | noise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | travel | 55.1 | 48.7 | 53.0 | 54.1 | 53.4 | 48.5 | 48.9 | -6.6 | -6.2 | 6.4 |
| aspen | work | 14.1 | 13.1 | 14.1 | 13.9 | 13.7 | 12.5 | 11.0 | -1.6 | -3.1 | 1.0 |
| aspen | social_contact | 10.9 | 9.9 | 10.9 | 11.0 | 11.1 | 12.2 | 15.2 | 1.4 | 4.3 | 1.0 |
| aspen | leisure | 0.3 | 0.3 | 0.3 | 0.4 | 0.5 | 1.6 | 2.8 | 1.3 | 2.5 | 0.0 |
| aspen | waiting | 9.7 | 8.6 | 8.2 | 7.5 | 9.7 | 10.9 | 10.0 | 1.2 | 0.3 | 1.5 |
| aspen | rest | 4.6 | 13.0 | 7.4 | 7.6 | 5.9 | 8.6 | 6.9 | 4.0 | 2.4 | 8.4 |
| aspen | idle | 0.7 | 0.6 | 0.7 | 0.7 | 0.7 | 0.6 | 0.6 | -0.1 | -0.1 | 0.1 |
| aspen | eating_drinking_warming | 3.7 | 5.5 | 4.9 | 4.4 | 4.3 | 4.7 | 4.2 | 1.1 | 0.6 | 1.9 |
| aspen | other | 1.1 | 0.4 | 0.5 | 0.5 | 0.7 | 0.5 | 0.3 | -0.6 | -0.8 | 0.7 |
| river | travel | 48.3 | 53.9 | 54.7 | 54.2 | 53.5 | 52.7 | 46.0 | 4.4 | -2.3 | 6.5 |
| river | work | 11.3 | 12.4 | 12.5 | 11.8 | 11.5 | 11.2 | 9.6 | -0.0 | -1.6 | 1.3 |
| river | social_contact | 11.2 | 11.0 | 10.8 | 10.9 | 11.5 | 11.4 | 14.2 | 0.2 | 2.9 | 0.4 |
| river | leisure | 0.2 | 0.2 | 0.3 | 0.3 | 0.3 | 1.4 | 2.4 | 1.3 | 2.3 | 0.1 |
| river | waiting | 9.1 | 8.0 | 8.7 | 8.3 | 8.8 | 10.1 | 9.1 | 1.0 | 0.0 | 1.0 |
| river | rest | 12.5 | 9.2 | 7.4 | 9.4 | 9.1 | 7.1 | 9.1 | -5.4 | -3.4 | 5.2 |
| river | idle | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | -0.0 | -0.0 | 0.0 |
| river | eating_drinking_warming | 6.6 | 4.2 | 4.5 | 4.2 | 4.0 | 5.2 | 8.8 | -1.4 | 2.2 | 2.4 |
| river | other | 0.3 | 0.5 | 0.4 | 0.2 | 0.6 | 0.3 | 0.2 | 0.0 | -0.1 | 0.2 |
| gen-4 | travel | 55.4 | 53.7 | 51.9 | 53.5 | 51.9 | 56.3 | 45.7 | 0.9 | -9.8 | 3.5 |
| gen-4 | work | 11.9 | 11.7 | 11.5 | 11.5 | 11.7 | 11.1 | 9.0 | -0.9 | -2.9 | 0.4 |
| gen-4 | social_contact | 10.7 | 9.8 | 11.0 | 10.8 | 11.3 | 11.3 | 14.0 | 0.5 | 3.3 | 0.9 |
| gen-4 | leisure | 0.3 | 0.3 | 0.3 | 0.5 | 0.3 | 1.5 | 2.6 | 1.2 | 2.3 | 0.0 |
| gen-4 | waiting | 9.2 | 7.6 | 9.1 | 9.5 | 9.7 | 10.7 | 10.3 | 1.5 | 1.2 | 1.5 |
| gen-4 | rest | 7.8 | 9.9 | 9.8 | 8.6 | 9.3 | 4.5 | 8.9 | -3.3 | 1.1 | 2.2 |
| gen-4 | idle | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | 0.6 | -0.0 | -0.1 | 0.0 |
| gen-4 | eating_drinking_warming | 3.6 | 5.8 | 5.3 | 4.4 | 4.8 | 3.7 | 8.7 | 0.0 | 5.1 | 2.2 |
| gen-4 | other | 0.4 | 0.4 | 0.5 | 0.7 | 0.4 | 0.4 | 0.2 | 0.0 | -0.2 | 0.2 |

## The other measures against the nudge spread (spread = larger of |N1 - A| and |N2 - A|; BEYOND = the arm minus A is larger than the spread)

| world | measure | A | N1 | N2 | UD | UE | spread | UD - A | UE - A |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aspen | outdoor company 12+ | 40.33 | 42.58 | 42.70 | 43.74 | 50.21 | 2.37 | 3.40 BEYOND | 9.87 BEYOND |
| aspen | hungry no food 12+ | 14.46 | 20.72 | 16.18 | 16.84 | 19.71 | 6.26 | 2.38 | 5.25 |
| aspen | food held a head, end | 9.04 | 10.77 | 10.29 | 7.08 | 5.50 | 1.73 | -1.96 BEYOND | -3.54 BEYOND |
| aspen | food gathered a head a day | 2.22 | 2.21 | 2.30 | 2.18 | 2.25 | 0.08 | -0.04 | 0.03 |
| aspen | wood gathered a head a day | 0.59 | 0.61 | 0.61 | 0.55 | 0.49 | 0.02 | -0.04 BEYOND | -0.10 BEYOND |
| aspen | work jobs a head a day | 2.51 | 2.33 | 2.51 | 2.07 | 1.75 | 0.19 | -0.44 BEYOND | -0.77 BEYOND |
| aspen | deaths | 2.00 | 2.00 | 0.00 | 1.00 | 0.00 | 2.00 | -1.00 | -2.00 |
| aspen | people at the end | 68.00 | 73.00 | 71.00 | 72.00 | 70.00 | 5.00 | 4.00 | 2.00 |
| river | outdoor company 12+ | 44.82 | 45.02 | 44.50 | 44.40 | 50.98 | 0.32 | -0.42 BEYOND | 6.15 BEYOND |
| river | hungry no food 12+ | 20.23 | 18.36 | 18.20 | 18.65 | 20.87 | 2.03 | -1.58 | 0.64 |
| river | food held a head, end | 6.10 | 7.42 | 8.57 | 6.91 | 5.44 | 2.47 | 0.81 | -0.66 |
| river | food gathered a head a day | 2.03 | 2.09 | 1.94 | 2.00 | 1.88 | 0.10 | -0.03 | -0.15 BEYOND |
| river | wood gathered a head a day | 0.55 | 0.61 | 0.65 | 0.60 | 0.49 | 0.10 | 0.05 | -0.07 |
| river | work jobs a head a day | 2.19 | 2.45 | 2.54 | 2.21 | 1.83 | 0.35 | 0.01 | -0.36 BEYOND |
| river | deaths | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| river | people at the end | 80.00 | 82.00 | 77.00 | 76.00 | 74.00 | 3.00 | -4.00 BEYOND | -6.00 BEYOND |
| gen-4 | outdoor company 12+ | 39.68 | 40.42 | 42.08 | 41.40 | 51.16 | 2.40 | 1.71 | 11.48 BEYOND |
| gen-4 | hungry no food 12+ | 15.33 | 14.39 | 17.60 | 16.77 | 23.11 | 2.28 | 1.44 | 7.78 BEYOND |
| gen-4 | food held a head, end | 10.34 | 8.44 | 7.77 | 4.67 | 3.72 | 2.57 | -5.67 BEYOND | -6.62 BEYOND |
| gen-4 | food gathered a head a day | 2.51 | 2.45 | 2.33 | 2.40 | 2.23 | 0.18 | -0.11 | -0.28 BEYOND |
| gen-4 | wood gathered a head a day | 0.66 | 0.62 | 0.60 | 0.62 | 0.46 | 0.06 | -0.04 | -0.20 BEYOND |
| gen-4 | work jobs a head a day | 2.41 | 2.36 | 2.25 | 2.07 | 1.62 | 0.15 | -0.33 BEYOND | -0.79 BEYOND |
| gen-4 | deaths | 1.00 | 0.00 | 1.00 | 0.00 | 0.00 | 1.00 | -1.00 | -1.00 |
| gen-4 | people at the end | 74.00 | 71.00 | 77.00 | 75.00 | 75.00 | 3.00 | 1.00 | 1.00 |

22 of 48 UD or UE comparisons on these measures exceed the spread. Under no effect a comparison clears the larger of two nudge differences about a third of the time (reasoning from exchangeability, not tested): aspen UD outdoor company 12+ +3.40 (spread 2.37); aspen UE outdoor company 12+ +9.87 (spread 2.37); aspen UD food held a head, end -1.96 (spread 1.73); aspen UE food held a head, end -3.54 (spread 1.73); aspen UD wood gathered a head a day -0.04 (spread 0.02); aspen UE wood gathered a head a day -0.10 (spread 0.02); aspen UD work jobs a head a day -0.44 (spread 0.19); aspen UE work jobs a head a day -0.77 (spread 0.19); river UD outdoor company 12+ -0.42 (spread 0.32); river UE outdoor company 12+ +6.15 (spread 0.32); river UE food gathered a head a day -0.15 (spread 0.10); river UE work jobs a head a day -0.36 (spread 0.35); river UD people at the end -4.00 (spread 3.00); river UE people at the end -6.00 (spread 3.00); gen-4 UE outdoor company 12+ +11.48 (spread 2.40); gen-4 UE hungry no food 12+ +7.78 (spread 2.28); gen-4 UD food held a head, end -5.67 (spread 2.57); gen-4 UE food held a head, end -6.62 (spread 2.57); gen-4 UE food gathered a head a day -0.28 (spread 0.18); gen-4 UE wood gathered a head a day -0.20 (spread 0.06); gen-4 UD work jobs a head a day -0.33 (spread 0.15); gen-4 UE work jobs a head a day -0.79 (spread 0.15).

