# Preserved meat, trap meat and lamb birth — 4 November 2026

Implementation starts from main `80a0c287` (rules 148), in the isolated local `living-world-survival-work` checkout. All commands ran in PowerShell on THEWEAPON. No ordinary scene received assigned actions or added supplies.

## Reproducible repaired transitions

- Rules 149 (`2447bc24`): waiting at one's processing rack is bounded to 240 ticks and saved; ingredient butchery preserves the required quantity and pays 120 work per portion. `collection-before.txt` / `batch-before.txt` contain failed-before evidence. `final149-targeted.txt` passes 95 tests in eight files. `build149-final.log` and its exit record pass. `render149b/report.json` passes four checks (screenshots inspected).
- Rules 150 (`6893956a`): a checked, known trap catch routes to paid recovery before reset; an exhausted body record does not permanently block reset. `trap-before.txt` reproduces two failures. `trap-regression.txt` passes 38 tests in six files; build passes. `trap-autonomy.json` compares the same staged opportunity: two meat meals and five refused resets at rules 149; three meals and no refused resets at rules 150. Four rendered checks pass in `render150/`.
- Rules 151 (`5fe3f330`): existing known food routes are compared with slaughter plus recovery time. A no-slower meal defers killing owned sheep, including pregnant ewes; absent or distant alternatives retain slaughter. `lamb-before.txt` reproduces three failures. `lamb-after.txt` passes 32 tests; `lamb-final.txt` passes eight tests including the autonomous birth and immutable reference. `lamb-diagnostic-150.json` has pregnancy loss; `lamb-diagnostic-151.json` has a birth at tick 10353 with parents 5 and 6, exact unobserved twin and conservation. Five rendered checks pass in `render151/`; the birth screenshot was inspected.

## Final-source staged checks

`preservation-final151.ts`, `trap-final151.ts` and `lamb-diagnostic.ts` run through the ordinary decision/step pipeline after clearly labelled finite setup. Run them with `node node_modules/vite-node/dist/cli.mjs <script>` from the repository root. Their JSON/log files are evidence, not alternative test expectations.

- Shelf/carried raw meat: each makes and eats two dried-meat portions. The body-origin scene instead makes/eats rendered fat and eats raw meat; preserved-meat uptake remains null there. No demand scores were raised to make that scene pass.
- Checked trap: three attributable meat meals from its finite body, four meat/one hide/one fat recovered, three total trap cycles. Starting meat is zero and the only meat creation in this fixture is the actual trapped deer. All subsequent choices are autonomous.
- Sheep: autonomous acquisition, paid care and mating, followed by birth. Later both parents are slaughtered as food availability falls; the lamb survives to day 8 but remains untethered. This establishes a birth path, not a sustainable flock.

Each final staged script checks conservation and/or exact twins as recorded in its JSON. The preservation script checks observer purity at every sample. Contract tests also cover save/load during rack waiting, partial butchery, pregnancy and after birth. Immutable rules 148–151 references are retained; successor code never regenerates an older reference.

## Ordinary screens and scope

The predeclared screens are forest, river and meadow, Normal, all current systems on, arrivals on, 25 days. `scripts/ready_step_observe.ts <seed> <fresh-output> 25 7200` runs an exact unobserved twin, samples pure observation every 120 ticks, checks conservation and exact save continuation for 120 ticks, and verifies its source manifest is unchanged. A final report is written only after those assertions. Detached launch exit codes were not captured; the reports' `stop: horizon` and assertion completion are the evidence. All original failed launch logs are retained.

Final regression: **488 files, 2,860 tests passed**, zero failures. `full-suite-run.json` records exit 0, THEWEAPON and unchanged source/config hashes. Typecheck/build pass (`build151.exit.txt`: 0). All 13 rendered assertions across the three scenes pass. Verification verdict: **TURN_INTEGRATION_VERIFIED** for the bounded repairs and staged causal chains; ordinary activation/reliability and mature-world benefit remain inconclusive.

| Rules | Seed | Day | People alive | Target-chain activation |
|---|---|---:|---:|---|
| 148 | forest | 25 | 5 | None |
| 148 | meadow | 25 | 21 | None |
| 148 | river | 25 | 26 | None |
| 149 | forest | 25 | 5 | None |
| 149 | meadow | 25 | 21 | None |
| 149 | river | 25 | 26 | None |
| 151 | forest | 25 | 5 | None |
| 151 | meadow | 25 | 21 | None |
| 151 | river | 25 | 26 | None |

All nine runs completed at tick 60,000 with 500 pure observation checkpoints each, exact unobserved twins, conservation and 120-tick saved continuation. Rules 148/149 have identical final state after removing only their explicit rules labels (`rules148-149-state-comparison.json`). No aggregate benefit follows from these target-chain nulls. No mature Normal/Large benchmark or completion of the older frozen benefit cohorts was performed in this task.

## Review and retained failures

A fresh review traced ownership, current physical access, bounded time, per-portion conservation, interruption, saved state and old-rule gates across the three repairs. No valid failing test was deleted. The existing carcass-supply fixture was adapted to collect the same required total under quantity-aware butchery. A trap purity assertion was corrected to compare state before calling the state-changing action constructor. The first rendered rack check incorrectly queried a hidden panel; its retained failed result is superseded by the visible-page assertion in `render149b`.

The first full-suite process exited 1 (`vitest-process-exit.json`); a Windows PowerShell 5.1 native-stderr warning also aborted its wrapper and left the intended log empty. The preserved cache and focused reproductions identify two failing files: five attribution assertions lacked three historical transcripts, and two famine diagnostics lacked their retained rules-107 save. The exact transcripts were restored through sparse checkout; the ignored local famine save was copied unchanged from main (`restored-fixture.json` records matching hashes). The affected files then passed with no test or runtime edits. Stale deleted-file failures in the shared Vitest cache were excluded from that diagnosis by checking actual file existence.

The final full-suite runner is `run-full-direct.ps1`, which captures native stdout and stderr directly and asks Vitest to write `full-suite.json`. Its source/config/fixture hashes are in `final-source-and-fixtures-manifest.json`; `full-suite-run.json` records the command, host, exit status and unchanged-manifest check. Full output remains in `full-suite.stdout.log` and `full-suite.stderr.log`. The four restored fixtures are test-environment requirements, not new game content.

Final-source rendered repeats pass four checks in `render151-preservation-cold/` and four in `render151-trap/`, alongside the five birth checks in `render151/`. The new waiting and post-meal screenshots were inspected. The preservation fixture initially reported an unknown activity against the long-running development server; explicitly loading handlers alone did not resolve it, while the same source and check passed after restarting that server. Both failed attempts are retained. This was a rendered harness/development-server state failure; no game code was changed.

Evidence integration preserves the two older diagnostic JSON files as `baseline148-autonomy-diagnostic.json` and `baseline148-autonomy-with-water.json`. The original five-test red fixture is preserved verbatim as `initial-preservation-collection.test.ts.txt`. `copied-evidence-manifest.json` records source paths, destination paths and verified SHA-256 hashes for both worktrees. Runtime/test Git blobs on main match the tested `5fe3f330` source; subsequent integration changes only documentation and evidence.
