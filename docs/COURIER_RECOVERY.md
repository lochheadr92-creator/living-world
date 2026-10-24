> Reconciliation 2026-10-24: historical candidate evidence below uses a conflicting
> numeric generation. This implementation applies courier recovery and store eating
> from version 11 on the local-main lineage. The old measured numbers are not new measurements.

# Recovery: full-pack construction-site courier

2026-10-23. Source: `claude/courier-promise`, commit `9651cf0f3e74b380d10a13bdbcdb138368c23cac`.
Compared with main `fb6e8a579cfc68a5c0ca7f6b124be487f4d2a1fd`.

## What was missing

Main already delivered material promises to sites. It did not convert an accepted immediate gift into a site promise when the requester could not carry it. The real conversation regression failed on main: request status `failed`, note `could not carry it`. The source branch contains one unique commit affecting social.ts, a regression, and an economy explanation.

## What was recovered and adapted

In `evaluateRequest`, after willingness and actual surplus permit a gift, the version-8 fallback can return an ordinary promise. This also keeps the exported response evaluator consistent with the conversation's eventual answer. The helper retains the goods until physically hauling them. Existing commitments, travel, delivery accounting, conversation events and inspector descriptions handle the rest.

Conditions: rich dynamics; rules version 8 or later; construction site is the matching destination; material is not food, water or a tool; requester cannot fit even one unit; helper remembers the site and a need for that item; fewer than three active commitments; personal drive below 38. Partial handovers remain unchanged. New logic uses the helper's remembered site need, not the original patch's direct check of unseen site existence. Stale beliefs can still produce promises that later fail through normal validation. This is not a claim to repair every existing knowledge boundary in request evaluation.

No new resource, teleportation, work assignment, or guaranteed completion is introduced. Requests that have already ended still pass through current main's response-time checks before any gift or commitment.

## Compatibility and evidence

- Before adding behavior, recorded version-7 natural-world save continuation at ticks 7200 and 9600, using the actual serialize/deserialize path and compact/deep fingerprints. Source revision is embedded in the fixture. Its recorder refuses overwriting or recording after version 8 exists.
- The staged full-pack conversation fails on pre-recovery main and passes with recovery. Three planks arrive at the site, the haul commitment and request finish, and the resource ledger balances.
- Saving after the promise and reloading produces byte-identical serialized state after the same continuation to delivery.
- Guard tests cover old supported versions and unversioned worlds, authored dynamics, available pack room, absent site knowledge, no remembered material need, another destination, commitment saturation and urgent needs. Removing unseen site existence does not change the new promise response in the fixture.
- Existing inspector data describes the haul destination and quantity. This is inspector-model coverage, not a rendered browser acceptance pass.

## Limits

This is a staged mechanism demonstration, not a spontaneous village observation. No new multi-seed run, construction-rate improvement or survival benefit is claimed. The source branch's historical two-seed failure counts were not imported as evidence for version 8. The source branch remains preserved as historical work; the adapted behavior now belongs to current main.

## Verification record

- Pre-change targeted conversation: failed as expected (`failed` instead of `promised`).
- Full `npm test`: 965 passed, one failed in the new unknown-site fixture because it directly removed a belief while leaving its index. Corrected the fixture to use the existing `forget` operation; no production repair or expectation weakening was needed.
- Corrected `vitest run tests/commitments.test.ts`: 34/34 passed, including all 16 recovery cases. The other 91 files passed in the full run, including historical goldens and version-1/2/3/4/6/7 continuations. The entire suite was not repeated after the test-only fixture correction.
- `npm run build` passed; final TypeScript and whitespace checks passed. Existing continuation fixtures and golden expectations were not changed.
