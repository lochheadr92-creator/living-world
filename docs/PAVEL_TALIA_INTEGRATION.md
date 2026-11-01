# Pavel and Talia integrated after Stage 3 (rules 119-121)

Owner instruction, 2 November 2026: "merge all works into main". The owner then chose the
scope: Stage 3 plus Talia and Pavel, with old and superseded branches left unmerged. Push
is withheld until the owner says otherwise.

## What was integrated

| Line | Branch tip | Branch numbering | Main numbering |
|---|---|---|---|
| Stage 3 chain repairs | `stage-3-chain-fixes` `320c521` | 117, 118 | 117, 118 (unchanged; fast-forwarded first) |
| Pavel lived life | `feature/pavel-lived-life` `c3f1310` | 117 | **119** |
| Talia childhood | `feature/talia-lived-childhood` `57ffc48` (contains Pavel) | 119 | **120** |
| Resumed gathering credit (Talia) | `57ffc48` | 120 | **121** |

Both lines branched from `dbe229e` (rules 116), so they used overlapping numbers.

## How

1. `e97f192`: on the Talia tip, move every Pavel/Talia gate, registry entry and version-specific
   test from 117/119/120 to 119/120/121, highest first. Remove the branch-local 117/119
   continuation records, which were taken on pre-integration code under the old numbers.
2. `354db6b`: merge main (Stage 3). There were four conflicts:
   - `rulesversion.ts`: combined comments; current 121; 117 and 118 supported.
   - `production.ts`: Pavel `5d0bb78` and Stage 3 F1 `52ec833` made the **same** one-line
     project-acquisition fix. Kept Stage 3's `hasProjectAcquire` (rules 117+), which covers
     119+ identically. As a result, `rich-no-lived-life` no longer removes that fix;
     `rich-no-project-acquire` does.
   - `lab.ts`, `options_work.ts`: kept both sides' imports.
3. `b123187`: save provenance. Integrated 119/120 saves carry `RULES_119_GENERATION` /
   `RULES_120_GENERATION`. Unmarked or foreign 119/120 saves are refused unchanged, following
   the 27/29 precedent.
4. `cb90ea8`: new immutable continuation references for 119, 120 and 121, recorded once on
   `b123187`. They were recorded at the integration rather than before each successor,
   because the three versions arrived together already final and gated. Each
   `scripts/v1NN_reference.ts` refuses to re-record.

## Compatibility limits

- **Unmarked 117 stays Stage 3's.** Marking it would change the recorded Stage 3 rules-117
  save digests. A branch-built Pavel "117" save that already holds lived-life state is refused
  by the company/night validators (now gated at 119). One saved before any such state exists
  cannot be told apart, and would load as Stage 3's 117. Keep branch-built Pavel saves with
  their original build.
- Branch-built Talia 119/120 saves are refused as ambiguous. They are not migrated.
- The `pavel_evidence/` and `talia_evidence/` folders and the two feature records keep the
  branch numbering. They are historical evidence and are not re-run here.
- The 121 reference is an ordinary meadow continuation (24 childhood experiences). It does
  not stage a resumed gathering; `tests/resumed_gather_credit.test.ts` covers that at 120/121.

## Verification

Run on 2 November 2026 in the isolated worktree `living-world-pavel-talia-integration`, at
`cb90ea8`. This is the same runtime as this documentation commit.

- Full suite: **391 files, 2,412 tests passed**, no skips/todos, 284.49 s
  (`vitest run tests --maxWorkers=8`). Node's existing `TimeoutOverflowWarning` appeared and
  is not a failure. Stage 3 recorded the same warning.
- This includes Stage 3's immutable 117/118 references, every older reference and golden,
  the new 119/120/121 references and the 119/120 save-provenance tests. Stage 3's 117 and 118
  references also passed on the merged runtime before the new references were recorded.
- `tsc --noEmit -p tsconfig.json` clean; `vite build` succeeded (existing chunk-size notice only).
- Reference counts equal the branch records: 119 has company 14 and night experience 3;
  120 has 24 childhood experiences.

Not done: no rendered/browser check, no long-run or ensemble measurement, no re-run of the
Pavel/Talia evidence screens. Combining Stage 3 with Pavel/Talia has no measured benefit
claim. The local log is `integration_evidence/` (not committed).
