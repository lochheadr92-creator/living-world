# Stage 3 chain repairs

Started 1 November 2026 on `stage-3-chain-fixes`, from `main@dbe229e` (Stage 2 integrated, rules 116).
Scope recovered from the owner's repair programme: lab provenance first; Part A F1 and A1-CART,
then the forest cart trace; Part B E2, M3, E3 and M1, then the three-seed 25-day measurement.
Two behaviour versions; each finding is a separate commit. Review evidence is preserved.
Stop at the end of the stage for the owner's integration decision.

## Lab provenance (no rules bump)

VERIFIED by code: the lab runner, seed rows and report previously carried no source provenance.
They now use `scripts/observers/provenance.ts`. The runner retains its start snapshot in
`provenance.json`; every branch row retains the seed's snapshot; the text report prints the
measurement provenance separately from report-generation provenance. Each includes HEAD,
tracked dirty paths and LF-normalised source hashes. Legacy reports explicitly say their
measurement source is unknown. Changed source is rejected at seed boundaries and before
reporting; resumption requires matching source. Existing rules/generation guards remain first.
The helper's HEAD comment now correctly describes call time.

VERIFIED: 11/11 focused provenance, CLI failure, legacy reporting and resume tests. Typecheck
uses the existing untracked `tsconfig.stage.json`, excluding `tests/zz_review_*`.
Logs are local under `stage3_evidence/` and are not committed. No simulation code changed.

## F1 (rules 117)

VERIFIED runtime logic bug: `nextProjectStep` returns a remaining quantity, but `supply`
subtracted carried inputs again. The project call now passes a zero held override under
rules 117. Older rules and `rich-no-project-acquire` retain the original path.
The untouched review probe passed five defect/control assertions with two expected contract
failures. New regressions failed before the fix; the staged lighter-pack scene now acquires
the inputs and crafts a paid hammer, conserves items and continues exactly after save/load.
Fixture correction: the review's one-stone ordinary pack weighs 10/12 and cannot fit another
3-weight stone, so its missing offer is also physically correct. The offer contract uses its
lighter pack; a separate boundary assertion preserves refusal when there is no room.
Focused project/continuation checks: 16/16 before adding the explicit full-pack boundary.
This is mechanism evidence, not an ordinary cart completion claim.

## A1-CART (shares rules 117)

VERIFIED: activating the Stage 1 todo reproduced the orphaned holder record. The spill now
passes the cart holder to the existing `makeHousePile` retagging path under rich rules 117.
The tool can then transfer out of the heap with its original record and balanced items.
Rules 116 explicitly retains the former spill; no separate version bump was needed.
Baseline and affected checks passed 142/142; the additional predecessor boundary passes
with the repaired case (2/2). Stage-scoped typecheck passed. No ordinary activation claim.

## Part A ordinary trace and predecessor pin

VERIFIED measurement: `first_cart_trace.ts stage3_evidence/part-a-forest117 117` completed
36,000 ticks (15 Normal forest days), no immigration, in 67.99 seconds. No cart plan was
adopted, so there was no selected planner/hammer transition to trace; zero carts. This is a
null opportunity result, not evidence that F1 has no effect. Exact twin/reload equality and
item conservation passed. The report retains HEAD `fb74c8c`, dirty paths and source hashes;
the script now accepts an explicit version, preserving its historical default 113.
The former rules-113 episode and all old saves/references are untouched. A rules-117
reference pins a staged mid-acquisition save through paid hammer completion and exact
continuation before Part B. The rules-116 and new rules-117 references both pass.

## E2 (rules 118, Part B)

VERIFIED: a critical thirsty person with no water lead had only idle choices while the
ordinary explore cooldown remained. New contract failed before the fix. Critical water
search now bypasses that cooldown; noncritical searches, rules 117 and the isolated
`rich-no-critical-search` removal keep it. The existing water-search purpose determines
eligibility and location; no source is supplied to the person. Baseline, water-search,
new contracts and rules-117 continuation passed 147/147; stage-scoped typecheck passed.

## M3 (shares rules 118)

VERIFIED: the new regression selected a free field whose fixed standing tile was a building
footprint. Field selection now retains that side when reachable, otherwise checks the other
adjacent sides with the existing pathfinder; no reachable side means no selected field.
The ordinary activity uses that chosen standing point. The till handler records a failed
new-field trip against a deterministic tile key in existing failure memory, suppressing
that tile for 800 ticks. Older rules and `rich-no-reachable-tilling` preserve the former path.
Six focused boundaries pass, including actual field work, exact saved continuation,
conservation, failed-tile persistence, blocked sides and predecessor/removal controls.
Baseline 135/135 and stage-scoped typecheck passed; related focused checks 29/29 before
adding the all-sides-blocked case. This does not change plot ownership or create a field remotely.

## Deferred register

- H1: no format 5 until a format-independent continuation digest (after Stage 6).
- LW-03: owner decision after the Stage 4 memo.
- F3/F4/F6: owner decision after the Stage 6 memo.
- Conception news: fix only if reproduced in Stage 4.
- Request cancellation discard: closed in Stage 2.
- Remaining suspended discards: recorded only (abort, care acquisition cancellation, plan
  hand-over, care hand-back, resume over another activity); last three are code-read leads.
- Stage 6 review-evidence note must distinguish five Stage 1 and two Stage 2 probes that
  assert repaired defects; do not edit the preserved probes.
