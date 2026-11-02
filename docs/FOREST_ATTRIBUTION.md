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
