# A laid-up person counts an able adult at home only if they can see one: rules 180

Predecessor rules 179 is pinned by `tests/v179_continuation.expected.json`, recorded before this behaviour existed. Origin: gap ledger row G94 (`docs/GAP_LEDGER.md`), the housemate read
that rules 168 (which neighbour is asked) did not reach. One rules version for one change (decision D2).

## The defect (every version up to 179)

A laid-up person (injured, or ill enough to be in no state to see to anyone) with children at home asks a neighbour to keep an eye on them for the day, but only "when nobody else at home
can". `childrenNeedingWatch` (`responsibilities.ts`) decided that by reading every housemate's live injury, illness and `health >= 50`, whether or not the laid-up person could see them.
An able adult anywhere in the world's register suppressed the need.

## The rule (rules 180, rich worlds)

`src/sim/known_able.ts`, called from that one place. A housemate counts as able to see to the children only if they are an adult or elder by age, the laid-up person currently sees them
(`p.seen`), and the sight shows neither `hurt` (health under 60) nor `feverish` (from rules 165). A housemate out of sight is not counted. The list of children is unchanged. Rules 179
and earlier, authored worlds and `setKnownAble(false)` keep the live read. The lab name for the removal is `rich-no-known-able`; it is not registered in `scripts/lab/lab.ts`, which
another session holds with uncommitted edits (the earlier rules are pinned with `--rules 179` instead).

## What it can change

A laid-up person whose other adult is simply out of sight now lists the children as needing a watch (and may ask a neighbour, under the rules-168 gate); a housemate seen with health 50 to 59
now reads as not able. No benefit is claimed.

## Not changed

`laidUp` for the person themselves (first-hand), `ctx.dependents` (`optutil.ts:160`) and the other live-health reads (`welfare.ts:241`), the rules-168 ask gating, accounting.

## Evidence

- Contract tests `tests/known_able.test.ts` (8). Two fail on behaviour with the rule disabled (an able adult out of sight no longer suppresses the list; one in sight who looks hurt or
  feverish does not), and all eight pass at 180. The others cover the age rule (a youth in sight does not count, an elder does), the switch and the authored gate.
- `npm run typecheck` passes.
- Full suite from a clean checkout of `38e0db58` (three shards, 12 workers): the same 65 tests in ten files fail as at the previous commit
  (`review_evidence/empty-food-landing-20261109/failing-tests-10d3adf2.txt`); the observer-purity test timed out under shard load and passes alone (four files rerun alone, 14 of 14
  tests, 164 s, with `known_able` and the pin).
- Immutable pin `tests/v180_continuation.*` (Normal river, arrivals on, 2,400 ticks then 120 after a save and load; a laid-up person from tick 201, sampled every 50 ticks), recorded
  from a clean checkout of `e80c291c`. The pin does not reach the changed branch: no laid-up person lived with a child in 12,000 ticks of birch, forest or river in the probe; the unit
  tests do.
- Twin, 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 179 and at 180 from a clean checkout of `38e0db58`, two processes at a time: the final world is
  identical in 1 of 12 seeds (gen-1); conservation and the tool registry hold in all 24 runs. The cause of the partings was not traced.
- Paired lab, same checkout, 2026-11-09 to 10 November: 12 seeds, Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`, rules 179 pinned with `--rules 179` against
  current rules 180, `scripts/lab_versions.ts`. Both arms finished 12 of 12 seeds, three arms each; provenance head `38e0db58`, `dirty` false, `modified` empty. It ends: nothing moved by
  more than a single draw moves it. People 23.5 against 23.2 (floor ±5.8), deaths 8.3 against 8.6 (±5.6), mean hunger 49.3 against 48.4 (±9.2), mean mood -19.8 against -20.9 (±10.6);
  no row is called systematic. No benefit or harm is claimed. `review_evidence/known-able-20261109/`.

## Not done

`ctx.dependents` and the remaining live-health reads (G94's other citations), and who the neighbour is told the child is with.
