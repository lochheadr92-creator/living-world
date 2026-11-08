# Rules 172: the recruit cap counts help the asker has heard (9 November 2026)

Contract: `docs/HEARD_HELPERS.md`.
Repo `living-world-integrate`, `main`. Recorded from a clean detached checkout of `87d6a315` (`C:\dev\Claude Experiment\living-world-v172-pin`). Both arms' provenance: `head` `87d6a315d4ec96cb518274cef08e283d3922288c`, `dirty` false, `modified` empty.

That checkout is the pin, before the `stageOf` test fix `228d62dc`. The fix did not change `src/`. This lab runs `src/`.

## Files

- `versions-report.txt` — `scripts/lab_versions.ts` on the two arms. This is the comparison to quote.
- `lab171/provenance.json` and `lab172/provenance.json` — one provenance object each. `head`, `dirty` and `modified` are the top-level fields.
- The twelve `lab_*.jsonl` seed files stay untracked, as in `known-home-20261109`.
- Each arm's own `report.txt` stays in Temp (`lw172-lab171`, `lw172-lab172`). Those files are the within-arm nudge comparison, and most of each file is a repeated provenance blob. They are not the version comparison.

## Lab

Launched 2026-11-09 03:09:52 local from the clean worktree via a one-shot scheduled task. The scheduled PowerShell was created suspended and was resumed once before it started the two arms. The rules 172 `report.txt` was written at 03:29:28 and the rules 171 `report.txt` at 03:29:46. The version comparison was written at 03:30:27 from the same worktree and exited 0.

12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on, dynamics rich. Rules 171 rows have `rulesVersion` 171 and `rulesPinned` true. Rules 172 rows have `rulesVersion` 172 and no `rulesPinned` field. Both arms finished 12 of 12 seeds, three arms each (`control`, `nudge:1`, `nudge:2`), plus a `done` row.

`versions-report.txt` ends: nothing moved by more than a single draw moves it.

Every listed metric is not distinguishable from chance. The largest printed difference is prepUnits -1.3, inside a noise floor of ±52.3. No row is called larger than chance, and none is marked systematic. `scripts/lab_versions.ts` says an effect smaller than the noise floor is never called larger than chance. The noise floor is in `versions-report.txt`. No benefit or harm is claimed.

The full suite was not rerun for this step.

The 8,000-tick aspen pin and the `stageOf` follow-up are not this result. They are recorded in `docs/HEARD_HELPERS.md`.
