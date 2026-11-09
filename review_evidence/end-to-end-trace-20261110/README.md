# End-to-end trace, 10 November 2026: the Willowbank storehouse in ordinary aspen

Write-up: `docs/END_TO_END_TRACE.md`. Stream: none. No rules version, no source change, no lab intervention. Everything here is read-only observation of ordinary
worlds (Normal, rich, arrivals on, rules 185) from the clean pinned worktree `living-world-v183-pin` at `f7507b76`, `dirty=false`.

## Files

- `census_probe.ts`, `run-census.ps1`: twelve seeds, 45 days, one process each. `census/census-<seed>.json` holds population by day, deaths with cause, households,
  buildings, open sites, shared projects, the chronicle and every feed event sampled each 200 ticks. `census/status.txt` has the commit and times (380 s). In the census
  files a participant who has died shows as `#id`, and `age` is 0 for everyone: the probe read a field that does not exist. Neither is used in the write-up.
- `trace_probe.ts`, `trace-aspen.json`: aspen stepped once from tick 0. Site changes, shared project records at every change, requests about the sites, each decision
  whose chosen option names the storehouse, quarry or timber yard (with its `because`), up to three decisions a day per key person where a storehouse option was open or
  blocked and something else was chosen, the full personal log of Dax, Petra, Wren, Mona and Isla from day 14, daily weather and needs, and what is left at day 45
  (logs, decision ledgers, relations, civic memories, chronicle, feed, inspector views).
- `stone_probe.ts`, `stone-aspen.json`: aspen stepped again. Where Mona's stone count changed and which pile or store lost a stone at that tick, and what became of the
  wood pile left by the second storehouse site. This reads world state. It is ground truth, not a stored explanation.

## How to rerun

From PowerShell: `powershell -NoProfile -ExecutionPolicy Bypass -File run-census.ps1` (about 6 minutes). The trace and stone probes take about 2.5 minutes each:
copy the `.ts` file to a path with no space, set the working directory to the clean pinned worktree, and run
`node node_modules/vite-node/dist/cli.mjs <probe.ts> -- <out.json>`. The probes import the simulation from the working directory, so they must not be run from a
checkout with uncommitted source edits. The world is deterministic, so a rerun at the same commit gives the same files.

## Method limits

- Inspector and history functions were called on a save and load copy, never on the stepped world. The probes otherwise only read.
- "Passed over" samples are capped at three a day per person and come from the decision record's own alternative and blocked lists, which are themselves truncated.
- The first run of `stone_probe.ts` tracked building stores only and found nothing. The committed version also tracks piles. One output file, from the second run.
- Raw logs of the runs are in `C:\dev\_claude_scratch\trace-20261110` and are not committed.
