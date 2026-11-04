# Large River exact-twin mismatch: frozen-source A/B at rules 153 (5 November 2026)

Brain priority findings, last item ("evidence quality: Large River exact-twin discrepancy"). Earlier candidate:
`../bykind-order-20261105/` found that a loaded world rebuilds its static spatial grid by kind (sources, buildings, sites, ...),
where a live world's cells are in ascending id order. That was a candidate only: a 30-day Large river twin run at rules 159
matched exactly with no fix, and I had wrongly written "cause found" before correcting it (`46e77b10`).

## Question

Does the grid order explain the original mismatch? Test it on the investigation's own source and driver, changing one thing.

## Design

- **A:** the unchanged frozen rules-153 source (`79e3ac40`) with the investigation's own `repro.ts` (`npx vite-node repro.ts -- large river`).
  It plays 19 days of the Large river world and an exact twin, with a daily purity check and an exact-twin comparison each day.
- **B:** a byte-for-byte copy of A plus one line in `src/app/save.ts`, after the grid is rebuilt on load:
  `for (const cell of w.grid.cells) cell.sort((a, b) => a.id - b.id);` (`ab-frozen-153/A-vs-B.save.diff`; `repro.ts` is identical in both,
  and no other file in `src/` differs).
- Both ran at once on this machine, about 32 s per simulated day.

## Result

| | Outcome |
|---|---|
| **A** (unchanged) | `Error: Twin mismatch captured at 45600` after the day-18 observation (1,074 s). This is the original failure at the original tick, day 19. |
| **B** (grid cells sorted by id on load) | Passes the whole 19 days: the driver throws on any purity or twin mismatch, and it also ran its closing 120-tick saved-continuation and frozen-source checks without throwing. `complete: true`, 125 people, 99 founders alive (1,162 s). B left no `progress.json`, so its check counts are not recorded. |

Files in `ab-frozen-153/`: `A.run.log`, `A.run.err`, `B.run.log`, `B.run.err` (empty), `A.progress.json`, `A-vs-B.save.diff`, `repro.ts`.
A's 20 MB world dumps (`twin-mismatch.json`, `observed-mismatch.json`, `equal-day18.json`, `initial.json`) stay outside git;
sha256 in `A.large-files.sha256`.

## What this shows, and what it does not

- **Shown:** in this world, the loaded-versus-live ordering of the spatial grid is sufficient to produce the twin mismatch at tick 45,600,
  and sorting the loaded cells by id removes it. The one-line change is the only difference between a failing and a passing run.
  Both runs are deterministic, so a single run each is a complete answer for this world and this source.
- **Not shown:** that this is the only cause of twin mismatches. The 30-day Large river run at rules 159 matched exactly without any fix,
  so a different trajectory does not always reach a state where the order matters. One world, one seed.
- **Not changed:** the live simulation. Rules 160 (the same sort, gated by rules version, with a loaded world unsorted below 160) is on
  branch `load-order` and unpublished; its live behaviour is unchanged by test (`live-unchanged.ts`, three ordinary worlds).
  Whether to publish it is the owner's decision.

## Mistake in the harness

The watcher I wrote to wait for the runs looked for a day-21 line in B's log, but the driver stops at day 19, so it ran on after both
runs had finished. It affected no result.
