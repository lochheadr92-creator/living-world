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
null opportunity result, not evidence that F1 has no effect. The final world ledger records
five hammers created across the population; none can be attributed to the absent cart plan.
Exact twin/reload equality and
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

## E3 (shares rules 118)

VERIFIED: the discretionary ripe-crop offer ignored full inventory; new contract failed
before repair. The offer now reports no room when neither grain nor seed fits. Seed-only
room remains eligible, and the staged physical harvest takes only that seed and conserves
items. Old rules and `rich-no-harvest-capacity` retain the offer. Baseline 135/135 passed;
the initial extended run exposed an incorrectly overweight new seed-room fixture (water
weighs 1.5, not 1). Correcting its staged seed count left the contract unchanged; all 16
harvest/related tests then passed. Stage-scoped typecheck passed.

## M1 (shares rules 118)

VERIFIED: the elder fixture adopted an axe plan requiring 7 carried weight with capacity 6.
The private tool-plan adoption owner now compares complete recipe weight with the person's
capacity before adoption. It does not suppress feasible fetching simply because the pack
is currently occupied. A basket-assisted elder still adopts. Rules 117 and
`rich-no-tool-plan-capacity` retain old adoption. New/related contracts passed 50/50;
baseline plus final capacity contracts and rules-117 continuation passed 140/140.
Stage-scoped typecheck passed. No cart graph redesign or F3/F4/F6 policy change is included.

## Final review correction: lab loader compatibility

VERIFIED: the first provenance implementation's direct `.ts` import from `lab.mjs` failed
with native TypeScript stripping disabled. The runner now invokes the same shared helper
through a tiny `vite-node` CLI, retaining the existing JavaScript-runner/toolchain boundary.
The CLI integration regression fails before this correction and passes after it with native
stripping disabled. Six loader/report/continuation files passed 11/11; stage typecheck passed.

## Final verification and measurement

VERIFIED / TURN_INTEGRATION_VERIFIED for the bounded Stage 3 repair contracts. Full tracked
suite on runtime source `50f2f78`: **378 files, 2,360 tests passed**, no skips/todos, 449.89 s.
The preserved review probes were excluded as required. Historical goldens and all old
continuation reference files are unchanged. New immutable references are 117 and 118 only.
The stage-scoped typecheck passed; it excludes the untracked review tests and is not a claim
that those evidence probes compile. Vite's existing native-config warning and a timer-overflow
warning appeared in the full log; neither was a test failure.

All three 25-day Normal worlds completed 60,000 ticks with immigration off, exact
unobserved twins, final save round trips and item conservation. Every report names clean
HEAD `50f2f78a107718c7839a5265b041927d45545c55`, `dirty: false`, no modified tracked paths,
and **255 LF-normalised source hashes**, each independently checked against the frozen files.

| Seed | Retained rules-115 alive | Rules-118 alive | Rules-118 deaths | Carts at end |
|---|---:|---:|---:|---:|
| forest | 0 | 21 | 10 | 0 |
| river | 30 | 23 | 7 | 0 |
| meadow | 28 | 26 | 2 | 0 |

These are measurements, not pass/fail survival targets. The predecessor numbers come from
the unchanged review `agent_f/ordinary_probe_<seed>_60000.json` files. Versions 115 and 118
differ in several repairs and subsequent trajectories/births; this is not a paired ablation
and does not establish a general survival benefit or isolate any one repair. River and meadow
have fewer survivors here. Ordinary carts remain absent. The Part A no-adoption result is
reported separately above and is not replaced by these later measurements.

Local evidence (not committed): `stage3_evidence/full-suite.log`, `measurement-summary.json`,
`part-a-forest117/report.json`, `part-b-25days/production-{forest,river,meadow}/report.json`,
and `part-b-25days/reports/summary.csv`. Before/after regression logs are retained alongside.

Commands actually run from the integration checkout:

```powershell
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.stage.json
node node_modules/vitest/vitest.mjs run tests --exclude "tests/zz_review_*" --maxWorkers=4
node node_modules/vite-node/dist/cli.mjs scripts/first_cart_trace.ts -- stage3_evidence/part-a-forest117 117
& .\scripts\run_longruns.ps1 -Source "C:\dev\Claude Experiment\living-world-integrate" -OutputRoot "C:\dev\Claude Experiment\living-world-integrate\stage3_evidence\part-b-25days" -Seeds forest,river,meadow -Checks production -Days 25 -BudgetSeconds 600
```

Do not rerun observation commands into their existing evidence directories. The reference
recorders were run once with `--write`; do not re-record them to accommodate successors.

## Delivery boundary and rollback

Stage 3 remains on `stage-3-chain-fixes`; no merge or push was performed for this stage.
Main remains `dbe229e`. No Stage 4 work started. Runtime findings are separate commits:
F1 `52ec833`, A1-CART `fb74c8c`, E2 `8332614`, M3 `00219d1`, E3 `22bf6c6`, M1 `25622b2`.
Lab provenance is `caab8f2` plus the loader compatibility correction `7eaf900`.
Reference/trace records are `e7600d4` and `50f2f78`.

Rollback: revert the Stage 3 commits newest first, keeping the rule registrations and their
new reference tests together; do not relabel saves or rewrite existing references. H1/save
format is unchanged. Existing dirt and all review evidence are preserved.

After owner acceptance, the local fast-forward route is:

```powershell
git -C "C:\dev\Claude Experiment\living-world-integrate" switch main
git -C "C:\dev\Claude Experiment\living-world-integrate" merge --ff-only stage-3-chain-fixes
```

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
