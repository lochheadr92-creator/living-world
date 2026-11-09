# Rules 180 against 179: a laid-up person counts an able adult at home only if they can see one (gap G94)

Change: `childrenNeedingWatch` (`responsibilities.ts`) asks whether another adult at home can see to the children. At 180 an adult or elder housemate counts only if the laid-up
person currently sees them and the sight shows neither `hurt` nor `feverish` (`src/sim/known_able.ts`); before 180 it read every housemate's live injury, illness and health.
Contract: `docs/GAP_LEDGER.md`, "G94". Record: `docs/KNOWN_ABLE.md`.

## Pre-stated comparison and what was run

Stated before any run: the version-twin probe first (12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 179 and 180, rules number masked, two processes
at a time, clean worktree pinned to the commit); the lab (control plus `nudge:1`, `nudge:2`, `scripts/lab_versions.ts`, rules 179 pinned with `--rules 179`) if any seed parts. Eleven
of twelve seeds parted, so both were run.

## Twin

Clean worktree `living-world-v180-pin` at `38e0db58` (`dirty` false), 2026-11-09 21:57 to 22:24, two node processes at a time, from `run-twin.ps1` in this folder, in the foreground
session. No scheduled task, no hidden window. `twelve/ab-compare.txt`: the final world is identical at 179 and 180 in 1 of 12 seeds (gen-1); conservation and the tool registry hold in
all 12 pairs. One world per seed is one chaotic draw, so its alive, deaths, hunger and mood columns are not evidence of an effect. Eleven of twelve parting is more than the earlier probe
suggested (it found no laid-up person living with a child in 12,000 ticks of birch, forest or river, sampled every 50 ticks); the other nine seeds were not probed, and the cause of
each parting was not traced.

## Lab

Same clean worktree at `38e0db58`, 2026-11-09 23:06 to 2026-11-10 00:52, two node processes at a time, from `run-lab.ps1` (other runs alongside, so slower than a quiet machine).
12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich, three arms each (`control`, `nudge:1`,
`nudge:2`). Rules 179 rows have `rulesVersion` 179 and `rulesPinned` true; rules 180 rows have `rulesVersion` 180 and no `rulesPinned` field. Both arms finished 12 of 12 seeds. Both
provenance files: `head` `38e0db58`, `dirty` false, `modified` empty (`lab179/provenance.json`, `lab180/provenance.json`). The twelve `lab_*.jsonl` per arm stay untracked.
`scripts/lab_versions.ts` exited 0 at 00:51:47 (`lab-status.txt`).

`versions-report.txt` ends: nothing moved by more than a single draw moves it. No row is called systematic. People 23.5 against 23.2 (interval [-1.4, +0.6], floor ±5.8), deaths 8.3
against 8.6 ([-0.4, +1.2], ±5.6), mean hunger 49.3 against 48.4 ([-2.2, +0.2], ±9.2), mean mood -19.8 against -20.9 ([-2.7, +0.5], ±10.6). Every listed metric is not distinguishable from
chance. No benefit or harm is claimed.

## Not run

The Large profile. The full suite for this version is recorded in `docs/KNOWN_ABLE.md`.
