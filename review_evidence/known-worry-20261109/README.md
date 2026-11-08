# Rules 170: a worry about someone gone stays until the death is known (9 November 2026)

Contract: `docs/KNOWN_WORRY.md`.
Repo `living-world-integrate`, `main`. Recorded from a clean detached checkout of `ba3c549f` (`C:\dev\Claude Experiment\living-world-v170-pin`). Both arms' provenance: `head` `ba3c549fc93134ed230d75ee1bdf6624fe90ee9b`, `dirty` false, `modified` empty.

## Files

- `versions-report.txt` — `scripts/lab_versions.ts` on the two arms. This is the comparison to quote.
- `lab169/provenance.json` and `lab170/provenance.json` — one provenance object each. `head`, `dirty` and `modified` are the top-level fields.
- The twelve `lab_*.jsonl` seed files stay untracked, as in `seen-stock-20261109`.
- Each arm's own `report.txt` stays in Temp (`lw170-lab169`, `lw170-lab170`). Those files are the within-arm nudge comparison, and most of each file is a repeated provenance blob. They are not the version comparison.

## Lab

Launched 2026-11-09 02:28 local from the clean worktree via a one-shot scheduled task. Both arms' `report.txt` files were written at 02:46:33 and 02:46:36. The version comparison was written at 02:47:13 from the same worktree and exited 0.

12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich. Rules 169 rows have `rulesVersion` 169 and `rulesPinned` true. Rules 170 rows have `rulesVersion` 170 and no `rulesPinned` field. Both arms finished 12 of 12 seeds, three arms each (`control`, `nudge:1`, `nudge:2`), plus a `done` row.

`versions-report.txt` ends: nothing moved by more than a single draw moves it.

Every listed metric differs by 0, with up/down 0/0 and the verdict "not distinguishable from chance". `scripts/lab_versions.ts` says an effect smaller than the noise floor is never called larger than chance. The noise floor is in `versions-report.txt`. No benefit or harm is claimed.

The full suite was not rerun for this step.

The six-seed death probe (birch, forest, meadow, river, aspen, cedar, 24,000 ticks, no deaths) and the 32,000-tick birch pin are not this result. They are recorded in `docs/KNOWN_WORRY.md`.
