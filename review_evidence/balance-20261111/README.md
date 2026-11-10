# Balance stream, 11 November 2026: the survival-pressure rebalance (rules 195) and what it exposed (rules 196)

The owner's brief: rebalance basic survival pressure so ordinary lives have room for social, family, learning and leisure behaviour; measure before changing;
the proposed 0.020/0.025 drains are a hypothesis. Records: `docs/ORDINARY_METABOLISM.md`, `docs/PROJECT_ROOM.md`. Everything here was run from a clean worktree
(`living-world-v194-pin`, moved to the commit named) with `provenance.json` `dirty` false and `modified` empty.

- `screen195/`: the screening lab at rules 195, clean `7eb29a61` (the mechanism commit, rates 0.020/0.025 as the control): `scripts/lab.mjs`, 12 seeds, Normal, fork 0,
  25 days, arrivals on, branches `nudge:1,nudge:2,rates:0.024:0.032,rich-no-metabolism`; `screen/report.txt` is the lab's own report, `versions-194-195screen.txt`
  is `scripts/lab_versions.ts` against the rules-194 baseline in `../repairs-20261111/lab194/r194/`. Decided the moderate rates.
- `twins/r194-r195hyp/`: `scripts/ab_probe.ts` and `ab_compare.ts` at the hypothesis rates (clean `7eb29a61`): 0 of 12 identical, conservation 12 of 12.
- `final/`: the result at the taken rates, clean `09880f79`: `r194/` (`--rules 194`) and `r195/`, each control plus `nudge:1` and `nudge:2`, 12 seeds, 25 days;
  `versions-report.txt` from `scripts/lab_versions.ts`; `twins/` the 194-195 twin (0 of 12 identical, conservation 12 of 12). The rows and verdicts are in the
  record's table.
- `harsh/`: `scripts/harsh_check.ts`, six seeds (aspen, birch, gen-2, gen-5, meadow, river), 25 days, arrivals on, harsh on and off, at 194 and 195.
- `pin195.log`, `pin196.log`: the `--write` runs of the immutable continuations from the clean worktree.
- `suite-head-195.log` (gitignored as a log; the summary is in the record): the full suite from the clean checkout of `09880f79`.
- `final196/`: the 195-196 twin and paired lab (195 pinned against 196), clean `d254d424`.
- `census/`: the mechanism census of the same day (`census.ts`, twelve rows at rules 196, `approach_probe.ts` four rows, `census_sum.py`, `summary.txt`), the evidence of `docs/MECHANISM_CENSUS_20261111.md`.

Not here: the three inhabited lives of the same day (Mona, Alma, Pavel in meadow at rules 193), which were stopped on the owner's word before day 5 and whose
transcripts live only in the session's scratchpad.
