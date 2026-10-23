# Evidence for rules version 9 (eating at a store with a full pack)

Everything here was produced in this session on 2026-10-24 on the 24-core machine at `C:\dev\Claude Experiment`, from a worktree
cut from `origin/main` `3d93180`. The contract and the reading of these numbers are in `docs/TABLE_EATING.md`.

Provenance. The two ensembles ran from the working tree whose `src/` is exactly the files in the rules-version-9 commit. The only
later `src/` edit is the observer-only fix in `lifechanges.ts` and `inspect.ts`, which a lab run never exercises. Use a fresh output
directory after any source change.

| file | what | command |
|---|---|---|
| `store_meals_normal_r8.json`, `..._r9.json` | every finished store meal by outcome and cause, seeds river, brook, meadow, stone5, Normal, 8 days | `npx vite-node scripts/store_meals.ts -- river,brook,meadow,stone5 8 --rules 8 --json table_evidence/store_meals_normal_r8.json` (and `--rules 9`) |
| `household_life_river_r8.json`, `..._r9.json` | the whole household loop, seed river, Normal, 8 days; the followed household's chain, a census of all 12, and an observer-purity check | `npx vite-node scripts/household_life.ts -- river 8 --rules 9 --json table_evidence/household_life_river_r9.json` (and `--rules 8`) |
| `lab_normal_report.txt`, `paired_normal.txt` | paired lab, control against `rich-no-table-eating`, two nudges as the noise floor; 32 seeds, Normal, 12 days | `node scripts/lab.mjs --out <dir> --seeds 32 --fork 0 --days 12 --profile normal --branches nudge:1,nudge:2,rich-no-table-eating --dynamics rich` |
| `lab_town_report.txt`, `paired_town.txt` | the same on the town profile; 16 seeds, 8 days | `node scripts/lab.mjs --out <dir> --seeds 16 --fork 0 --days 8 --profile town --branches nudge:1,nudge:2,rich-no-table-eating --dynamics rich` |

Run time on 24 cores: the Normal ensemble about 4 minutes, the town ensemble about 12. Re-running with the same `--out` resumes.

`paired_*.txt` is the per-arm total of the lab's raw rows at full precision (the report rounds `hungerExposure` to 0.0), plus the
paired difference per seed. The rows are the `lab_<seed>.jsonl` files the lab writes to `--out`; they were not copied here
because the reports carry the same findings.

Replay. Each household history ends with a check that the live world's hash is unchanged after the inspector's cards were read
from a round-tripped copy, and that save and reload is byte-identical. Both are true in every file here.

Performance baselines of the product world (rich, rules version 9, single seed `perf`, arrivals off, one machine, measured from
a cold start so they are early-world figures, not steady state):

| population | map | days | mean ms/tick | p95 | max | heap after | save size | feed / chronicle |
|---|---|---|---|---|---|---|---|---|
| 28 (normal) | 80x80 | 3 | 0.52 | 0.99 | 26.9 | 138 MB | 1.8 M chars | 74 / 25 |
| 100 (town) | 80x80 | 2 | 5.04 | 8.06 | 102.5 | 348 MB | 10.5 M chars | 210 / 71 |
| 250 (huge) | 256x256 | 1 | 9.74 | 13.57 | 129.6 | 365 MB | 16.8 M chars | 366 / 152 |
| 300 (huge, population 300) | 256x256 | 1 | 13.37 | 17.73 | 158.5 | 368 MB | 21.1 M chars | 425 / 185 |

The heap figure includes the tooling's own modules, so read it as an upper bound on the world. The feed is capped at 500 events
and the chronicle at 400, so event-log growth is bounded by construction. No acceptance threshold is proposed from a handful of
cold single-seed runs; this is a baseline to compare against.
