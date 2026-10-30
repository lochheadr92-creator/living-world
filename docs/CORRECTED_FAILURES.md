# Corrected route history and current availability — rules 77

Predecessor 76 was pinned at `c1c9fcc`, from runtime `398e2a0`, before these changes. Its reference and fixtures remain
unchanged. This repair was discovered while tracing task-specific helper learning; that larger capability remains open.

## Reproduced defect and contract

Rules 76 preserves route failure history after an actual successful arrival, marking the operational failure resolved.
Most consumers already ignored resolved failures, but four direct readers did not: material promises, fetchable food,
water destination trouble and depletion news. Merely retaining history could therefore block or penalise corrected work.

`scripts/resolved_route_diagnostic.ts` is explicitly rules 76. A staged adult legally selects gathering from a known tree;
a barrier makes the actual path fail at tick 0. After the normal cooldown the barrier is physically removed and another
legal gather is selected. Actual arrival at tick 136 resolves the failure. At tick 137, `canObtain(...,'wood')` still returns
false because it reads the retained failure's original tick. Evidence: `autonomy-resolved77-before3.log`.
The initial diagnostic lacked a personally known construction need; a subsequent attempt kept the staged pause active.
Those failed fixtures remain in `autonomy-resolved77-before.log` and `...before2.log`; neither demonstrates the defect.

From rules 77, `knowledge.currentFailure` gives these four readers only unresolved failures. Historical worlds retain
their original direct-reader behavior. No history is deleted, no unseen barrier opening clears knowledge, no stock or
permission is inferred from arrival, and a newly reported failure becomes operational again. Existing cooldown intervals,
water costs, news eligibility and promise willingness are otherwise unchanged. The repair restores the material
availability check; it does not prove that someone accepted a later request or delivered its goods.

Existing modules touched, and why: `knowledge.ts` owns failure interpretation; `social.ts` and `food_help.ts` ask about
personally known obtainable supplies; `optutil.ts` ranks known water; `news.ts` selects locally known information;
`rulesversion.ts` preserves prior behavior. No new memory store, save shape or AI protocol is introduced.

## Verification and review

`tests/helpers/resolved_route.ts` reproduces the physical chain independently under 76 and 77. Five contracts cover that
matched result, full saved continuations, observer purity, conservation, missing knowledge, a newly reported failure and
the other three readers. Those latter reader tests deliberately adapt structured beliefs/history and are unit evidence,
not claims of additional physical food/water trips. Two initial test failures exposed missing/index-inconsistent water
belief fixtures; the corrected tests use the existing knowledge insertion API rather than bypassing its index.

Rendered checks: `scripts/browser/resolved_route_check.mjs`, **5/5**, with a visually inspected screenshot in
`autonomy_evidence/resolved77-rendered/`. Mara is physically beside the reached tree; the existing inspector retains the
actual tick/activity correction. Rendering preserves complete serialized state/RNG; save/load and no browser exceptions
also pass. The browser's material-availability comparison is an engine check, not a newly invented UI claim.

Review checked every direct failure reader. Care-capacity pruning concerns recipient-ID handover failures rather than
stationary route histories and needs no change. `recentFailure` and AI current-failure observation already ignore resolved
records. Route retention, later new failures and historical 76 continuation remain under their existing owners.

Full suite: **261 files / 1,748 tests passed**, 170.71 seconds (`autonomy-resolved77-full-tests.log`), including the unchanged
rules-76 reference. Final focused reader contracts: **5/5** (`autonomy-resolved77-focused2.log`). Typecheck and production
build pass (`autonomy-resolved77-typecheck.log`, `autonomy-resolved77-build.log`); the existing chunk-size notice remains
(994.83 kB JavaScript), along with the suite's pre-existing oversized-timeout warning. Whitespace diff check passes.

Fresh Normal rich worlds, immigration disabled, the same fixed five-day / 12,000-tick horizon:

| Seed | Starts toward remembered stationary destinations | Route failures / corrections | Experienced / deferred samples | Seconds |
| --- | ---: | ---: | ---: | ---: |
| river | 1602 | 0 / 0 | 0 / 0 | 86.99 |
| forest | 1467 | 0 / 0 | 0 / 0 | 26.67 |
| meadow | 1394 | 0 / 0 | 0 / 0 | 25.69 |

Each run has 2,800 person samples, 100 full-state/RNG purity checks, balanced resources and exact saved continuation.
Reports/manifests are `autonomy_evidence/r77-{seed}/report.json`; reproduce with `npx --no-install vite-node
scripts/route_learning_observe.ts -- <seed> <fresh-output>`. Implementation and tests were frozen throughout. River
overlapped the full suite; these runtimes are not a controlled performance comparison. Starts are not independent failure
opportunities. All three samples contain no route experience, so they cannot establish ordinary activation or benefit.

Long/mature-world benefit remains subject to `AUTONOMY_VALIDATION.md`. This correction does not complete A7 or the wider
prompt. Next: retain task-specific helper evidence through the existing request receipts, with ability distinct from
willingness and inability distinct from bad faith. The physical rules-76 delivery diagnostic remains valid prior evidence
(`scripts/helper_task_diagnostic.ts`, `autonomy-helper77-before.log`); its filename is historical, not a rules-77 claim.
