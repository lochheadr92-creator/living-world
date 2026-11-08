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

The 12-seed paired lab is not run. No benefit or harm is claimed.

## Not touched

`knownNeeds` for a dependant in sight. Store contents copied at sight. A worry about a dead subject
the worrier has not heard of. `whereIs` reading household ids. The recruit cap's global helper count.
The leaks that sit in another session's uncommitted files.
