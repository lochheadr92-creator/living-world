# The acceptance gate: what applies, what was run, and what it found

## 1. No recorded gate can accept a rules-version-2 change

`scripts/gates.ts` compares like with like and refuses otherwise — same dynamics, **same rules version**, same profile,
fork day, days and branch (`gates.ts`, the `differs` check). Both recorded baselines are unversioned:

| baseline | dynamics | rulesVersion | profile | fork | days | seeds |
|---|---|---|---|---|---|---|
| `docs/gates.json` | authored (absent) | absent | large | 0 | 12 | 8 |
| `docs/gates-rich.json` | rich | **absent** | large | 0 | 12 | 24 |

A version-2 run would be refused with *"rules version unversioned vs 2"*. That is the guard working correctly: every
rich implementation since the first has carried the word "rich", which is exactly why the version field was added.

There is therefore **no non-circular gate for the first change at a new rules version**. Recording a version-2 baseline
from this candidate and then checking the candidate against it would be comparing it with itself, which the task
forbids and which would be worthless anyway. This is a gap in the gate policy, not something this change can close.

## 2. The gate that CAN be run, and does apply

The generation the baselines do describe can be checked: an **unversioned rich Large world**, run from this branch,
against `docs/gates-rich.json`, which was recorded 56 commits before `origin/main` (commit `e8118fe`). A pass would say
this change has not disturbed the generation the gates cover — ground nothing else reaches, since the goldens are 80x80
ordinary worlds and scenes and the version-1 continuation reference is the `normal` profile.

```
node scripts/lab.mjs --out gate_v2_unversioned --seeds 24 --fork 0 --days 12 --profile large --dynamics rich-unversioned --branches none
npx vite-node scripts/gates.ts -- gate_v2_unversioned --file docs/gates-rich.json
```

Run at `72640d7` (working tree clean; `HEAD.txt`). Result in `gate_result.txt`:

```
gates: 24 seeds (rich, large, from day 0, 12 days, branch "control") against 24 recorded in docs/gates-rich.json
  pass  people           101.0   band [99.8, 102.8]   recorded 101.3
  pass  deaths             1.1   band [-0.5, 1.5]     recorded 0.5
  pass  workplaces        10.1   band [8.7, 13.6]     recorded 11.1
  pass  solidHomes        25.5   band [23.1, 29.4]    recorded 26.3
  pass  buildings         82.1   band [78.8, 89.4]    recorded 84.1
  pass  plots             89.3   band [85.7, 102.7]   recorded 94.2
  pass  homeless           0.4   band [-0.6, 0.6]     recorded 0.0
  pass  belowCritical      1.0   band [-0.7, 2.0]     recorded 0.6
  pass  meanHunger        63.8   band [60.6, 72.0]    recorded 66.3
  FAIL  tools            140.8   band [143.9, 178.7]  recorded 161.3
  pass  meanCondition     64.1   band [62.8, 69.8]    recorded 66.3
  pass  every seed keeps at least 50 people
1 gate(s) failed
```

## 3. That failure is pre-existing on `main`, and this branch is not the cause

The same ensemble and the same gate were run on `main` (`5b7a941`) in a temporary worktree, which was removed
afterwards; its 24 seed files, report and gate output are kept here under `main_5b7a941/`.

**`main` fails identically**: `tools 140.8`, band `[143.9, 178.7]`, and every other line the same to the digit.

Stronger than that, seed by seed:

* all **24/24** seeds have the **same `finalHash`** on both revisions, and
* every metric both revisions record is **equal on all 24 seeds**.

The only difference between the two sets of rows is that this branch records ten metric *fields* `main` does not:
`prepAdopted`, `prepSeason`, `prepHardship`, `prepDone`, `prepDropped`, `prepUnits`, `prepDays`, `hungerExposure`,
`homeFoodPerPerson`, `storeFoodPerPerson`.

Two conclusions, both evidenced rather than argued:

1. **The `tools` gate failure belongs to `main`, not to this branch.** `docs/gates-rich.json` is 56 commits stale and
   already failing before this work existed. Fixing it is a separate job and must not be done on this branch, where
   re-recording it would look like a candidate recording its own pass.
2. **An unversioned rich Large world at 12 days is bit-for-bit unchanged by this branch.** That is new evidence for
   version-1/unversioned preservation at a profile and duration the goldens and the continuation reference do not
   reach.

## 4. The smallest valid acceptance procedure, proposed

For **this** change, since the repository's gate cannot be applied to a version-2 run, acceptance rests on:

* the older generation provably unchanged — golden fingerprints identical (not re-recorded), the version-1 continuation
  reference identical, and the 24-seed unversioned Large ensemble identical to `main` seed for seed;
* the test suite, including 43 contract tests for this feature and the version-1 continuation test;
* the preparation ensembles, which compare the same rules with the feature on and off, against a two-arm nudge floor;
* the two browser checks.

Two baselines should then be recorded, **after** this is merged and explicitly **not** as evidence for it:

```
node scripts/lab.mjs --out gates_rich_refresh --seeds 24 --fork 0 --days 12 --profile large --dynamics rich-unversioned --branches none
npx vite-node scripts/gates.ts -- gates_rich_refresh --record --file docs/gates-rich.json --force
```

```
node scripts/lab.mjs --out gates_v2_out --seeds 24 --fork 0 --days 12 --profile large --branches none
npx vite-node scripts/gates.ts -- gates_v2_out --record --file docs/gates-v2.json
```

The first replaces a baseline that is 56 commits stale and failing; the second gives the version-2 generation a
reference so that the *next* behavioural change can be gated. Each is about 4 minutes on 24 cores. Recording asserts
nothing and passes nothing, which `gates.ts` says in its own output.

`docs/DEVELOPMENT_POLICY.md` should also say what is written above: the first change at a new rules version cannot be
gated, and what stands in its place.
