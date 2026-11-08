# A dependant in sight is what the signs show — rules 173

Predecessor rules 172 is pinned by `tests/v172_continuation.expected.json`, recorded before this
behaviour existed. Origin: the other half of rules 166. `optOffer` already uses graded visible
signs. `knownNeeds` still returned a dependant's live hunger, thirst and warmth while they were
in sight (rules 106). This step is that read, in its own rules version (decision D2).

## The defect (every version up to 172)

`knownNeeds(..., seenNow)` returned `d.needs` itself whenever the dependant was in sight. Those
are the live figures, including values a bystander cannot see. Out of sight, rules 106 already
uses the last noted signs.

## The rule

`src/sim/seen_dependant.ts` (`hasSeenDependant`: rich, rules 173 or later, switch on).
`knownNeeds` in `remembered_need.ts`:

- in sight, the carer's `seen` entry for that person supplies the figures: starving is 19,
  hungry and not starving is 41, otherwise hunger is 100; parched is 19, thirsty and not
  parched is 39, otherwise thirst is 100; cold is warmth 34, otherwise 100;
- in sight with no sight entry, the carer does not know, and the function does not fall back
  to the live figures;
- out of sight stays rules 106.

Rules 172 and earlier, and authored worlds, keep the live in-sight figures.
`setSeenDependant(false)` restores them inside a rules-173 rich world. The comment name is
`rich-no-seen-dependant`. `rich-no-visible-need` and `rich-no-care-knowledge` are not reused.
`options_work.ts` is not edited; it already calls `knownNeeds`. The signs can blunt urgency:
a child whose live hunger is near 70 and who is not marked hungry is read as 100, and a
starving child is read as 19 rather than the live figure. No benefit is claimed. Lab evidence
compares an earlier version pinned with `lab.mjs --rules` against current rules, so
`scripts/lab/lab.ts` is not edited.

## What was checked, and what was not

`tests/seen_dependant.test.ts` (5), staged, not spontaneous. At 173 a starving, thirsty, cold
sight is hunger 19, thirst 39 and warmth 34, and changing the live figures does not change it.
At 172, with the switch off, and in an authored world, in sight is still the live hunger.
An empty sight list does not fall back to the live needs. Out of sight stays the remembered
signs. `tests/remembered_need.test.ts` (3) and `tests/visible_need.test.ts` (6) passed in the
same run. `npm run typecheck` passed on a clean checkout of `05d22ddf`.

Immutable pin `tests/v173_continuation.*`: Normal birch, arrivals on, 2,400 ticks then 120
after a save and load, recorded from a clean checkout of `05d22ddf` (pin commit `10397b4b`).
A carer judges a household dependant in sight from signs rather than live needs, first seen at
tick 1, sampled every 50 ticks. On that first sample a child's live hunger was about 69 and
the sign was 100. Saved digest
`4d546539d746288bf6cc4488250e0a94c3ea502dba7f0012c8140c1f7637cc29`, continued
`5e0016df698988e525fc36f39b80c10c3b495e6298c908392f70482a361b0075`. The pin test passed on
that checkout, 1 of 1 in 10.0s. Forest, meadow, river, aspen and cedar also differ at tick 1.
The reference script refuses to overwrite.

The paired lab is not run. No benefit or harm is claimed.

## Not touched

The recruit accept path. The leaks that sit in another session's uncommitted files.
