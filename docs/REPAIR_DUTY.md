# Heard roof-repair duties: next bounded transition

## Rules 98 verification and review — 31 October 2026 (Claude, after the Codex handoff)

The as-is checkpoint `3534da8` was reviewed and verified in a fresh clone of the
published repository; nothing below relies on the uncommitted local logs named in
the handoff. The diagnosis and contract further down are retained as provenance.

**Full regression on the checkpoint: 318 files / 2,142 tests passed**, exit 0,
1,281.36 s wall time (the suite shared four cores with the typecheck and a
reference dry-run; the owner's machine records about 437 s). The interrupted
`autonomy-repair98-full-tests.log` is therefore superseded by a complete pass.
Typecheck and production build pass; the pre-existing bundle-size warning remains.

**Rendered check reproduced here: 8/8** (`autonomy_evidence/repair98-claude-rendered`,
screenshots inspected, not only DOM-asserted). Ben accepts at 37 without knowing the
home, acquires one real wood unit, is seen hammering the visibly damaged house at
351 with the inspector reading "Repairing the house … I promised to patch this
roof", the request is fulfilled at 1,275 with condition 73 after real consumption,
and Ada autonomously sleeps inside the repaired house from 1,398 (full cover,
energy rising). Staged fixture, offered request selected manually; everything after
acceptance is autonomous. No ordinary-frequency or welfare claim.

**Review of the diff.** Existing modules touched are limited to `social.ts`
(acceptance knowledge, note), `options_work.ts` (duty acquisition need and the
promised repair choice), `act_build.ts` (lawful-supply rechecks), `rulesversion.ts`
and `scripts/lab/lab.ts`; the new owner is `repair_duty.ts`. Reserved goods are the
existing `reservedFor` (undelivered deliveries/hauls plus plan wants); a duty never
reads the current remote home, and `knownDutyHome` refuses a belief older than one
day or with no observed condition. Under rules 98 the `making` refusal is no longer
spoken for roof requests: wood planned for something else is simply not available
supply, and the helper promises only if a lawful source is known. This is a
deliberate narrowing recorded here, not an oversight. Rules 97 and earlier keep
their recorded behaviour; `rich-no-repair-duty` removes only the new transitions.

One concrete finding was fixed: a stale roof request declined with `no_place`
reused the fire-duty line "I do not know which fire I could reach from that old
account." The spoken line now names the home for a repair request. A focused test
drives the actual conversation at tick 2,401, confirms the decline note, the
spoken text, no commitment and no learned destination; it fails on the checkpoint
and passes after the fix. No simulation state outside rules-98 roof refusals is
affected, so no predecessor reference changed.

Focused suite after the fix: `tests/repair_duty.test.ts` (16),
`tests/repair_duty_protocol.test.ts` (2) and `tests/v97_continuation.test.ts`.
The immutable rules-98 continuation (`scripts/v98_reference.ts`,
`tests/helpers/v98ref.ts`, `tests/v98_continuation.expected.json`) pins six paths:
ordinary river, heard duty, fulfilled repair, later shelter, paid wood patch and a
saved interruption; its commit is named in the programme register.

**Ordinary river screen reproduced here** (`scripts/repair_duty_observe.ts river
autonomy_evidence/r98-claude-river 5 300`, report committed, final save local):
five days / 12,000 ticks in 84.59 s, 2,800 living-person samples, 100 full-state
purity checks, exact unobserved twin, valid final save, daily accounting balanced,
no deaths. Counts match the handoff's river run exactly: six ordinary repair starts
(four interrupted, one partial, one still running at the horizon), 163 sampled
repair offers, five ranked first, 358 samples of a known damaged own home, one
sampled roof-request offer, zero roof requests spoken, zero sampled active roof
duties. The new duty mechanism therefore did not activate in this ordinary window;
the six repair starts are the pre-existing own-home/neighbour path. Forest and
meadow were not re-run here; the handoff's three-seed figures stand as attributed
Codex evidence.

What remains unproven: ordinary occurrence of the whole requested-repair chain,
household survival benefit, public/shared upkeep, replacement after collapse and
households with limited adult labour. The condition-62 contribution settlement is
unchanged; a fulfilled duty is a paid patch, not a promise of a fully restored home.

## Rules 97 source and physical reproduction

`autonomy_evidence/repair98-before.ts` stages elderly Ada (#2), neighbour Ben (#5)
and Ada's damaged hut (#6) beyond Ben's sight. Ada remembers her home and sees Ben;
Ben has two real wood units. The actual offered repair request #10 is spoken at
tick 15 and accepted at 37, creating commitment #11. At 100 Ben still has no
location belief for the home and no repair option. Conservation holds. The expected
failure is retained in `autonomy-repair98-before.log`.

`social.ts` creates the named repair obligation but conveys no home observation.
`options_work.ts` both obtains repair material and offers repair by iterating
personal building beliefs. It cannot use an uncommunicated home, correctly. The
request note also says Ben will bring one wood although the accepted obligation is
repair work. Existing watch and fire duties already communicate dated destinations;
the roof needs the same real contact transition, owned separately by repair.

`autonomy_evidence/repair98-materials.ts` isolates another missing prerequisite:
Ada's target is a house, Ben initially remembers both that house and a usable tree,
and he starts empty-handed. The actual request #11 is accepted at 37, commitment
#12. At 100 the only repair material need is planks, although acceptance relied on
the known wood and the physical repair handler supports a lower-gain wood patch.
The only legal choices are exploration and wandering. No free material is added;
the ledger balances (`autonomy-repair98-materials.log`, expected failure).
Thus communicating the target alone is insufficient for this accepted fallback.

## Contract to implement after the rules-97 continuation is pinned

An actual accepted roof request communicates only the asker's dated home belief,
including the stated condition, preserving source and observation time. A helper's
newer personal observation wins. No current remote home state may be read to fill
the gap. Unknown or invalid destinations cannot silently become known. The helper
must physically reach the home and spend available materials and work. Missing
material must use existing known-source/store acquisition, with reservations and
capacity intact. Actual collapse, changed condition, conflicting commitments and
urgent needs must retain truthful partial work, interruption or cancellation.
For a duty accepted on the existing wood fallback, the helper must be able to
obtain that actual wood even when no plank supply or workshop is known. Prefer
already available proper material, preserve its better gain and avoid redundant
gathering when an appropriate uncommitted repair material is in hand.

Check acceptance without an initially known destination, costly acquisition,
physical repair, actual later home use, save during travel and paid repair, pure
inspection, legal AI replay and visible speech/work/outcome. Preserve a failure
where a target or material is lost after agreement. Distinguish repairing a paid
contribution from promising a fully restored building, and audit the existing
condition threshold before changing that contract. Predeclare any such change.

At the time of this diagnosis, no rules-98 implementation, successful repaired roof
or ordinary frequency was claimed. Public/shared upkeep and ordinary household survival
remain separate programme requirements.
