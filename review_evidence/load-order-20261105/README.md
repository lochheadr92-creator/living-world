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
- **Not changed:** the live simulation. Rules 160 (the same sort, gated by rules version, with a loaded world unsorted below 160) is published
  on the owner's instruction; its live behaviour is unchanged by test (`live-unchanged.ts`, three ordinary worlds).

## Mechanism not traced

The original diagnosis (Brain priority findings) described the differing item as one person's by-kind memory index, equal in value and array order
but different in object key order. This A/B shows the loaded grid order is sufficient for the mismatch and that sorting removes it; I did not trace how
grid order reaches that index, so the path between them is unexplained.

## Mistake in the harness

The watcher I wrote to wait for the runs looked for a day-21 line in B's log, but the driver stops at day 19, so it ran on after both
runs had finished. It affected no result.

## Rules 160 (published, 5 November 2026)

The repair the A/B points at: `src/app/save.ts` sorts each loaded grid cell by id when `runsRulesVersion(w, 160)`; below 160 a loaded
world keeps its recorded order (so rules 159 and earlier replay exactly as before). Lab removal: none needed, the sort has no behaviour of its own.

- **Live behaviour unchanged** (`live-unchanged.ts`, `live-unchanged-{forest,meadow,river}.log`): Normal worlds run 5 days at rules 159 and 160 are
  identical except for the version label, no first-difference tick.
- **Twin runs, rules 159 and 160** (`twin-days.ts`, `twin-large-river-r159.*`, `twin-large-river-r160.*`): 30-day Large river, exact twin compared
  every day. Both match on all 30 days. So the 159 control is a **null** for the mismatch: it does not fail either way, which is why the A/B above
  at rules 153 was needed.
- **Tests:** `tests/load_order.test.ts`, 3 tests (id-ordered cells at 160 after load; old order kept at 159; an ordinary river world's cells equal
  and a 2-day exact twin). Immutable continuation reference for 160 recorded (`a7f15a66`).
- **Full suite** (`../agent-20261105-160/suite/`): 2,908 tests, 2,898 pass, 7 fail, 3 pending. The failures are the known load-only timeouts:
  `lab_defaults` (3), `lab_report` (2), `zz_review_g_observer_purity` (1), `zz_review_main_toolreport_saves` (1) and a 10 s hook timeout in
  `zz_review_h_retention`. **Isolated rerun on a quiet machine** (`../agent-20261105-160/isolated/rerun-quiet.log`): those files plus
  `zz_review_b_observer_purity` and `load_order`, 7 files, 16 of 16 pass, exit 0.
- **Not claimed:** any behavioural benefit. This changes only a loaded world's internal ordering, so a loaded copy replays like the live one.
