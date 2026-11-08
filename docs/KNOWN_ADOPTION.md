# A carerless child is taken in only by an adult who knows of them — rules 167

Predecessor rules 166 is pinned by `tests/v166_continuation.expected.json`, recorded before this
behaviour existed. Origin: owner decision D6(b), 2 November 2026 (`decisions/manual/claude-living-world/2026-11-02-knowledge-gated-adoption`
in the brain vault): `adoptOrphans` may take a child only if a carer knows of them. The 2 November
message approved the choice, not the code. This step is the adoption half of that decision, on the
omniscience sweep, in its own rules version (decision D2). Carer handover is not included.

## The defect (every version up to 166)

`lifecycle.ts adoptOrphans`, every 300 ticks, scored every living adult from the child's true
coordinates, plus kin on the relation record and the adult's generosity. A child nobody had seen,
and nobody had been told about, was still rehomed. Kin is written at birth without a sight, so it
is not knowledge of where the child is.

## The rule

`src/sim/known_adoption.ts` (`hasKnownAdoption`: rich, rules 167 or later, switch on):

- a living adult qualifies only with a current sight of that child (`seen`, a person entry) or a
  `whereabouts` note. Current sight wins over the stored note. Kin alone does not qualify. A youth
  still never takes a child, and a youth in the child's own household still counts as someone there;
- the distance term uses that remembered or seen place, not `child.x` / `child.y`;
- if nobody qualifies, the child stays. Household history, which is derived and stores nothing, says
  the child has no adult in the household and nobody who has seen them or been told where they are
  has taken them in.

Rules 166 and earlier, and authored worlds, keep the old scan. `setKnownAdoption(false)` restores
it inside a rules-167 rich world. The plan-wide name `rich-no-care-knowledge` is not used, because
that name also covers carer handover, which is a later version. Lab evidence compares rules 166
pinned with `lab.mjs --rules 166` against current rules, so `scripts/lab/lab.ts` is not edited.

## What was checked, and what was not

`tests/known_adoption.test.ts` (7), staged, not spontaneous. Before the module existed, the 167
arms failed because the nearest adult, or the adult nearest the true place, still took the child,
and the rules number was 166. After the change they pass: at 166 Ada takes Tam unseen; at 167 only
Ben, who was told, and Ada's kinship does not qualify; equal generosity scores the remembered place
(Cara) rather than the true place (Ben); a child nobody knows stays, and the history sentence is
present only then; a current sight counts; a youth who has seen them does not take them; an authored
world keeps the old scan; the switch restores it. Save round-trip and conservation pass on the
staged scenes. `tests/lifecycle.test.ts` plants a whereabouts note on one surviving adult so "taken
in by someone" still means someone who knows them. `tsc --noEmit` passed.

Immutable pin `tests/v167_continuation.*`: Normal forest, arrivals on, 33,000 ticks then 120 after a
save and load, recorded from a clean checkout of `4be83435`. A probe of that checkout recorded the
first adoption at tick 30,643. The pin test passed on that checkout, 1 of 1 in 48 seconds.

A one-seed forest probe at 25 days is not a measurement. Both rules 166 and rules 167 recorded
adoptions. Alive counts were 15 at 166 and 7 at 167. One seed cannot say the gate caused that.

The full suite and the 12-seed paired lab (Normal, 25 days, control plus `nudge:1` and `nudge:2`,
rules 166 against 167) were started detached from a clean checkout of `4cdc01e9`. Their results are
not in this note. No benefit or harm is claimed.

## Not touched

Carer handover. `knownNeeds` for a dependant in sight. Store contents copied at sight. A worry about
a dead subject the worrier has not heard of. `whereIs` reading household ids. The recruit cap's
global helper count. The five leaks that sit in another session's uncommitted files.
