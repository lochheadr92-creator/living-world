# Living World handoff — 19 November 2026

This is a continuation snapshot made on request. Recheck Git and the source before acting: other sessions may be working in these worktrees.

## Project status and direction

Living World is an autonomous world game with few direct controls: the viewer follows recognisable people, households and lasting consequences rather than assigning jobs. `PRODUCT_VISION.md` is the authoritative product brief. The simulation contains needs, local knowledge and memories, households, building, food and production chains, seasons, relationships and childhood activities; the presence of a system does not establish reliable ordinary-world uptake or a complete player experience. The project uses a deterministic simulation, behavioural rules versions and product save format 5. Existing worlds are intended to retain their recorded rules; continuation tests and hashes check specific cases, not indefinite operation.

The larger goal is a world that can keep growing and remain interesting to watch. Long-term sustainability is not established. `docs/GROWTH_PLAN.md` records older rules-220 famines and stalled higher construction, and rules-226 growth alongside serious thirst losses in some runs; these are historical results, not claims about the current version. In the later rules-256 baseline (`review_evidence/stage1d-20261118/RESULT_step8_baseline_lab.txt`), removing grow-more reduced store food per person in all six starts; those are three settlements at two ages over 13 days. Company plus leisure was about 11–13% of waking time versus a 30% plan target, with the yardstick definition still needing reconciliation. Hunger and differences in food between starts remain concerns; causes and long-term outcomes are not established.

Six rules-256 saves (aspen, gen-4, river at days 48 and 96) are outside Git at `C:\dev\lw_saves\rules256`; `docs/SAVE_LIBRARY.md` records hashes and rebuild instructions. Those starts are useful comparisons, not six independent settlements. Rules 256 isolates random draws in several systems; its measured short-term equivalence is not a claim of world benefit. Preserve local knowledge, physical resource accounting, older rules, save/load and deterministic continuation.

## Checkout and current work

- Primary checkout: `C:\dev\Claude Experiment\living-world-integrate`, branch `main`, HEAD `83d8be2e4e9c48a419fa7e81ffa4c2967c82a48b` (claim rules 257–259 for Stage 2 trips). At inspection it was one commit ahead of the locally recorded `origin/main`; no fetch was performed, so remote current state is unknown.
- The working tree is dirty. Nothing was staged at inspection. Existing modified files: `AGENTS.md`, `docs/RULES_RANGES.md`, `scripts/lab/lab.ts`, `src/app/save.ts`, `src/sim/facilities.ts`, `src/sim/production.ts`, `src/sim/rulesversion.ts`, `src/sim/site_supply.ts`, `src/sim/smithy_iron.ts`, `src/sim/types.ts`. Existing untracked files: `docs/TRIPS_BUNDLE.md`, `src/sim/bench_access.ts`, `tests/bench_access.test.ts`. Preserve all of these; they predate this handoff.
- The uncommitted draft is Stage 2 part A, rules 257: workshop supply planning accounts for remembered earmarks and access. The draft records `held` on workshop snapshots and validates it on load; transfer rights are intended to remain unchanged. Read `docs/TRIPS_BUNDLE.md` and the actual diff for details. The pack measurement for part B is now recorded on the withdrawal branch; part C (walks) awaits its detour measurement. The document describes part A as built; this handoff did not independently verify its tests or runtime.

## Rules 257 and withdrawal worktree

`C:\dev\lw-withdraw-baseline-20261119`, branch `codex/withdraw-baseline-20261119`, was at `061ae278` when inspected for this update. Merge `8654c14f` reconciles both implementations on that branch, preserving the original draft in parent `4c1bf0bb` and the measured implementation in `0db7740f`. The reconciled workshop calculation uses builder shares remembered when seen, with remembered shares and earmarks validated and fingerprinted. For an earlier draft-257 belief that has earmarks but no builder share, builder access to free stock becomes available after a fresh sight. `review_evidence/withdraw-baseline-20261119/OVERLAP_REVIEW.md` records provenance and caveats. This is a branch merge, not integration into `main`: main still contains its separate dirty draft. Preserve it and the worktree's untracked raw `runs/`, `fix-runs/` and smoke JSON. Check both worktrees again before any action, as another session may be active.

Before reconciliation, the measured implementation's 13-day on/off comparison from the six rules-256 starts reported empty adult withdrawal shares of 7.1–14.8% on versus 31.7–44.6% off, less than half in all six starts. Conservation passed and the prewritten death and hunger limits held. The results are three settlements at two ages, not six independent seeds. One ending was missed in each River 96 arm, with age unknown; the aggregate analysis exits 1 and age-stage walking checks fail in some runs. No complete observer coverage, long-term benefit or population-level rate is established. See `review_evidence/withdraw-baseline-20261119/RESULTS.md`, `BASELINE.md`, `DIAGNOSTIC.md` and the readings. Do not assume the earlier measurements alone prove every consequence of the later reconciliation.

The Brain checkpoint reports the reconciled branch passed typecheck and all 24 workshop-access and site-supply cases, and the 13 original draft paths matched their preserved Git blobs; this handoff did not rerun them. Earlier focused and continuation tests also passed as recorded. The original full suite on the withdrawal branch failed: 681 files passed, 3 failed, 1 skipped; 3,756 tests passed, 4 failed, 1 skipped. Two missing-save cases and two timeouts passed subsequent retries after the existing save was supplied or contention reduced. Those retries do not turn the original full suite green. The main `AGENTS.md` separately documents three older failures; their cause and current status need their own investigation.

## Step 3 pack measurement

Commit `061ae278` records the measurement in `review_evidence/pack-20261119/RESULTS.md`. Across the same six 13-day continuations, a candidate that puts down spare materials near home before stocking had an optimistic upper bound of 230 out of 4,682 space-constrained tiny gathers (4.9%; under 6% in every start), even assuming free storage and no extra travel. The historical plan-above-two cohort used a different denominator: 631 of 647 such trips were to eat, and a person can eat at the source. First-day actor-local replays matched 369 departure records, unwatched end hashes and conservation. Actual spare wood, stone and seeds restored planned room in 5 of 49 eligible departures; counting all clay as disposable raised the upper bound to 13 of 49. The recorded decision rejects that narrow near-home candidate; no pack or scoring rule was added. Returning from farther away, actual travel saved and effects on hunger or survival remain unknown. Age-stage observer limitations also apply.

## Earlier baseline and open work

The prior rules-256 baseline and six-save library are documented in `docs/SAVE_LIBRARY.md` and `review_evidence/stage1d-20261118/RESULT_step8_baseline_lab.txt`. The Brain project note's latest checkpoint and the branch evidence provide dated context; repository state is authoritative. The two starts per seed are the same settlement at different ages. Prior notes report unresolved observer gaps and questions about measurement definitions. Do not infer owner approval of further rules changes, integration, push, or cleanup from this handoff.

## Verification in this handoff turn

Inspected Git status, current HEAD, recent commits and worktree list in the main checkout; inspected status, recent commits and the recorded results in the withdrawal checkout. `git diff --check` on main exited successfully, with Git line-ending warnings. No simulation, build, typecheck or tests were run in this handoff turn. The separate branch's results above are attributed to its recorded evidence, not rerun here. No source or existing work was changed, and no commit or push was made.

## Proposed next task

Inspect the latest withdrawal-branch merge and `OVERLAP_REVIEW.md`, preserve the main draft and assess the recorded verification and observer gaps before any integration or broader benefit claim. Read the completed pack result before selecting further trip work. Check whether another session or lab is active before changing code. Confirm the owner's current direction before proceeding beyond the already requested handoff. Do not treat this proposal as approval to merge or change the rules.

First command, in PowerShell:

```powershell
Set-Location 'C:\dev\Claude Experiment\living-world-integrate'
git status --short --branch
git worktree list
```

Paste-ready continuation prompt:

> Continue Living World from `docs/HANDOFF_20261119_CURRENT.md`. Read repository instructions and the current Brain workflow, inspect both named worktrees and preserve all existing changes and raw evidence. Review the reconciled rules-257 branch, the preserved main draft, the pack results and their recorded observer gaps before proposing any integration. Distinguish recorded results from checks you actually run; do not merge, push, discard work, or expand into later Stage 2 parts without the appropriate owner direction.

## Update verification — 19 November 2026

For this update, inspected both worktree statuses, the withdrawal branch history and merge metadata, the pack results, the recorded withdrawal comparison, the current Brain checkpoint and the main rules-version declaration. The main working tree declares 257 in its uncommitted draft; the committed HEAD is still 83d8be2e. No tests or simulations were rerun and no code, existing draft, commit or push was changed by this update. Recorded test results are attributed to the respective evidence or checkpoint.
