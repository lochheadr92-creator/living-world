# The recruit cap counts help the asker has heard — rules 172

Predecessor rules 171 is pinned by `tests/v171_continuation.expected.json`, recorded before this
behaviour existed. Origin: the free-file omniscience leak in `optRecruit`, which called
`helpersOn` and so walked every living person's true commitment. This step is that count, in
its own rules version (decision D2).

## The defect (every version up to 171)

`optRecruit` compared `helpersOn(world, site.id)` with the site's cap. That function counts
every living person with an active `help_build`, `haul` or `work` commitment on the site. The
asker did not have to know those people had taken the work on. The accept path in `social.ts`
uses the same true count, and this rule does not change it.

## The rule

`src/sim/heard_helpers.ts` (`hasHeardHelpers`: rich, rules 172 or later, switch on). Only
`optRecruit` in `options_social.ts` uses it:

- the asker's own active `help_build`, `haul` or `work` commitment on that site counts as one;
- each distinct `socialMemory` row with `role === 'asker'` for that site counts while it is
  still promised: `expectedStatus` when the row has an expectation, otherwise `outcome === 'promised'`;
- a civic council still skips the cap;
- the cap itself is unchanged: `maxWorkers + 1`, and the ask stops at `Math.min(2, cap)`.

Rules 171 and earlier, and authored worlds, keep `helpersOn`. `setHeardHelpers(false)` restores
it inside a rules-172 rich world. The comment name is `rich-no-heard-helpers`. No heard-helper
count is invented where there is no memory row. `maxWorkers`, the per-candidate live commitment
check, and the recruit accept path are unchanged. Lab evidence compares an earlier version
pinned with `lab.mjs --rules` against current rules, so `scripts/lab/lab.ts` is not edited.

## What was checked, and what was not

`tests/heard_helpers.test.ts` (7), staged, not spontaneous. The asker's own commitment and two
copies of one promise count once each. A row with no expectation counts only while its outcome
is still promised. An expectation past its deadline does not count. Two other people truly
committed block the recruit option at 171 and do not block it at 172. Two remembered promises
and no true commitments block it at 172 and do not at 171. The switch at 172 with two true
commitments blocks. `npm run typecheck` passed with this rule in the tree.

Immutable pin `tests/v172_continuation.*`: Normal aspen, arrivals on, 8,000 ticks then 120
after a save and load, recorded from a clean checkout of `aa01408d` (pin commit `87d6a315`).
The heard count and the live helper count sit on opposite sides of the cap, first seen at tick
3,001, sampled every 50 ticks: two people are committed and the asker has heard of none. Saved
digest `08b657e7ed7165b8c1f2f3753c6b89c7b18e9e730226961e3a93c39f21bc47ec`, continued
`964d66f0448a893fdf8078cc8bc8bf3a85ae9241817c27e87052ee3324b44db4`. The pin test passed on
that checkout, 1 of 1 in 17.2s. Birch, forest, meadow, river and cedar did not differ inside
12,000 ticks, which is why the pin is aspen. The reference script refuses to overwrite. A
follow-up on `228d62dc` skips children by `stageOf`, because `Person` has no child flag. Aspen
still differs at tick 3,001 and the digests are unchanged. That follow-up is what `npm run
typecheck` passed against.

Paired lab, clean checkout of `87d6a315`, 9 November 2026: 12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`. Rules 171 pinned with `--rules 171` against current rules 172. Both arms finished 12 of 12 seeds, three arms each. Provenance head `87d6a315`, `dirty` false, `modified` empty. Reports written 03:29:28 (rules 172) and 03:29:46 (rules 171). `scripts/lab_versions.ts` exited 0 at 03:30:27 and ends: nothing moved by more than a single draw moves it. Every listed metric is not distinguishable from chance. The largest printed difference is prepUnits -1.3, inside a noise floor of ±52.3. The suite was not rerun. No benefit or harm is claimed. Evidence: `review_evidence/heard-helpers-20261109/`. The 8,000-tick aspen pin and the `stageOf` follow-up are not this result.

## Not touched

`knownNeeds` for a dependant in sight is rules 173 (`docs/SEEN_DEPENDANT.md`). The recruit accept path. The leaks that sit in another
session's uncommitted files.
