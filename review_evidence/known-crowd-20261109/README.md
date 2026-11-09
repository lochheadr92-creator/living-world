# Rules 181 against 180: the hall crowd is the people one knows of (gap G154)

Change: `facilityWants` in `production.ts` lets a crowd open the hall want without a yard. At 181 the person feels a crowd when they know of at least 24 people
(themselves and each relation whose death they have not learned, `src/sim/known_crowd.ts`), not when 24 are alive anywhere in the world. Contract:
`docs/GAP_LEDGER.md`, "G154". Record: `docs/KNOWN_CROWD.md`.

## Pre-stated comparison and what was run

Stated before any run: the version-twin probe first (12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 180 and 181, rules number masked in
the hash, two processes at a time, clean worktree pinned to a commit); the lab (control plus `nudge:1`, `nudge:2`, `scripts/lab_versions.ts`, rules 180 pinned) only if
a seed parts. None parted.

Run: clean worktree `living-world-v177-pin` at `f26cadcb` (`dirty` false; it contains rules 181 and the tooling change that followed it), 2026-11-09 23:19 to 23:50, two
node processes at a time, from `run-twin.ps1` in this folder (the generic runner used for several pairs; this pair was `-Pairs 180,181`), in the foreground session. No
scheduled task, no hidden window. Four other node processes were running alongside (the rules 179-versus-180 lab), so wall times are slower than a quiet machine.

## Result

`twelve/ab-compare.txt`: the final world is identical at 180 and 181 in 12 of 12 seeds; conservation and the tool registry hold in all 24 runs. The first line of that
file names the temporary directory the run wrote to; the JSON files here are copies.

A null result and a bound, not a benefit. A probe of ordinary birch at rules 181 found that from tick 38,551 (day 16) the live count and a person's own count fall on
opposite sides of 24, so the changed branch is reachable in a 25-day world, yet the twelve final worlds are identical. Why was not traced: the other conditions of the hall
want (three solid homes, no food shortage, the hall not already known) may simply not have held when the count differed. It says nothing about longer worlds or the Large
profile. No benefit or harm is claimed.

## Not run

The lab's nudge arms and noise floor, and the Large profile. Neither can differ from zero where the final worlds are identical.
