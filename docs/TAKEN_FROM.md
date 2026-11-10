# What was taken, from where, and where salvage came from: rules 188

Predecessor rules 187 is pinned by `tests/v187_continuation.expected.json`. Origin: gap ledger row G133, first slice, taken in the order the end-to-end trace of 10 November
2026 gave (`docs/END_TO_END_TRACE.md`, links 17 and 32). Stream: gap.

## The gap (every version up to 187)

Taking goods out of a store, a cart or a pile logged "Took 1 item from storage." Nothing else was kept. In ordinary aspen the shared storehouse got its first two stones from
piles left when hut sites were abandoned, one of them two days after a cold snap killed nine people. No record held that.

## The rule (rules 188, rich worlds)

`src/sim/taken_from.ts`, called from the `withdraw` and site delivery actions in `act_resource.ts`.

- The log line names the goods and the place: "Took 1 stone from a pile of abandoned building materials, there since day 24.", "Took 3 grain from the hut."
- The person keeps `lastTaken`: tick, activity, goods, place, and whether it was a pile.
- When goods of a kind taken from a pile within the last half day (1,200 ticks) are delivered to a township's shared project, the participation record keeps a `salvaged`
  line, at most six, each once. The project history prints them: "supplied 8 wood, 2 stone (stone from a pile of abandoned building materials, there since day 24)".

Nothing reads any of it for a decision. Rules 187 and earlier, authored worlds and `setTakenFrom(false)` keep the old line and no record.

## Limits

- Not a transfer ledger: no route, no ownership, one remembered taking per person.
- A stone from a pile and a stone already in the pack are not told apart at delivery.
- Only shared projects keep a salvage line. A hut built from salvage keeps nothing.
- The pile's note says "abandoned building materials", not which building or whose.
- The log line still rolls off the 60-line personal log. The salvage line on the project record stays as long as the project record does.

## Evidence

- Contract tests `tests/taken_from.test.ts` (7 pass).
- `npm run typecheck` passed.
- Immutable pin: `tests/v188_continuation.*` (Normal river, arrivals on, 2,400 ticks then 120 after a save and load; the first remembered taking is at tick 13, "Took 1 wood from the lean to"), recorded from a clean checkout of `f87b4616`.
- Twin: 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts --strip-taken` at 187 and 188 from a clean checkout of `6254dc9b`, 25 processes at once: identical in 12 of 12, conservation and the tool registry hold in all 24 runs. River at 188 without the strip hashes to `7934a58f6d579df2` against `afc3f070c6af3449` with it. `review_evidence/trace-fixes-20261110/r187-r188/`.
- Full suite: one run for rules 186 to 188, clean checkout of `6254dc9b`, default worker pool, 490 s: 567 files, 3,194 tests, 73 failed. The 65 baseline failures are all present by name and none is missing. The other eight tests and one file hook are timeouts under load in six files (`lab_defaults` 3, `lab_report` 2, `lab_provenance` 1, observer purity 1, tool-report saves 1, the `zz_review_h_retention` hook); those six files pass alone at the same commit, 14 of 14 tests in 164 s. No regression. `review_evidence/trace-fixes-20261110/suite-summary.txt`.

No benefit or harm is claimed.
