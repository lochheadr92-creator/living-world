# The granary emergency ration reads what the person knows of a housemate: rules 177

Predecessor rules 176 is pinned by `tests/v176_continuation.expected.json`, recorded before this behaviour existed. Origin: gap ledger
row G29 (`docs/GAP_LEDGER.md`), one of the verified omniscience leaks of the 7 November gap map. One rules version for one change
(decision D2).

## The defect (every version up to 176)

`withdrawAllowance` (`src/sim/facilities.ts`) lets a person at a granary take up to 3 units beyond their household's share when they are
starving themselves or have a hungry dependant in the house. The housemate test, `hasHungryDependent`, read every housemate's live
`needs.hunger` and live `health` from anywhere in the world. A parent at the granary was granted the ration the moment a child at home
grew hungry, which nobody could know. The person's own hunger is first-hand and was never the problem.

## The rule (rules 177, rich worlds)

`src/sim/known_ration.ts`, called from `hasHungryDependent`. A housemate counts only when the person knows of them:

- they are a child by age (age is no secret), or are in sight and visibly hurt;
- and what the person knows of their hunger, `knownNeeds` (the signs on a current sight, else the note from the last sight), is under 30.

In practice that is a housemate in sight and visibly starving (a starving sign reads 19). A remembered "hungry" note reads 41 and does not
qualify; no note means unknown. The amount (at most 3), the access check, the share arithmetic and the owed-back accounting are unchanged.
Rules 176 and earlier, authored worlds and `setKnownRation(false)` keep the live read. The lab name for the removal is
`rich-no-known-ration`; it is not registered in `scripts/lab/lab.ts`, which another session holds with uncommitted edits.

## What it can cost

A starving child at home, out of sight of the parent at the granary, no longer qualifies the parent for the extra ration. That is what
removing the omniscient read means, and rules 173 accepted the same trade for care. No benefit is claimed.

## Evidence

- Contract tests `tests/known_ration.test.ts` (9). Five fail against the 176 behaviour before the wiring and pass after: an unseen
  starving child no longer qualifies, a remembered-hungry note does not, a starving child in sight does whatever the live figure,
  a child who only looks hungry does not, an adult housemate counts only in sight and visibly hurt. Own hunger, the switch and authored
  worlds are unchanged.
- `npm run typecheck` passes. Focused set (granary, winter reserve, rules version, remembered need, seen dependant, visible need): 87 tests.
- Full suite from a clean checkout of `fcfedf91` (three shards, 12 workers): the same 65 tests in ten files fail as at the previous
  commit, with identical names (`review_evidence/empty-food-landing-20261109/failing-tests-10d3adf2.txt`); they start at rules 169, not
  here. The observer-purity test timed out under shard load and passes alone. The 11 new tests pass.
- Immutable pin `tests/v177_continuation.*` (Normal birch, arrivals on, 8,000 ticks then 120 after a save and load; the known and the live
  housemate test first disagree at tick 7,601, sampled every 50 ticks), recorded from a clean checkout of `9ad63f96`; the pin test passed
  there, 1 of 1 in 14.5 s. No granary is built in that world, nor in forest or river inside 12,000 ticks, so the pin does not reach the
  ration branch; the unit tests do.
- Paired comparison, 12 seeds (aspen, birch, cedar, fern, gen-1 to gen-6, meadow, river), Normal, 25 days, arrivals on, control arm,
  `scripts/ab_probe.ts` at rules 176 and at 177 from a clean checkout of `fcfedf91`, two processes at a time:
  the final world (rules number masked) is identical in 12 of 12 seeds, and conservation and the tool registry hold in all 24 runs.
  `review_evidence/granary-ration-20261109/`. The lab's nudge arms and noise floor were not run, because identical worlds cannot differ.
  Whether a granary was reached in those worlds was not measured; the identity is what bounds the effect.

## Not done

Other live reads of a housemate's state remain: G26 (same-household tests), G31 (welfare), G94 (who can mind the children).
Rationing and commons allocation in general (G43, G135) wait on the owner's 2a-S decision.
