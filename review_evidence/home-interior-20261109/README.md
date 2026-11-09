# Rules 184 against 183: the contents of a home are learned from inside or at the door (gap G19)

Change: when a person sees a hut or house from outside and is not within two tiles of it, `observe` keeps what they already believed of its store, racked tools, textile stock and gear
stock instead of copying the true contents (`src/sim/home_interior.ts`). Existence, type, household and condition are still learned from outside; stores and workplaces are not touched.
Contract: `docs/GAP_LEDGER.md`, "G19 (rules 184)". Record: `docs/HOME_INTERIOR.md`.

## Pre-stated comparison and what was run

Stated before any run: the version-twin probe first (12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 183 and 184, rules number masked, two processes at a
time, clean worktree pinned to a commit); the lab (control plus `nudge:1`, `nudge:2`, `scripts/lab_versions.ts`, rules 183 pinned) reports people, deaths, mean hunger and thefts against the
noise floor if any seed parts. All twelve seeds parted, so both were run. Thefts are not a lab metric and were not counted.

## Twin

Clean worktree `living-world-v183-pin` at `44e8af3b` (`dirty` false), 2026-11-10 01:01 to 01:39, two node processes at a time, from `run-twin.ps1` in this folder
(`-Pairs 182,183,184`; this is the second pair), with other runs alongside. `twelve/ab-compare.txt`: the final world is identical at 183 and 184 in 0 of 12 seeds; conservation and the tool
registry hold in all 24 runs. One world per seed is one chaotic draw, so its columns are not evidence of an effect.

## Lab

Same worktree and commit. The first attempt (`run-lab-first-attempt.ps1`, started 2026-11-10 02:38) pinned both arms with `--rules`; the 183 arm finished 12 of 12 seeds, and every 184 arm
failed at launch because `scripts/lab/guard.ts` refuses `--rules N` when N is the current version of the checkout. The empty 184 files and their errors were then overwritten by a rerun of the
184 arm alone, current and unpinned (`run-lab-184-arm.ps1`, driven by `run-lab-184-arm-wrapper.ps1`), 04:04 to 04:49, two workers side by side, same worktree, same seeds, same flags; the
comparison was run at 04:51 and exited 0 (`lab-status-final.txt`). The first-attempt status file is kept as `lab-status-first-attempt.txt`.

12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich, three arms each (`control`, `nudge:1`, `nudge:2`).
Rules 183 rows have `rulesVersion` 183 and `rulesPinned` true; rules 184 rows have `rulesVersion` 184 and no `rulesPinned` field. Both arms finished 12 of 12 seeds. Both provenance files: `head`
`44e8af3b`, `dirty` false, `modified` empty (`lab183/provenance.json`, `lab184/provenance.json`). The twelve `lab_*.jsonl` per arm stay untracked.

`versions-report.txt` ends: nothing moved by more than a single draw moves it. Seven rows are systematic and inside the noise floor and are not called larger than chance: workplaces +0.5
(9 of 12 draws up), below critical -1.2 (3/8, floor ±2.6), first yard day -1.4 (4/7, ±5.5), mean mood +3.2 ([+0.3, +6.0], 8/4, ±10.3), the count in low mood -1.9 ([-3.3, -0.8], 1/9, ±3.2), mean
condition +2.3 ([+0.1, +4.8], 8/4, ±8.8) and home food per person +0.1. People 23.6 against 22.8 (interval [-2.1, +0.5], floor ±5.5), deaths 8.4 against 9.2 ([-0.8, +2.6], ±5.2) and mean hunger 46.2
against 48.7 ([-1.2, +6.6], ±6.2) are not distinguishable from chance. The mood rows lean the opposite way to the 182-to-183 comparison, which shifted the same rows the other way; the lab does not show a
cause for either. No benefit or harm is claimed.

## Not run

The Large profile, and a count of thefts or of what a person believed of a home's stock.
