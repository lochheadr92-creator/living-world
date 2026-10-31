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
