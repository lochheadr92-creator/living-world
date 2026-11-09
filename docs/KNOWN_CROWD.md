# A crowd is the people one knows of: rules 181

Predecessor rules 180 is pinned by `tests/v180_continuation.expected.json`. Origin: gap ledger row G154 (`docs/GAP_LEDGER.md`). One rules version for one change
(decision D2).

## The defect (every version up to 180)

`facilityWants` (`production.ts`) lets a crowd open the hall want on its own: "once two dozen live here, somewhere to gather is wanted whether or not a yard stands". It
counted every living person in the world's register (`for (const q of world.persons) if (q.alive) alive++`), so a person who had met a handful of people, or a newcomer,
wanted a hall because of strangers they had never seen.

## The rule (rules 181, rich worlds)

`src/sim/known_crowd.ts`, called from that one place. A person feels a crowd when they know of at least `CROWD_AT` (24) people: themselves, and every entry in `p.relations`
(founders all know each other at world generation; others from meeting, kin and care) except those whose death they know of (`knowsDeath`). Someone who has not learned of a
death still counts that person. The threshold, the other conditions of the hall want (a yard or a crowd, three solid homes, no food shortage, the hall not already known)
and the `+0.3` are unchanged. Rules 180 and earlier, authored worlds and `setKnownCrowd(false)` keep the live count. The lab name for the removal is
`rich-no-known-crowd`; it is not registered in `scripts/lab/lab.ts`, which another session holds with uncommitted edits.

## What it can change

A newcomer, or anyone who has met fewer than 23 others in a world of 24 or more, no longer counts a crowd, so their hall want comes later or only through a yard. No benefit is claimed.

## Evidence

- Contract tests `tests/known_crowd.test.ts` (8). Three fail with the rule disabled (a person who knows six people feels no crowd; twenty-three others are enough and twenty-two
  are one short; a known death is not counted), and all eight pass with it.
- `npm run typecheck` passes. Focused set (13 files, occasions, workshops, settlements, project production, rules version): 124 tests.
- Full suite from a clean checkout of `1a00afc3` (three shards, 12 workers): the same 65 tests in ten files fail as at the previous commit
  (`review_evidence/empty-food-landing-20261109/failing-tests-10d3adf2.txt`); the observer-purity and `lab_defaults` tests timed out under shard load and pass alone, with the
  new tests (4 files, 14 tests, 175 s).
- Immutable pin `tests/v181_continuation.*` (Normal birch, arrivals on, 40,000 ticks then 120 after a save and load; from tick 38,551 somebody knows of fewer than two dozen
  people while the world holds two dozen or more, sampled every 50 ticks), recorded from a clean checkout of `e05d939c` (probe run twice, identical); the pin test passed there,
  1 of 1 in 85 s.
- Twin, 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 180 and at 181 from a clean checkout of `f26cadcb`, two processes at a time: the final world is
  identical in 12 of 12 seeds; conservation and the tool registry hold in all 24 runs. The lab's nudge arms were not run because identical worlds cannot differ.
  `review_evidence/known-crowd-20261109/`.

A null and a bound: the changed branch is reachable in a 25-day world (day 16 in birch) but the twelve final worlds are identical. Why was not traced.

## Not done

A longer or Large-profile comparison, where the hall want is more likely to turn on the count.
