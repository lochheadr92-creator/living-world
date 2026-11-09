# Rules 177 against 176: the granary emergency ration (gap G29)

Change: `hasHungryDependent` in `src/sim/facilities.ts` reads what the person knows of a housemate (`src/sim/known_ration.ts`) instead of the
housemate's live hunger and health. Contract: `docs/GAP_LEDGER.md`, "G29". Record: `docs/KNOWN_RATION.md`.

## Pre-stated comparison and what was run

Stated before any run: twelve seeds (aspen, birch, cedar, fern, gen-1 to gen-6, meadow, river), Normal, 25 days, arrivals on, rules 176 against
rules 177, two workers at most, from a clean worktree pinned to the commit. The contract named the lab (`lab_versions.ts`, control plus two
nudges). Because the change acts only when a granary is withdrawn from, the version-twin probe was run instead: `scripts/ab_probe.ts`, one
control world per seed at each version, rules number masked in the final-state hash. If any seed had parted, the lab with its nudge arms and
noise floor was to be run next. None parted.

Run: clean worktree `living-world-v177-pin` at `fcfedf91` (`dirty` false), 2026-11-09 18:30 to 18:55, two node processes at a time, started from
a PowerShell script in the foreground session, no scheduled task, no hidden window. The script is `run-twin.ps1` in this folder; it starts
`scripts/ab_probe.ts` per seed and version, two at a time.

## Result

`twelve/ab-compare.txt`: the final world is identical at 176 and 177 in 12 of 12 seeds; conservation and the tool registry hold in all 24 runs.
The first line of that file names the temporary directory the run wrote to; the JSON files here are copies.

This is a null result and a bound, not a benefit: in these twelve control worlds the change altered nothing. It does not say the change is
harmless where a granary is reached. Whether a granary was built in these worlds was not measured. No benefit or harm is claimed.

## Not run

The lab's nudge arms (a noise floor) and the Large profile. Neither can differ from zero where the final worlds are identical.
