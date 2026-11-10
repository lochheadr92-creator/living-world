# Diagnose and repair, 11 November 2026: evidence

Record: `docs/REPAIRS_20261111.md`. Rules 190 (`docs/GRAVE_SITE.md`), 191 (`docs/LAYOUT_WORDS.md`), 192 (`docs/KNOWN_FIRST_STOREHOUSE.md`). Stream: repair.
Every probe here is DIAGNOSTIC: it steps an ordinary world and reads it; it stages nothing and is not itself evidence of ordinary behaviour beyond what it reads.

## Folders

- `probe/`: `diag_probe.ts` (invariants every 300 ticks, pre-death state, long blocks; run from the integrate checkout at `f918bf18`, rules 188, 12 seeds, 45 days),
  its outputs `diag_<seed>.json`, the death analysis `analysis.txt` (`analyse.mjs`), `diag-summary-r188.txt`; `door_probe.ts`, `door_scan.ts`, `child_probe.ts`,
  `dup_probe.ts`, `reach191.ts`, `reach192.ts` and `reach-191-192.txt`.
- `doorscan/`: `door_scan.ts` over 12 seeds, 45 days, from clean checkouts: `doorscan-r188-45d.txt` (`living-world-v183-pin` at `6254dc9b`) and
  `doorscan-r192-45d.txt` (`living-world-v190-pin` at `8ad697bd`).
- `twins/`: `scripts/ab_probe.ts` and `ab_compare.ts`, 12 seeds, Normal, 25 days, arrivals on, control arm, 24 processes at once, from the clean pin worktree:
  `r188-r190` (at `7e984634`), `r190-r191` and `r191-r192` (at `4a4d5823`), `r190-r191-strip` (`--strip-layout`, the six seeds that parted, at `8ad697bd`).
- `lab192/`: `scripts/lab.mjs` twice from the clean worktree at `8ad697bd` (`provenance.json`: `dirty` false, `modified` empty), 12 seeds, Normal, fork 0, 25 days,
  arrivals on, `nudge:1,nudge:2`; `r191/` with `--rules 191`, `r192/` current; `versions-report.txt` from `scripts/lab_versions.ts`.
- Suite: `suite-baseline-summary.txt` and `suite-baseline-failing.txt` at `f918bf18`; `suite-head.log` and `suite-head-failing.txt` at the head;
  `suite-head-timeouts-alone.log` (the six load-timeout files together: five pass, `lab_defaults` does not); `suite-head-lab-defaults-alone.log`.
- `pin190.log`, `pin191.log`, `pin192.log`: the `--write` runs from the clean worktree.

## Headline numbers

- Rules 188, 12 seeds, 45 days: 187 deaths (hunger 63, exposure 43, wolf 31, fever 21, thirst 17, injuries 12); conservation, tools, claims, carts, meals, registry
  and needs raised nothing. Four graves on home doors in three seeds; four people shut in, all four dead of thirst; one more home sealed empty.
- Rules 192, same scan: no grave on a door, nobody refused an exit.
- Twins: 188 v 190 identical 9 of 12 (aspen, birch, meadow part); 190 v 191 identical 6 of 12 with every outcome equal, and 6 of 6 identical with the line's
  ending stripped; 191 v 192 identical 0 of 12. Conservation 24 of 24 in every pair.
- Lab 191 v 192: nothing moved by more than a single draw moves it; five rows systematic inside their floors (first yard day +3.0, projects done -4.6,
  prep units -19.4, buildings -1.1, projects adopted -4.7).

The earlier door-scan batches run from the integrate checkout while it was being edited are not kept here; the clean reruns above replace them.
