# Rules 171: a home is what the searcher was told (9 November 2026)

Contract: `docs/KNOWN_HOME.md`.
Repo `living-world-integrate`, `main`. Recorded from a clean detached checkout of `611a06fc` (`C:\dev\Claude Experiment\living-world-v171-pin`). Both arms' provenance: `head` `611a06fc33757759646dc98e3657c3836a44b4ad`, `dirty` false, `modified` empty.

## Files

- `versions-report.txt` — `scripts/lab_versions.ts` on the two arms. This is the comparison to quote.
- `lab170/provenance.json` and `lab171/provenance.json` — one provenance object each. `head`, `dirty` and `modified` are the top-level fields.
- The twelve `lab_*.jsonl` seed files stay untracked, as in `known-worry-20261109`.
- Each arm's own `report.txt` stays in Temp (`lw171-lab170`, `lw171-lab171`). Those files are the within-arm nudge comparison, and most of each file is a repeated provenance blob. They are not the version comparison.

## Lab

Launched 2026-11-09 02:47:55 local from the clean worktree via a one-shot scheduled task. Both arms' `report.txt` files were written at 03:06:32 and 03:06:52. The version comparison was written at 03:07:37 from the same worktree and exited 0.

12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich. Rules 170 rows have `rulesVersion` 170 and `rulesPinned` true. Rules 171 rows have `rulesVersion` 171 and no `rulesPinned` field. Both arms finished 12 of 12 seeds, three arms each (`control`, `nudge:1`, `nudge:2`), plus a `done` row.

`versions-report.txt` ends: nothing moved by more than a single draw moves it.

Plots differ by +0.6 (interval [+0.2, +1.1], up/down 8/1) and stay inside the noise floor (±4.0). That row is systematic and is not called larger than chance. Every other listed metric is not distinguishable from chance. `scripts/lab_versions.ts` says an effect smaller than the noise floor is never called larger than chance. The noise floor is in `versions-report.txt`. No benefit or harm is claimed.

The full suite was not rerun for this step.

The 12,000-tick forest pin is not this result. It is recorded in `docs/KNOWN_HOME.md`.
