# A witness has to be able to see: rules 183

Predecessor rules 182 is pinned by `tests/v182_continuation.expected.json`. Origin: gap ledger row G17 (`docs/GAP_LEDGER.md`). One rules version for one change (decision D2).

## The defect (every version up to 182)

Three places decided who saw an act with a fixed radius and "not asleep" only: a theft (`misdeeds.ts`, 8 tiles of the store), a gift, help or quarrel (`social.ts` `witness`, 7.5 tiles) and a
birth, death, partnership or taking-in (`reputation.ts` `noteDeedNear`, 8 to 14 tiles). None asked whether the person was in the same space as the one who acted (`sameSpace`) or how far they could
see just then (`senseRadius`, shorter in the dark and in rain), which `perceive` itself asks. A person indoors "saw" a theft in the yard, and a person in the dark "saw" a quarrel at the edge of the radius.

## The rule (rules 183, rich worlds)

`src/sim/witness_sight.ts`, called from those three places after the old radius test. A person counts as a witness only if they are in the same space as the actor (both outdoors, or both in the
same building) and within the smaller of the old radius and their own `senseRadius`. Awake and alive are unchanged. Rules 182 and earlier, authored worlds and `setWitnessSight(false)` keep the
fixed radius. The lab name for the removal is `rich-no-witness-sight`; it is not registered in `scripts/lab/lab.ts`, which another session holds with uncommitted edits.

## What it can change

Fewer witnesses at night and through walls, so fewer thefts, helpings and quarrels are seen, fewer rumours start and fewer relation notes are made. A birth indoors is no longer news to the whole
yard. This can slow the spread of good news as well as bad. No benefit is claimed.

## Not changed

Death witnessing (rules 14), `perceive`, the actors' own records, accounting.

## Evidence

- Contract tests `tests/witness_sight.test.ts` (8). Four fail with the rule disabled (a bystander indoors, a bystander in the dark, a gift seen across buildings, a birth indoors), and all eight
  pass at 183.
- `npm run typecheck` passes. Focused set (19 files, reputation, social, lifecycle, occasions, habitation): 145 tests.
- Immutable pin `tests/v183_continuation.*` (Normal birch, arrivals on, 2,400 ticks then 120 after a save and load; early on somebody awake is inside the old radius of another person and cannot
  see them, sampled every 25 ticks), recorded from a clean checkout of `ee567e1f` (probe run twice, identical); the pin test passed there, 1 of 1 in 7.8 s. The predicate is a state condition,
  not a counted witness event; the twin and the lab show actual differences.
- Full suite from a clean checkout of `44e8af3b`, the head of the 182 to 184 series (three shards, 12 workers): the 65 baseline tests in ten files fail as before
  (`review_evidence/empty-food-landing-20261109/failing-tests-10d3adf2.txt`) plus three more: the observer-purity test timed out under load and passes alone; `inhabitant_memory` item 12 (a
  repo-wide source guard met a `.notes` property in the rules-182 code) and `tool_plan_capacity` M1 (a staged scene that observed a hut's contents from 2.5 tiles, which rules 184 hides). The last two
  were fixed in `151657f7` and `e4d4f431` and pass; the suite was not rerun in full after the fixes.
- Twin, 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 182 and at 183 from a clean checkout of `44e8af3b`, two processes at a time: the final world is identical in 0 of
  12 seeds; conservation and the tool registry hold in all 24 runs.
- Paired lab, same checkout, 10 November 2026: 12 seeds, Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`, rules 182 and rules 183 both pinned with `--rules`,
  `scripts/lab_versions.ts`. Both arms finished 12 of 12 seeds, three arms each; provenance head `44e8af3b`, `dirty` false, `modified` empty. It ends: nothing moved by more than a single draw moves it.
  People 23.3 against 23.6 (floor ±5.9), deaths 8.6 against 8.4 (±5.5), mean hunger 48.5 against 46.2 (±7.8), mean mood -20.8 against -24.4 (±10.4): not distinguishable from chance. Plots +0.9, first
  yard day +1.1 and the count in low mood +2.0 (10 of 12 draws up, floor ±5.0) are systematic and inside their floors; none is called larger than chance. No benefit or harm is claimed.
  `review_evidence/witness-sight-20261109/`.

## Not done

A count of rumours started and stories heard (not a lab metric); the Large profile; death witnessing and `perceive` are unchanged by design.
