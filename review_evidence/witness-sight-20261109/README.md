# Rules 183 against 182: a witness has to be able to see (gap G17)

Change: at a theft (`misdeeds.ts`), a gift, help or quarrel (`social.ts` `witness`) and a birth, death, partnership or taking-in (`reputation.ts` `noteDeedNear`), a person counts as a
witness only if they are in the same space as the one who acted and within the smaller of the old radius and their own sense radius (`src/sim/witness_sight.ts`). Contract:
`docs/GAP_LEDGER.md`, "G17". Record: `docs/WITNESS_SIGHT.md`.

## Pre-stated comparison and what was run

Stated before any run: the version-twin probe first (12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 182 and 183, rules number masked, two processes at a
time, clean worktree pinned to a commit); the lab (control plus `nudge:1`, `nudge:2`, `scripts/lab_versions.ts`, rules 182 pinned) reports people, deaths, mean mood and stories heard against
the noise floor if any seed parts. All twelve seeds parted, so both were run.

## Twin

Clean worktree `living-world-v183-pin` at `44e8af3b` (`dirty` false; it holds rules 183 and 184, and runs 182 and 183 by version), 2026-11-10 00:31 to 01:02, two node processes at a time, from
`run-twin.ps1` in this folder (`-Pairs 182,183,184`; this is the first pair). `twelve/ab-compare.txt`: the final world is identical at 182 and 183 in 0 of 12 seeds; conservation and the tool
registry hold in all 24 runs. One world per seed is one chaotic draw, so its alive, deaths, hunger and mood columns are not evidence of an effect: deaths rose in some seeds (aspen 14 to 25, birch
7 to 19) and fell in others (cedar 12 to 7, meadow 14 to 3).

## Lab

Same worktree and commit, 2026-11-10 01:02 to 02:38, two node processes at a time, from `run-lab.ps1` (other runs alongside, so slower than a quiet machine). Both arms are pinned by version
(`--rules 182` and `--rules 183`) on the code of `44e8af3b`, which runs every version through 184; each pin is held by the continuation pins. 12 seeds (aspen, birch, cedar, fern, gen-1
through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich, three arms each (`control`, `nudge:1`, `nudge:2`). Both arms finished 12 of 12 seeds.
Both provenance files: `head` `44e8af3b`, `dirty` false, `modified` empty (`lab182/provenance.json`, `lab183/provenance.json`). The twelve `lab_*.jsonl` per arm stay untracked.
`scripts/lab_versions.ts` exited 0 at 02:38:37 (`lab-status.txt`).

`versions-report.txt` ends: nothing moved by more than a single draw moves it. Four rows are systematic and inside the noise floor and are not called larger than chance: plots +0.9
([+0.2, +1.6], up 7 down 5, floor ±3.3), first yard day +1.1 ([+0.2, +2.2], 8/2, ±5.2), the count of people in low mood +2.0 ([+0.5, +3.6], 10/2, ±5.0) and specialisation 0. People 23.3 against
23.6 (interval [-1.0, +1.7], floor ±5.9), deaths 8.6 against 8.4 ([-1.7, +1.3], ±5.5), mean hunger 48.5 against 46.2 ([-6.2, +1.5], ±7.8) and mean mood -20.8 against -24.4 ([-7.9, +0.5], ±10.4)
are not distinguishable from chance. The lab does not show a cause for the low-mood row. No benefit or harm is claimed.

## Not run

The Large profile, and a count of stories heard (not a lab metric).
