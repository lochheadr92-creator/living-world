# Forest attribution, plan step P0.1 (2 November 2026)

Step P0.1 of the revised domain plan (brain note `knowledge/living-world/domain-plan-revised`).
Question: why does the forest seed collapse in 25-day runs at rules 121, when Stage 3's rules 118 kept
21 alive (`docs/PAVEL_TALIA_INTEGRATION.md`, "25-day long runs at rules 121")?
This is a measurement only: no code, rules version or setting changed.

## P0.1a rules bisection

**Method.**
- Observer: `scripts/household_supply_observe.ts <seed> <out> 25 5400 <rules>`. It pins the rules version
  and checks conservation daily, an exact unobserved twin at the end and 500 observer-purity samples per run.
- Arrivals on: a frozen detached worktree at `3df2ac8`, where the observer uses
  `currentWorldSettings('normal', seed)`. Rules 118-121 on forest, river, meadow, fern and aspen: 20 runs.
- Arrivals off: a frozen detached worktree at `3f65f8c`, whose `src/` is identical and whose observer forces
  `immigration:false`. Rules 118-121 on forest, river and meadow: 12 runs.
- Normal profile, 28 founders, Node v24.19.0, 10-12 runs in parallel. All 32 runs reached day 25 with every
  check passing.

**Cross-checks.** All three pass.
- Arrivals on, forest at 121 reproduces the recorded run of 4 alive and 29 deaths. The death list is identical
  and the final save byte-identical, although the recorded run used another observer (`ready_step_observe.ts`).
- Arrivals off, forest at 121 reproduces the recorded 1 alive and 28 deaths, also byte-identical.
- Arrivals off, rules 118 on the integrated code reproduces Stage 3's rules-118 runs at `50f2f78` exactly on
  all three seeds, with identical death lists. The integration did not change rules-118 worlds.

**Alive at day 25 (deaths in brackets).**

| Seed | Arrivals | 118 | 119 | 120 | 121 |
|---|---|---|---|---|---|
| forest | off | 21 (10) | 18 (10) | **1 (28)** | **1 (28)** |
| forest | on | **3 (30)** | **3 (32)** | **0 (31)** | **4 (29)** |
| river | off | 23 (7) | 22 (9) | 24 (6) | 24 (6) |
| river | on | 26 (13) | 16 (24) | 14 (24) | 19 (21) |
| meadow | off | 26 (2) | 29 (2) | 26 (4) | 28 (2) |
| meadow | on | 28 (12) | 32 (6) | 28 (8) | 33 (8) |
| fern | on | 18 (18) | 18 (14) | 8 (29) | 8 (29) |
| aspen | on | 28 (7) | 28 (9) | 28 (6) | 29 (8) |

**Forest hunger deaths.** Day = tick / 2400. A year is 12 days and winter its last 4
(`DAYS_PER_YEAR`, `WINTER_LENGTH`), so the second winter runs from day 20 to day 24.
- Arrivals off:
  - at 118, 6 between days 23.1 and 23.7, plus 1 at 12.5;
  - at 119, 6 between days 22.9 and 23.2;
  - at 120 and 121, 16 between days 18.9 and 23.2. The two runs have the same deaths.
- Arrivals on:
  - at 118, 12 between days 21.0 and 23.1, plus 1 at 9.7;
  - at 119, 13 between days 21.7 and 23.1, plus 1 at 10.4;
  - at 120, 19 between days 20.8 and 23.2;
  - at 121, 14 between days 21.9 and 23.1.

**Observed.**
- Every forest run has a hunger cluster in the second winter, at every rules version and with arrivals on or
  off. Only rules 118 and 119 with arrivals off come through it, losing 6 people each to hunger. Every other
  forest run collapses there.
- With arrivals off, the forest outcome changes at the 119-to-120 step (Talia's childhood), from 18 alive to 1.
  The 120-to-121 step (resumed gathering credit) changes no death in forest or river.
- With arrivals on, forest also collapses at rules 118. Under the product setting, none of the rules from 119
  to 121 is needed for the collapse.
- Elsewhere, single runs move in both directions:
  - fern with arrivals on drops at 119-to-120 (18 to 8, with 12 exposure deaths), and 120 and 121 have the same
    deaths;
  - river with arrivals on drops at 118-to-119 (26 to 16).

**Limits.**
- One run per seed, rules version and setting.
- Any rules change reshapes a chaotic trajectory, so a step at which one run changes is not yet attribution.
  The spread between equivalent worlds is unknown until P0.1b's nudge arms.
- Population by day is rebuilt from the chronicle's arrival and birth ticks and from the deceased archive.
  The chronicle held fewer than 400 entries in every run, so it was complete, and the 28 founders reconcile
  in every run.
- No survival target is claimed or failed.

**Next.** P0.1b switch ablation at 121 with arrivals off. It compares control, `nudge:1` and `nudge:2` with
`rich-no-childhood`, which tests the 119-to-120 step, and with `rich-no-lived-life`, `rich-no-critical-search`
and `rich-no-reachable-tilling`.

**Evidence.** This is local and untracked, in this checkout:
- `p01_evidence/p01a-bisection/` and `p01_evidence/p01a-bisection-noarrivals/`. Each holds `manifest.json`,
  `status.json`, `summary.md`, `summary.json`, `population_by_day.csv`, and each run's `report.json`,
  `final.json` and logs.
- `p01_evidence/scripts/` holds the runner and analysis scripts.

## P0.1b switch ablation at rules 121

**Method.**
- The lab ran from the frozen `3df2ac8` worktree at rules 121, with arrivals off (forced by `lab_seed.ts`), on the
  Normal profile.
- Forest was run directly with `scripts/lab_seed.ts --seed forest`, forking at day 4 and running 21 days. The eight
  standard seeds were run with `scripts/lab.mjs --seeds 8` (meadow, river, fern, aspen, birch, cedar, gen-1 and gen-2),
  with the same fork and days.
- The arms are the control, `nudge:1`, `nudge:2`, `rich-no-childhood`, `rich-no-lived-life`, `rich-no-critical-search`
  and `rich-no-reachable-tilling`.
- Forest's noise floor was then widened with `nudge:3` to `nudge:8` at day 4. The tilling and childhood arms were
  repeated at fork days 2, 3, 5 and 6, each with `nudge:1` to `nudge:4` and each ending at day 25.
- The forest control is 1 alive with 28 deaths. Its population by day equals the P0.1a arrivals-off rules-121 run, and
  four separate processes gave the identical control state.

**Forest: alive at day 25.**

| Fork day | Control and nudges | Tilling off | Childhood off |
|---|---|---|---|
| 2 | 1, 9, 4, 12, 6 | 16 | 11 |
| 3 | 1, 10, 1, 10, 6 | 16 | 1 |
| 4 | 1, 2, 1, 1, 4, 15, 5, 1, 9 | 16 | 5 |
| 5 | 1, 2, 1, 3, 1 | 16 | 7 |
| 6 | 1, 6, 16, 3, 11 | 1 | 4 |

At day 4, lived life off gives 2 alive and critical search off gives 1.

- The 24 nudges give 1 to 16 alive, a mean of 5.8. One extra random draw is enough to move forest across most of the
  range, so the control's 1 alive is a low draw.
- Tilling off is effectively one alternative trajectory, not five.
  - From fork days 2 to 5 it first differs from the control at the same tick, 12,600 (day 5.25), and ends in an
    identical final save with 16 alive.
  - From day 6, after that point, it ends with 1 alive.
  - Both outcomes lie within the nudge range.
- Childhood off diverges at once at every fork day, giving 5 independent draws with a mean of 5.6. That is the same as
  the nudges.
- Critical search off ends in exactly the control's state, in forest and in all eight standard seeds. The switch never
  fires in these worlds.

**Eight standard seeds.** The lab report (`p01b-8seeds/report.txt`) compares each arm against control and nudges, paired
by seed:
- No arm's people or deaths differ from chance: childhood off +1.6 people, lived life off +1.6 and tilling off +1.7.
  Every interval includes zero.
- One non-survival effect is larger than chance. Removing lived life raises completed household food preparations,
  `prepDone`, from 7.6 to 12.9 (higher in 7 of 8 seeds). It also raises person-days spent on preparation steps,
  `prepDays`, from 14.6 to 28.2 (higher in 8 of 8). So at rules 119 and above, households prepare less food themselves.
  This measurement does not show whether that matters for survival.

## P0.1 result

**Chronic seed fragility.** No rules step is named:
- Forest at rules 121 collapses in its second winter (days 20-24) in most draws.
- How many survive depends on single random draws, anywhere from 1 to 16 of 28.
- No switch for rules 118-121 moves the forest outcome beyond that spread.
- No switch moves the survivors of the eight standard seeds beyond chance.
- The P0.1a step from rules 119 to 120 (18 to 1 alive) lies within the forest's demonstrated spread.

So, per the plan, step P0.2 (repair) is not needed.

**Open question.** P0.1 cannot answer whether forest's distribution at rules 121 is worse than at 118. The one
rules-118 forest run kept 21 alive, which is above all 24 rules-121 nudges. A rules-118 noise floor needs the lab to pin a
rules version: `lab_seed.ts` takes only the current rules, `authored` or `rich-unversioned`. That is a bounded tooling
change, which needs owner approval under the plan.

**Evidence.** This is local and untracked:
- `p01_evidence/p01b-forest/`, `p01b-8seeds/`, `p01b-forest-nudges/` and `p01b-forest-forks/`;
- `p01b-summary.md`, `p01b-launch.json` and `scripts/p01b_analyse.mjs`.

## P0.1c forest floors at rules 118 and 121 (3 November 2026)

The owner approved the lab change (`--rules N`) and asked for the lab to run with every capability on, arrivals
included. Both landed in `b5694c7`; the decisions are in the brain
(`decisions/manual/claude-living-world/2026-11-03-arrivals-on-everywhere` and `2026-11-03-lab-rules-pin`).

**Method.**
- Lab runs from a frozen detached worktree at `b5694c7`, Normal profile, seed forest, every draw ending at day 25.
- Four arms: rules 118 (pinned) and 121, each with arrivals on and off.
- Each arm has 25 draws, the same design as P0.1b: the control, `nudge:1` to `nudge:8` forked at day 4, and
  `nudge:1` to `nudge:4` forked at days 2, 3, 5 and 6.
- Checks:
  - every row finished, from clean `b5694c7`, with the rules, pin and arrivals asked for;
  - each arm's 8 controls are identical;
  - each control equals the P0.1a single run for that rules version and setting, so the pin and the arrivals switch
    reproduce the observer runs exactly;
  - all 25 arrivals-off rules-121 draws end in the same final state as P0.1b's (frozen `3df2ac8`), so the change left
    arrivals-off lab runs unchanged.

**Forest: alive at day 25.** Alive includes arrived people when arrivals are on.

| Arm | Control alive (deaths) | Mean | sd | Median | Range | Draws with 10+ alive | Mean alive at day 20 |
|---|---|---|---|---|---|---|---|
| 118, arrivals on | 3 (30) | 3.1 | 2.6 | 3 | 0-8 | 0 of 25 | 27.6 |
| 121, arrivals on | 4 (29) | 5.6 | 3.7 | 5 | 0-15 | 2 of 25 | 26.6 |
| 118, arrivals off | 21 (10) | 8.7 | 6.2 | 8 | 1-21 | 12 of 25 | 26.7 |
| 121, arrivals off | 1 (28) | 5.6 | 4.7 | 4 | 1-16 | 6 of 25 | 27.8 |

Rules 118 minus rules 121, alive at day 25. The draws are unpaired; the test is a permutation test of the difference in
means, with a bootstrap interval:
- Arrivals on: -2.4 (95% interval -4.2 to -0.7, p = 0.01).
- Arrivals off: +3.1 (95% interval 0.1 to 6.0, p = 0.06).

**Result.**
- With arrivals on, the product setting, rules 121 is not worse than 118 for forest. It keeps slightly more people,
  and 118 never brings 10 through.
- With arrivals off, 118 keeps about 3 more on average, at the edge of chance. The single rules-118 run's 21 alive is
  the top of its range, not its typical outcome.
- In every arm forest has about 27 people at day 20 and loses most of them in the second winter. The collapse is
  chronic to the seed under both rule sets. It is not a regression from rules 119-121.
- This closes P0.1's open question. Step P0.2 (repair) is still not needed.

**Evidence.** This is local and untracked: `p01_evidence/p01c-floors/` (rows, `summary.md`, `summary.json`,
`launch.json`), `scripts/p01c_launch.ps1` and `scripts/p01c_analyse.mjs`.
