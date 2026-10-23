# Branch lifecycle record — 2026-10-23

Owner instruction: clean up, integrate appropriate branches, and record remaining conflicting branches as superseded and historical.

## Authority and meaning

`main` is the active development line. This record supersedes active-work instructions on the historical branches below. WORKFLOW.md still governs delivery.

**Superseded here means retired as an active development line. It does not mean every unique feature was integrated, replaced, rejected on merit, or proved defective.** Merge conflicts alone establish none of those claims. Unique code and experiment evidence remain preserved at the exact revisions below. Reuse requires an explicit task based on current main, a feature-level comparison, and appropriate compatibility checks; do not wholesale merge an old line.

No simulation behavior, rules version, save semantics, goldens, or acceptance baselines changed in this cleanup.

## Incorporated branches — retired branch names

Six were already ancestors of main. The two additional candidates were reviewed and integrated in this cleanup. Their commits remain reachable through main; branch-name removal is optional housekeeping, not a prerequisite for retirement.

| Branch | Recorded tip | Disposition |
|---|---|---|
| `claude/affectionate-archimedes-a2nb1q` | `1e1e2bc57d4abd472c03760e8dbee4ff4f5e3d93` | Integrated paired lab contrasts; historical missing-metric compatibility fixed and regression-tested |
| `claude/awesome-dirac-07f8q1` | `f1e93b29140c2b6d0022ed6b0cce21e3991cf593` | Already fully incorporated before cleanup |
| `claude/dreamy-brahmagupta-o1ttw1` | `3c60fb9055410938b88796676d26cb8d36b779ed` | Already fully incorporated before cleanup |
| `claude/household-preparation-v2` | `1a1340895dc9d0d2746390dd694b3264f324acbe` | Already fully incorporated before cleanup |
| `claude/inspiring-wozniak-yclwua` | `d81c0277904304fa07b79a948283c2bbef1a8938` | Integrated three-winter report as historical evidence, with immutable evidence link and version limits |
| `claude/simulation-pressure-larger-maps-rg0hjn` | `182663db90076dcc711e0fb5116c11d78fb61e1f` | Already fully incorporated before cleanup |
| `codex/home-habitation` | `9e4165312195df26999ff79866ef5809bb280b83` | Already fully incorporated before cleanup |
| `codex/wolf-defence-integration` | `9a082d6fea0c2fd95cbd4ec568dfc5bd40883ed3` | Already fully incorporated before cleanup |

## Superseded active lines — preserve as historical

Counts below are against pre-cleanup main `287c12b58f28dc53bdcc92a067a548d0768598a6`, using `git rev-list --left-right --count` and non-checkout `git merge-tree --write-tree --name-only`. They are a dated audit, not live counters.

| Branch | Preserved tip | Unique commits | Behind | Conflicting files |
|---|---|---:|---:|---:|
| `claude/adoring-hawking-fj66vw` | `df9acb9c0f5173555980d661384208477f4c313e` | 7 | 186 | 16 |
| `claude/courier-promise` | `9651cf0f3e74b380d10a13bdbcdb138368c23cac` | 1 | 186 | 1 |
| `claude/eager-carson-p8jy0f` | `551b034e39f8d02381a7d5a148aab8e67edfc486` | 11 | 186 | 1 |
| `claude/epic-franklin-469omp` | `c55926d4052992d088ab535f1057a3c1f2938f33` | 26 | 133 | 24 |
| `claude/friendly-planck-ccpkxf` | `f133938dd8cbd91db71b2fdd9398f4c23967c603` | 2 | 129 | 9 |
| `claude/living-world-survival-legibility-xipvpo` | `06f7cc618e26e94327522e380089f8fdcf086452` | 9 | 186 | 7 |
| `claude/mood-ranking` | `4b063dca4d354684593e143886f2bbb152582c61` | 1 | 87 | 2 |
| `claude/record-2026-10-20` | `9698236af0d73c92465be9f9958f47ee6fc935c9` | 3 | 11 | 3 |
| `claude/snapshot-wolf-defence-v3-2026-10-20` | `d72e3666a1b9440438724196f6bd08706405672a` | 5 | 21 | 12 |
| `claude/snapshot-wolf-habitation-integration-2026-10-20` | `b542836587861b532da3e9b632988fcc6c94ab0e` | 1 | 15 | 11 |
| `claude/wolf-defence-v3` | `359bce916481473a4c939bfd46dd21a362a74589` | 7 | 21 | 14 |
| `claude/wonderful-mccarthy-xmbcng` | `d44695d3738ac1c1c0e3195ccf8530ed9ccfa7e3` | 14 | 186 | 20 |
| `place-scar` | `f82d42def7c975ef3b8193de27b12823e15a3c62` | 1 | 133 | 1 |

All 13 lines above are historical under the owner instruction. Their branch tips are intentionally retained. Specific cautions:

- `claude/wolf-defence-v3` was already explicitly superseded: its version 3 means wolf defence, while main version 3 means habitation. Keep experimental saves with their source revision.
- The two `snapshot-wolf-*` branches preserve experimental provenance, including incompatible rules-version meanings. Their existence is not unfinished integration work.
- `claude/record-2026-10-20` contains older agent/handoff guidance. Current main and WORKFLOW.md remain authoritative.
- The remaining lines retain unique commits whose feature coverage on main was not comprehensively audited. Retirement is an owner-directed scope decision, not evidence that those features shipped.

## Pull-request disposition

- #15 and #16: integrated by direct merges in this cleanup; close any remaining open PR state.
- #19: already incorporated into main (despite its old base branch); close as delivered.
- #1, #2, #3, #4, #5, #8, #11: close as superseded active proposals, preserving original descriptions and historical branch tips.
- #20 was already closed after direct integration. No new PR or independent approval gate is introduced.

## Validation

- The new CLI regression reproduced NaN output when the old contrast code iterated metrics absent from historical data. Using the existing recorded-metric filter fixes it.
- 10 focused tests passed: lab statistics/behavior plus CLI paired-seed intersection, contrast direction, historical missing metrics, unavailable branch, and story output.
- Production build and TypeScript check passed. Diff whitespace check passed.
- The historical report figures were checked against the retained `long_out/report.txt`; no new ensemble or current-version benefit claim was made.

## Published cleanup outcome

Verified on GitHub after publication: PRs #15 and #16 are merged; #19 and the seven superseded proposals are closed; zero open PRs remain. All historical branch tips and original PR descriptions were preserved. Remote branch names remain: the connected API exposes no branch-deletion operation and direct Git push is unauthenticated in this environment. This does not prevent integration or the lifecycle retirement above.

## Recovery follow-up — courier-promise

Owner-authorized extraction from `claude/courier-promise` completed as a bounded current-main adaptation at rules version 8. Its sole unique behavioral change was missing, reproduced, and recovered with compatibility and guard tests. The original branch stays historical; its old two-seed outcome claims were not imported as current evidence. See [COURIER_RECOVERY.md](COURIER_RECOVERY.md). The remaining historical lines have not gained a feature-coverage audit from this work.
