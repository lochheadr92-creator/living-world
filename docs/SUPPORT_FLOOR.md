# Rules support floor

## Contract

The project supports numbered save and replay behavior from rules version 250 onward. A save whose `settings.rulesVersion` is an explicit number below 250 is refused before save-lineage validation, world reconstruction, or replacement of the active game. Unsupported, malformed, and future versions continue to be refused by the existing rules-version validator.

Unversioned worlds remain a separate diagnostic case. Their historical generation is unknown, so they remain unversioned and accepted; the loader does not infer that they are rules 250 or any other numbered version.

The save format version is a separate number. This change does not alter save bytes, lineage, product save format 5, simulation rules, or the versions in `SUPPORTED_RULES_VERSIONS`. It changes which numbered saves this build loads. A save at rules 250 through the current version remains loadable when that version is known to this build.

## Tests and archived pins

`npm test` runs the supported continuation pins (250 and later), alongside current contract tests. Continuation pins below 250 remain in `tests/` as historical records and stay out of the default suite. `npm run test:archive` selects them, but they are not expected to pass on a build that enforces the support floor: their saves are intentionally refused. To execute a historical continuation, use the source revision at which that pin was recorded.

The focused boundary checks live in `tests/rules_version.test.ts`, `tests/save.test.ts` and `tests/support_floor.test.ts`. They cover rules 249 refusal, acceptance of 250–256 on the current floor-stage baseline, preservation of unversioned diagnostics, and refusal before the active world changes.

## Remaining retirement work

The pre-250 gates in `src/sim/` remain in place for now. Their removal is a separate, later task, audited and changed one owning subsystem at a time. This support-floor change does not authorize a global search-and-replace or claim that the old branches have been removed.

## Default-suite audit at the load boundary

On 21 November 2026, the default suite was run on the floor-refusal worktree based on `aaedb85dc4c4ff72c569f213a81b7350c0994587` with `npm run test -- --reporter=json --outputFile=review_evidence/rules-floor-default-suite.json`. Of 3,531 tests, 3,018 passed, 509 failed and 4 were skipped. The captured failures classify as 505 cases whose loads/assertions are stopped by the new floor (431 direct refusal errors and 74 assertions expecting a successful load or a later validator), two missing gitignored evidence fixtures, and two test timeouts; one additional suite setup hook timed out. The complete per-case names and observed failure class are in `review_evidence/rules-floor-default-suite-audit.md`.

The 505 floor-related failures span 197 test files. This is not evidence that all those tests are obsolete: historical comparisons, current save-continuation contracts and malformed-save validators share low-version fixtures. Review each case before changing it. Preserve historical comparisons as archived evidence, migrate only current contracts to a supported rules version after checking their assumptions, and retain separate load-boundary tests. The default suite remains red while this inventory is reconciled. Broad gate retirement should wait until current contracts and historical comparisons have been separated.

## Follow-up verification after first repair batch

After retargeting six affected test files where their contracts remained current, the focused batch passed (80 tests). `npm run typecheck` and `npm run build` also passed. The subsequent full default run reported 3,529 tests: 3,049 passed, 476 failed, and 4 pending across 976 suites. The failed assertions comprise 412 direct below-floor load refusals, 60 expectations masked by the refusal before their intended validator or assertion, two unavailable gitignored evidence fixtures, and two timeouts. The six-file focused repair does not establish that the remaining failures are obsolete or that they can all be migrated safely. See `review_evidence/rules-floor-suite-after-batch1-audit.json` and `review_evidence/rules-floor-default-suite-after-batch1-full.json` for the captured inventory.
