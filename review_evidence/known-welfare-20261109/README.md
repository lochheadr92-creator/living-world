# Rules 179 against 178: a worry about someone out of sight follows what the worrier knows (gap G31)

Change: `welfare.ts` keeps or drops a remote subject's worry, and counts them as someone who cannot manage alone, from age and from what the worry says
was seen (`src/sim/known_welfare.ts`), not from the subject's live health and life event. Contract: `docs/GAP_LEDGER.md`, "G31". Record:
`docs/KNOWN_WELFARE.md`.

## Pre-stated comparison and what was run

Stated before any run: the version-twin probe first (12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 178 and 179, rules
number masked in the hash, two processes at a time, clean worktree pinned to the commit); the lab (control plus `nudge:1`, `nudge:2`,
`scripts/lab_versions.ts`, rules 178 pinned with `--rules 178`) if a seed parts. Eleven of twelve seeds parted, so both were run.

## Twin

Clean worktree `living-world-v177-pin` at `472e1ebb` (`dirty` false), 2026-11-09 19:52 to 20:23, two node processes at a time, from `run-twin.ps1`
in this folder, run in the foreground session. No scheduled task, no hidden window.

`twelve/ab-compare.txt`: the final world is identical at 178 and 179 in 1 of 12 seeds (gen-6); conservation and the tool registry hold in all 12
pairs. A single world per seed is one chaotic draw, so the alive, deaths, hunger and mood columns in that file are not evidence of an effect. The first
line of that file names the temporary directory the run wrote to; the JSON files here are copies.

## Lab

Same clean worktree at `472e1ebb`, 2026-11-09 20:24 to 21:43, two node processes at a time, from `run-lab.ps1`. 12 seeds (aspen, birch, cedar, fern,
gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich, three arms each (`control`, `nudge:1`,
`nudge:2`). Rules 178 rows have `rulesVersion` 178 and `rulesPinned` true; rules 179 rows have `rulesVersion` 179 and no `rulesPinned` field. Both arms
finished 12 of 12 seeds. Both provenance files: `head` `472e1ebb14209b51976919ed68ff0d7a5c4773f2`, `dirty` false, `modified` empty
(`lab178/provenance.json`, `lab179/provenance.json`). The twelve `lab_*.jsonl` files per arm stay untracked. `scripts/lab_versions.ts` exited 0 at
21:43:40 (`lab-status.txt`).

`versions-report.txt` ends: nothing moved by more than a single draw moves it. Four rows are systematic and inside the noise floor: buildings -0.8
([-1.7, 0], down 10 of 12, floor ±3.6), specialisation 0, topKindShare 0 and homeFoodPerPerson -0.1. Every other listed metric is not distinguishable
from chance. People 23.5 against 23.5, deaths 8.5 against 8.3 (interval [-1.3, +0.8], floor ±4.4), mean hunger 50.7 against 49.3 (interval [-4.3, +1.5],
floor ±8.0). `scripts/lab_versions.ts` says an effect smaller than the noise floor is never called larger than chance. No benefit or harm is claimed.

## Not run

The Large profile. The full suite for this version is recorded in `docs/KNOWN_WELFARE.md`.
