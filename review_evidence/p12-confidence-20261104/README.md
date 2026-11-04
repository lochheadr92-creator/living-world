# P1.2 teller confidence (rules 154) and rules 155 — 4 November 2026

Branch `p12-teller-confidence` (not on main; awaiting an owner decision). Main stays at `79e3ac40`.

## Rules 154 (P1.2): implemented, staged and rendered checks pass, ordinary benefit null

A told food place from a teller whose checked accounts (rules 107) were not all borne out carries
"won't go on X's word alone (b of c accounts borne out)" scaled by the share not borne out (up to
-10), old hearsay (past 1,800 ticks) carries -4, and doubted tellers' places are passed on less
readily. Owner `src/sim/teller_confidence.ts`; lab removal `rich-no-confidence`. Contract tests
`tests/teller_confidence.test.ts`; rendered check `render6/` (screenshot inspected: the "Why did
they choose it?" panel shows the doubt line). Earlier render attempts are retained as failures.

Measurement (`measurement/`, `scripts/hearsay_trips.ts`, frozen worktree at `6b2b8437`): Normal,
arrivals on, fork day 5 + 20 days, forest/river/meadow, arms control, nudge:1, nudge:2,
rich-no-confidence. All arms conserve.

- Preregistered G (wasted trips to told places per 100 food trips) is higher with the removal on
  every seed (0.56/0.61/0.57 vs 154 arms 0.34-0.45/0.22-0.42/0.05-0.27). Trips to doubted
  tellers' places fall 6-15x; old-hearsay trips roughly halve.
- But told trips are wasted at about the first-hand rate in the removal arm (14.5 vs 21.5%,
  9.3 vs 10.4%, 15.3 vs 14.6%), and doubted tellers' trips at 14-20% (small n). **Total wasted
  food trips per 100 are unchanged** (removal 21.3/10.3/14.7, inside the 154 arms' ranges
  18.4-21.2/10.3-12.6/12.9-14.5). G fell by substitution, not by avoiding bad trips.
- Survivors show no systematic difference. The leisure fixture world (one trajectory) has three
  hunger deaths at 154 that 153 lacks; not attributable from one draw.

Full suite on `6b2b8437` (`suite/`, re-attached after a session interruption): exit 1, 2,869
passed, 7 failed. Four (lab_defaults x2, lab_provenance, two review timeouts) pass in isolation
(contention: 15 simulations ran alongside). `leisure.test.ts` fails: the l-places world at 154
has only home outings in 14 days. `suspended_scan.test.ts` found a real loss, repaired as 155.

## Rules 155: paused care acquisition ending (repaired)

`suspended-loss/trace.ts`: at tick 11,988 of the river scan a suspended well-water fetch for a
dependant was cleared by `cancelCareAcquisition` without the rules-116 common ending. Rules 155
ends it through `endSuspended`. `tests/care_acquisition_ending.test.ts` plus the scan pass. The
same unexercised pattern remains in `care_handback.ts` and `work_handover.ts`.

## Open owner decision

Keep, narrow (doubted-teller weighing only, no old-hearsay cost) or withdraw P1.2. Rules 155 is
independent of P1.2 in substance but numbered after it on this branch. A parallel task in this
checkout (`review_evidence/villager-age-carry-20261104/`) is also awaiting coordination.
