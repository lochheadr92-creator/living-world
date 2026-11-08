# Rules 168: a neighbour is asked to watch a child only if they know the child (9 November 2026)

Contract: `docs/KNOWN_HANDOVER.md`.
Repo `living-world-integrate`, `main`. Recorded from a clean detached checkout of `cd7334e4` (`C:\dev\Claude Experiment\living-world-v168-pin`). Both arms' provenance: `head` `cd7334e44bc40b72ef36c919e9a8f77c0d7cc124`, `dirty` false, `modified` empty.

## Files

- `versions-report.txt` — `scripts/lab_versions.ts` on the two arms. This is the comparison to quote.
- `lab167/provenance.json` and `lab168/provenance.json` — one provenance object each. `head`, `dirty` and `modified` are the top-level fields.
- The twelve `lab_*.jsonl` seed files stay untracked, as in `known-adoption-20261108`.
- Each arm's own `report.txt` stays in Temp (`lw168-lab167`, `lw168-lab168`). Those files are the within-arm nudge comparison, and most of each file is a repeated provenance blob. They are not the version comparison.

## Lab

Launched 2026-11-09 01:01 local from the clean worktree via a one-shot scheduled task. Both arms' `report.txt` files were written at 01:18:41. The version comparison was written at 01:21:13 and exited 0.

The scheduler wrapper died before it could write `labs exit` or run the comparison, so `C:\Users\RJLoc\AppData\Local\Temp\lw168-lab.status` has only the launch lines. The node children were not killed. Each arm has 12 jsonl files, and each file has three finished rows: `control`, `nudge:1`, `nudge:2`. The comparison command, run afterwards from the same worktree, was `scripts/lab_versions.ts` on those two directories.

12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich. Rules 167 rows have `rulesVersion` 167 and `rulesPinned` true. Rules 168 rows have `rulesVersion` 168 and no `rulesPinned` field. Both arms finished 12 of 12 seeds.

`versions-report.txt` ends: nothing moved by more than a single draw moves it.

Every listed metric differs by 0, with up/down 0/0 and the verdict "not distinguishable from chance". `scripts/lab_versions.ts` says an effect smaller than the noise floor is never called larger than chance. The noise floor is in `versions-report.txt`. No benefit or harm is claimed.

The full suite was not rerun for this step.

The six-seed watch probe (forest, birch, meadow, river, aspen, cedar, 72,000 ticks) is not this result. It found no watch request, and it is recorded in `docs/KNOWN_HANDOVER.md`.
