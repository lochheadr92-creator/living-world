# Narrowed P1.2 (rules 154) and rules 155 — published verification, 4 November 2026

Owner decisions: "Narrow, then re-measure" (drop the old-hearsay cost) and "Theirs first", later
superseded by the Brain implementation list (finish the active increment first). The draft and its
first measurement are in `../p12-confidence-20261104/` (branch `p12-teller-confidence`, kept as
history). Published commits rebuild the final form on main: `d392a8c1` (154), `9b4294c6` and
`ce4e38a7` (leisure fixture), `b1d9ba93` (155).

## Re-measurement of the narrowed rule

Frozen worktree at `ede87387` (same rules-154/155 behaviour as published), `scripts/hearsay_trips.ts`,
Normal, arrivals on, fork day 5 + 20 days, forest/river/meadow, arms control, nudge:1, nudge:2,
rich-no-confidence. All arms conserve.

| Seed | Total wasted food trips /100: control / n1 / n2 | Removal | Doubted-teller trips (154 arms vs removal) | Alive (154 arms vs removal) |
|---|---|---|---|---|
| forest | 18.2 / 18.3 / 18.9 | 20.3 | 4-7 vs 11 | 2-14 vs 4 |
| river | 9.9 / 8.8 / 10.6 | 9.4 | 4-5 vs 16 | 21-26 vs 23 |
| meadow | 13.5 / 17.4 / 16.1 | 14.2 | 5-6 vs 32 | 26-29 vs 29 |

The rule cuts trips on caught-out tellers' word 2-6x. No measured change in total wasted food
trips or survivors, and no sign of harm (the leisure fixture world: 23 alive with the rule, 22
without; `leisure-fixture.out.log`). An explained knowledge behaviour, not a benefit claim.

## Verification of `ce4e38a7` (rules 155)

- First full suite on `b1d9ba93` (`../agent-20261104-155/suite/`): exit 1, 2,876 passed, 3 failed:
  the retained famine fixture was absent from the new worktree (restored unchanged, SHA-256
  `c24c9d0e...`, `restored-fixture.sha256`) and the three-world leisure test lacked a timeout.
- Final full suite on `ce4e38a7` (`suite-final/`): exit 1, 2,878 of 2,879 passed. The one failure
  is `zz_review_g_observer_purity` timing out at 170 s while two probes ran alongside. Run in
  isolation at the same moment it passes on both this source (182.3 s) and published `79e3ac40`
  (183.9 s): a pre-existing near-limit timeout under load, not a 154/155 slowdown.
- Typecheck clean. Immutable 154 and 155 references recorded in order, each while current.
- 25-day Normal arrivals-on screens on `b1d9ba93` (`forest|river|meadow`): horizon, 500 pure
  checks, exact continuation and conservation pass. Single trajectories: sheep acquired on each
  seed; no lamb in river this draw; meadow 6 successful net checks.
