# Rules 185 against 184: a township records how far its building has reached (gap G150, first slice)

Change, contract and record: `docs/TOWNSHIP_EXTENT.md`, `docs/GAP_LEDGER.md` ("G150 first slice"). Stream: gap. Baseline: rules 184 pinned with the probe's rules argument on the
same candidate tree. Candidate: `c5c41313` (rules 185). `dirty=false`.

## Pre-stated comparison and what was run

Stated before the run: the version twin on the 12 seeds (Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 184 and 185, rules number masked) with the new key
stripped before hashing (`--strip-extent`). The final world must be identical in 12 of 12 seeds. If any seed parts, the change is not decision-neutral and the lab runs.

Run: clean worktree `living-world-v183-pin` at `c5c41313`, 2026-11-10 08:02 to 08:09, `run-twin.ps1` in this folder, 25 processes at once in a hidden window (decision D-1).
The 25th is birch at 185 without the strip.

## Result

`twelve/ab-compare.txt`: identical at 184 and 185 in 12 of 12 seeds; conservation and the tool registry hold in all 24 runs. Birch at 185 without the strip hashes to
`072db822d6241a39` against `cb1cfb20deaa5d23` with it.

## Defect in the run

`run-twin.ps1` passed the output path to `Start-Process` unquoted. The path has a space, so each probe wrote its JSON to a file named `C:\dev\Claude` and the later arguments
shifted. `--strip-extent` was still read (the probe looks for it anywhere in its arguments), and the seed, days and rules arguments come before the path, so the runs themselves
were as stated: each `.log` names its seed and rules version. The stray file was deleted. The per-run JSON files were not kept, `scripts/ab_compare.ts` could not run (exit 1), and
`twelve/ab-compare.txt` was built from the last line of each `.log`. The script in this folder is kept as run. Quote the path, or write to a path with no space, before reusing it.

## Other files

`first-extent-probe.ts`: read-only probe for the first tick with an extent (birch 3,486; river 924).

## Limits

The strip removes every `"extent":{...}` key with no nested braces; no other such key exists in `src/sim` or `src/app` at this commit. Twelve 25-day worlds say the dynamics are
unchanged, not that every recorded extent is right. No benefit or harm is claimed.
