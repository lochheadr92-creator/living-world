# A worry about someone gone is kept until the death is known — rules 170

Predecessor rules 169 is pinned by `tests/v169_continuation.expected.json`, recorded before this
behaviour existed. Origin: the free-file omniscience leak in `welfare.ts`, which dropped a
visit because the subject was missing from the register or marked not alive. Being on the
deceased list was treated as if the worrier had been told. This step is that drop, in its own
rules version (decision D2).

## The defect (every version up to 169)

`outOfDate` returned true when the subject was missing. `noteConcerns` then deleted the
concern. `welfareOptions` skipped the visit when `personById` failed. `shareConcerns` read
`subject.hhId` and `subject.name` off the living person. The deceased list is not news. A
person who has not learned the death was acting as if they had.

## The rule

`src/sim/known_worry.ts` (`hasKnownWorry`: rich, rules 170 or later, switch on).

- a missing person, or one marked not alive, no longer drops the worry on their own. It stays
  while it is younger than `CONCERN_LIFE` (1,680 ticks) and the worrier does not `knowsDeath`;
- `knowsDeath` is a relation flag or a heard death. The deceased list is not that news;
- sharing a worry about someone missing uses the name on the deceased list and the listener's
  own relation (kin, or affinity at least 15). It does not read the missing person's household
  id;
- the visit is still offered, labelled with that name. Starting it still finds them gone and
  does not teach the death. Kin, household and dependant checks run only when a living person
  object exists.

Rules 169 and earlier, and authored worlds, keep the drop. `setKnownWorry(false)` restores it
inside a rules-170 rich world. The plan-wide name `rich-no-care-knowledge` is not used. Lab
evidence compares rules 169 pinned with `lab.mjs --rules 169` against current rules, so
`scripts/lab/lab.ts` is not edited.

## What was checked, and what was not

`tests/known_worry.test.ts` (6), staged, not spontaneous. At 169 the concern and the visit are
gone after `killPerson`. At 170 both stay, the person is gone from the register, the label is
`Bring bread to Ben`, and `knowsDeath` stays false after the options are generated. A death
already learned drops the concern and the visit. The worry is passed to a neighbour, whose log
names Ben, and that neighbour has not learned the death. The switch and an authored world keep
the drop.

`npm run typecheck` passed with this rule in the tree.

Immutable pin `tests/v170_continuation.*`: Normal birch, arrivals on, 32,000 ticks then 120
after a save and load, recorded from a clean checkout of `1b59cebe` (pin commit `ba3c549f`).
First death at tick 26,558. A worry still held about someone on the deceased list, by a person
who has not learned that death, first seen at tick 30,433. Saved digest
`90333734c5c8d0d89dd0a675d0b178bd5ee29ff10c92986baf649e150d061bcc`, continued
`796849cd9723b1644c73a125ed5e599ef9a07562212dbdcd6f35da078405e4de`. The pin test passed on
that checkout, 1 of 1 in 87.1s. The same probe on birch, forest, meadow, river, aspen and
cedar for 24,000 ticks saw no deaths and no kept worry, which is why the pin is 32,000 ticks
and not 12,000. The reference script refuses to overwrite.

Paired lab, clean checkout of `ba3c549f`, 9 November 2026: 12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`. Rules 169 pinned with `--rules 169` against current rules 170. Both arms finished 12 of 12 seeds, three arms each. Provenance head `ba3c549f`, `dirty` false, `modified` empty. Reports written 02:46:33 and 02:46:36. `scripts/lab_versions.ts` exited 0 at 02:47:13 and ends: nothing moved by more than a single draw moves it. Every listed metric differs by 0. The suite was not rerun. No benefit or harm is claimed. Evidence: `review_evidence/known-worry-20261109/`. The six-seed probe and the 32,000-tick pin are not this result.

## Not touched

Looking for someone at a home is rules 171 (`docs/KNOWN_HOME.md`). The recruit cap is rules 172 (`docs/HEARD_HELPERS.md`). `knownNeeds` for a
dependant in sight is rules 173 (`docs/SEEN_DEPENDANT.md`). The living-bereaved life-event read. The leaks that sit in another
session's uncommitted files.
