# Rules 169: a glance at a store remembers kinds and fullness, not exact counts (9 November 2026)

Contract: `docs/SEEN_STOCK.md`.
Repo `living-world-integrate`, `main`. Recorded from a clean detached checkout of `c9949b86` (`C:\dev\Claude Experiment\living-world-v169-pin`). Both arms' provenance: `head` `c9949b8624fd4553cbcd002aa415438f985f127a`, `dirty` false, `modified` empty.

## Files

- `versions-report.txt` — `scripts/lab_versions.ts` on the two arms. This is the comparison to quote.
- `lab168/provenance.json` and `lab169/provenance.json` — one provenance object each. `head`, `dirty` and `modified` are the top-level fields.
- The twelve `lab_*.jsonl` seed files stay untracked, as in `known-handover-20261109`.
- Each arm's own `report.txt` stays in Temp (`lw169-lab168`, `lw169-lab169`). Those files are the within-arm nudge comparison, and most of each file is a repeated provenance blob. They are not the version comparison.

## Lab

Both arms' `report.txt` files were written at 02:17:51 and 02:18:06 on 9 November 2026. The version comparison was written at 02:21:35 from the clean worktree and exited 0. The command was `node node_modules\vite-node\dist\cli.mjs scripts/lab_versions.ts --` on `C:\Users\RJLoc\AppData\Local\Temp\lw169-lab168` and `lw169-lab169`.

12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich. Rules 168 rows have `rulesVersion` 168 and `rulesPinned` true. Rules 169 rows have `rulesVersion` 169 and no `rulesPinned` field. Both arms finished 12 of 12 seeds.

`versions-report.txt` ends: nothing moved by more than a single draw moves it.

Eight rows are systematic and stay inside the noise floor: prepAdopted +7.7 (floor ±12.7), prepSeason -1.6 (±2.5), prepHardship +9.3 (±12.2), prepDone +3.4 (±3.7), prepDropped +4.1 (±13.1), prepUnits +39.3 (±47.8), prepDays +1.1 (±3.5), bitesTaken +3.3 (±8.9). `scripts/lab_versions.ts` says an effect smaller than the noise floor is never called larger than chance. The other listed metrics are not distinguishable from chance. No benefit or harm is claimed.

The full suite was not rerun for this step.

A 2-day meadow smoke launched from `living-world-v170-pin` is not this result.
