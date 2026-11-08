# A neighbour is asked to watch a child only if they know the child — rules 168

Predecessor rules 167 is pinned by `tests/v167_continuation.expected.json`, recorded before this
behaviour existed. Origin: owner decision D6(b), 2 November 2026 (`decisions/manual/claude-living-world/2026-11-02-knowledge-gated-adoption`
in the brain vault), the handover half of P2.3. The 2 November message approved the choice, not the
code. `adoptOrphans` was rules 167. This step is the ask, in its own rules version (decision D2).

## The defect (every version up to 167)

`options_social.ts`, when a laid-up adult has a child and nobody else at home can see to them, asked
any nearby adult to keep an eye on the child. Standing nearby was enough. Kin on the relation was
not required, and neither was a sight of the child or a whereabouts note. The fire ask is a different
request and was not this defect.

## The rule

`src/sim/known_handover.ts` (`hasKnownHandover`: rich, rules 168 or later, switch on). The test is
`knownPlace` from `src/sim/known_adoption.ts`: a current `seen` person entry, or else a `whereabouts`
note. The ask itself is not that knowledge.

- the watch ask is offered only when that neighbour already knows the child. Kin alone does not qualify;
- if they do not, the inspector says the neighbour has not seen the child and has not been told where
  they are. Nothing is asked, and the ask-duty cooldown is not started, so a later sight can still be asked;
- the fire ask is unchanged.

Rules 167 and earlier, and authored worlds, keep the old ask. `setKnownHandover(false)` restores it
inside a rules-168 rich world. The plan-wide name `rich-no-care-knowledge` is not used. Lab evidence
compares rules 167 pinned with `lab.mjs --rules 167` against current rules, so `scripts/lab/lab.ts`
is not edited.

## What was checked, and what was not

`tests/known_handover.test.ts` (7), staged, not spontaneous. A stranger is blocked at 168 and asked
at 167. A current sight qualifies, a whereabouts note qualifies, kin alone does not, an authored world
keeps the old ask, and the switch restores it. `tests/responsibilities.test.ts` plants the neighbour's
sight of the child so the existing ask still happens. `npm run typecheck` passed at `c4f31c15`.

Immutable pin `tests/v168_continuation.*`: Normal birch, arrivals on, 12,000 ticks then 120 after a
save and load, recorded from a clean checkout of `c4f31c15`. A probe of that checkout, sampling every
200 ticks, generated a keep-an-eye option at tick 8,600. The pin test passed on that checkout, 1 of 1
in 16.5 seconds. `source.head` is `c4f31c15`.

The same probe ran forest, birch, meadow, river, aspen and cedar for 72,000 ticks (30 days). No watch
was requested. At every sampled watch moment, every nearby adult had already seen the child, so those
worlds do not exercise the refusal. The option, when it was generated, lost to sleep, rest or eating
(about 20 against 75 to 100 on the forest samples). This is not a measurement of benefit or harm.

Paired lab, clean checkout of `cd7334e4`, 9 November 2026: 12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`. Rules 167 pinned with `--rules 167` against current rules 168. Both arms finished 12 of 12 seeds, three arms each. Provenance head `cd7334e4`, `dirty` false, `modified` empty. `scripts/lab_versions.ts` ends: nothing moved by more than a single draw moves it. Every listed metric differs by 0. The suite was not rerun. No benefit or harm is claimed. Evidence: `review_evidence/known-handover-20261109/`.

The status file never received `labs exit` or `compare exit`. The scheduler wrapper died after it had started the two lab processes. Both arms still finished (reports written 01:18:41), and the comparison was run afterwards from the same clean checkout and exited 0. That comparison is the result. The within-arm nudge reports are a different sentence and are not this comparison.

## Not touched

`knownNeeds` for a dependant in sight is rules 173 (`docs/SEEN_DEPENDANT.md`). Store contents copied at sight are rules 169 (`docs/SEEN_STOCK.md`). A worry about someone gone is rules 170 (`docs/KNOWN_WORRY.md`). Looking for someone at a home is rules 171 (`docs/KNOWN_HOME.md`). The recruit cap is rules 172 (`docs/HEARD_HELPERS.md`).
The leaks that sit in another session's uncommitted files.
