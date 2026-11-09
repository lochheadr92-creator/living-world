# Rules 178 against 177: the recruit candidate's "enough hands already" refusal (gap G30)

Change: the refusal in `social.ts` (`case 'recruit'`) counts the hands the candidate knows of (`src/sim/known_hands.ts`) instead of
`helpersOn`, every living person's commitment. Contract: `docs/GAP_LEDGER.md`, "G30". Record: `docs/KNOWN_HANDS.md`.

## Pre-stated comparison and what was run

Stated before any run: the version-twin probe first (12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 177 and 178,
rules number masked in the hash, two processes at a time, clean worktree pinned to the commit); the lab (control plus `nudge:1`, `nudge:2`,
`scripts/lab_versions.ts`) only if a seed parts. None parted.

Run: clean worktree `living-world-v177-pin` at `df14f8cf` (`dirty` false), 2026-11-09 19:17 to 19:44, two node processes at a time, started from
the PowerShell script `run-twin.ps1` in this folder in the foreground session. No scheduled task, no hidden window.

## Result

`twelve/ab-compare.txt`: the final world is identical at 177 and 178 in 12 of 12 seeds; conservation and the tool registry hold in all 24 runs.
The first line of that file names the temporary directory the run wrote to; the JSON files here are copies.

A null result and a bound, not a benefit. The refusal is unreachable in ordinary worlds of this length: in birch, forest and river no site holds
more than 2 helpers in 12,000 ticks against a cap of about 4. It says nothing about worlds where crews do reach the cap. No benefit or harm is claimed.

## Not run

The lab's nudge arms and noise floor, and the Large profile. Neither can differ from zero where the final worlds are identical.
