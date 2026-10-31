# Heard roof-repair duties: next bounded transition

## Owner-requested checkpoint — 31 October 2026

Rules 98 is now implemented and committed as an **as-is handoff**, not a completed
release claim. The diagnosis/contract below is retained as historical provenance.
Focused checks passed 45 tests, rendered checks 8/8, and typecheck/build passed.
Three ordinary five-day observations conserved resources but did not establish an
actual new requested-repair chain. Full regression completion, final review and
the immutable rules-98 reference remain to be confirmed/completed by the successor.
Exact changed files, evidence and next steps: [Claude handoff](CLAUDE_AUTONOMY_HANDOFF.md).

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
