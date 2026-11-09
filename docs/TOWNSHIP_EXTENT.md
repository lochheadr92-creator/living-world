# A township records how far its building has reached: rules 185

Predecessor rules 184 is pinned by `tests/v184_continuation.expected.json`. Origin: gap ledger row G150 (`docs/GAP_LEDGER.md`), first slice only. One rules version for one change.
Stream: gap (`docs/RULES_RANGES.md`, range 185 to 189).

## The gap (every version up to 184)

A township was a name, a centre point, a founding tick and an optional relocation origin (`townships.ts`). Membership is the household's `townshipId`. Nothing recorded where a
township's buildings stood. `townAt` (`settlement_economy.ts`) guesses a township from a hard-coded 20 tiles of its centre.

## The rule (rules 185, rich worlds)

When `completeSite` (`buildings.ts`) finishes a new building, or rebuilds a home in place, `noteBuilt` (`src/sim/township_extent.ts`) grows `Township.extent` to cover the
footprint: `x0`, `y0`, `x1`, `y1` (inclusive tiles), `finished` (completions counted) and `updated` (tick). The township is the owning household's. For a public building it is the
township of the shared project behind the site. The civic history (`history.ts`, `civicHistory`) shows one line with the size, the corners, the count and the words "this is not a border".

It allocates no id and draws no random number. Rules 184 and earlier, authored worlds and `setTownshipExtent(false)` keep no extent. The lab name for the removal would be
`rich-no-township-extent`; it is not registered in `scripts/lab/lab.ts`, which another session holds with uncommitted edits.

## Limits

- A high-water record. Buildings a world started with and buildings finished before 185 are not counted. A destroyed building does not shrink it.
- A fire counts: it is a site that is finished. A hearth fitted into a standing home does not.
- A public building with no project behind it is attributed to no township, because nearness is not membership.
- It is not a border. It grants nothing and refuses nobody (decision D5 keeps territory and exclusion out of scope). `townAt` still uses its 20 tiles.
- Nothing reads it for a decision.

## Evidence

- Contract tests `tests/township_extent.test.ts` (8 pass). The tests at 185 assert a record that the 184 and switch-off tests assert absent. A run with the rule disabled was not made.
- `npm run typecheck` passed in the integrate checkout.
- Immutable pin `tests/v185_continuation.*` (Normal river, arrivals on, 2,400 ticks then 120 after a save and load; a township first holds an extent at tick 924), recorded from a
  clean checkout of `2914bf59` (probe and write gave the same digests). The pin test passes. In ordinary birch the first extent appears at tick 3,486.
- Twin with the extent stripped before hashing, 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts --strip-extent` at 184 and 185 from a clean checkout of
  `c5c41313`, 25 processes at once: the final world is identical in 12 of 12 seeds; conservation and the tool registry hold in all 24 runs. Birch at 185 without the strip gives a
  different hash, so the strip is what makes them equal. `review_evidence/township-extent-20261110/`.
- Full suite: clean checkout of `f7507b76`, default worker pool, 487 s: 561 files, 3,169 tests, 71 failed. The 65 baseline failures are all present by name and none is missing (`review_evidence/empty-food-landing-20261109/failing-tests-e019cb33.txt`). The other six tests and one file hook are timeouts under load (`lab_defaults` 3, `lab_report` 1, observer purity 1, tool-report saves 1, the `zz_review_h_retention` hook); those five files pass alone at the same commit, 12 of 12 tests in 176 s. No regression.

Decision-neutral on the evidence of twelve 25-day worlds. No benefit or harm is claimed.

## Not done

Reconciling earlier and destroyed buildings; plots, piles and wells in the extent; a reader other than the civic history; replacing `townAt`'s fixed 20 tiles; any use as a boundary.
