# P0.1c forest floors: rules 118 and 121, arrivals on and off

Frozen worktree at `b5694c7`, Normal profile, seed forest, every draw ending at day 25. 25 draws per arm: the control and 24 nudges.

Checks: all rows finished, provenance b5694c7 clean, rules/pinned/arrivals as asked, 8 identical controls per arm, controls equal the P0.1a single runs.
P0.1b cross-check: 25 of 25 arrivals-off rules-121 draws end in the same final state as P0.1b (frozen 3df2ac8).

| Arm | control alive (deaths) | mean alive | sd | median | range | draws with 10+ alive | mean alive at day 20 | nudges equal to control |
|---|---|---|---|---|---|---|---|---|
| r118-on | 3 (30) | 3.1 | 2.6 | 3 | 0-8 | 0 of 25 | 27.6 | 2 |
| r121-on | 4 (29) | 5.6 | 3.7 | 5 | 0-15 | 2 of 25 | 26.6 | 1 |
| r118-off | 21 (10) | 8.7 | 6.2 | 8 | 1-21 | 12 of 25 | 26.7 | 0 |
| r121-off | 1 (28) | 5.6 | 4.7 | 4 | 1-16 | 6 of 25 | 27.8 | 2 |

| Contrast (alive at day 25) | difference in means | bootstrap 95% interval | permutation p |
|---|---|---|---|
| arrivals on: 118 - 121 | -2.4 | -4.2 to -0.7 | 0.0096 |
| arrivals off: 118 - 121 | +3.1 | 0.1 to 6.0 | 0.0562 |

Alive includes arrived people when arrivals are on, so on and off arms are not compared with each other here.

## Draws

- r118-on: control@2=3, nudge:1@2=7, nudge:2@2=7, nudge:3@2=5, nudge:4@2=3, nudge:1@3=2, nudge:2@3=3, nudge:3@3=2, nudge:4@3=2, nudge:1@4=7, nudge:2@4=3, nudge:3@4=0, nudge:4@4=0, nudge:5@4=0, nudge:6@4=5, nudge:7@4=3, nudge:8@4=5, nudge:1@5=0, nudge:2@5=3, nudge:3@5=0, nudge:4@5=2, nudge:1@6=1, nudge:2@6=7, nudge:3@6=8, nudge:4@6=0
- r121-on: control@2=4, nudge:1@2=8, nudge:2@2=6, nudge:3@2=9, nudge:4@2=3, nudge:1@3=5, nudge:2@3=3, nudge:3@3=2, nudge:4@3=3, nudge:1@4=4, nudge:2@4=4, nudge:3@4=2, nudge:4@4=9, nudge:5@4=8, nudge:6@4=7, nudge:7@4=2, nudge:8@4=7, nudge:1@5=5, nudge:2@5=4, nudge:3@5=0, nudge:4@5=6, nudge:1@6=5, nudge:2@6=15, nudge:3@6=3, nudge:4@6=15
- r118-off: control@2=21, nudge:1@2=1, nudge:2@2=5, nudge:3@2=3, nudge:4@2=1, nudge:1@3=1, nudge:2@3=10, nudge:3@3=6, nudge:4@3=5, nudge:1@4=18, nudge:2@4=3, nudge:3@4=18, nudge:4@4=4, nudge:5@4=2, nudge:6@4=10, nudge:7@4=14, nudge:8@4=16, nudge:1@5=18, nudge:2@5=1, nudge:3@5=10, nudge:4@5=8, nudge:1@6=11, nudge:2@6=7, nudge:3@6=11, nudge:4@6=13
- r121-off: control@2=1, nudge:1@2=9, nudge:2@2=4, nudge:3@2=12, nudge:4@2=6, nudge:1@3=10, nudge:2@3=1, nudge:3@3=10, nudge:4@3=6, nudge:1@4=2, nudge:2@4=1, nudge:3@4=1, nudge:4@4=4, nudge:5@4=15, nudge:6@4=5, nudge:7@4=1, nudge:8@4=9, nudge:1@5=2, nudge:2@5=1, nudge:3@5=3, nudge:4@5=1, nudge:1@6=6, nudge:2@6=16, nudge:3@6=3, nudge:4@6=11
