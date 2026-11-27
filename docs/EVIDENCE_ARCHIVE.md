# Evidence archive

Measurement output from past runs and reviews used to sit in `*_evidence` folders at the repository root. On 28 November 2026, on Ryan's word, they were taken out of the tree in two passes (11,896 files) to make the repository easier to read. New measurement output belongs outside the repo, in `C:\dev\lw_labs`.

Nothing is lost. The tag `pre-evidence-prune-20261128` is the last commit holding every folder. To read one:

```
git show pre-evidence-prune-20261128:chain_evidence/<path>
git checkout pre-evidence-prune-20261128 -- chain_evidence     # restore a whole folder
```

Docs and code comments that cite a removed folder mean that folder at this tag.

## Removed (first pass, 28 November 2026)

No test or doc check reads these. Ten browser and probe scripts use one of them as a default output folder; the folder is created again when such a script runs.

`animation_evidence`, `cart_evidence`, `chain_evidence`, `civic_food_evidence`, `continuity_evidence`, `customers_evidence`, `fatal_evidence`, `food_help_evidence`, `habitation_evidence`, `home_evidence`, `integration121_evidence`, `p01_evidence`, `pavel_evidence`, `relocation_evidence`, `shelter_evidence`, `stage3_evidence`, `survival_evidence`, `talia_evidence`, `technique_evidence`, `transport_evidence`, `verification_evidence`, `winter_reserve_evidence`.

Two single files stay because something reads them:

- `survival_evidence/gear-ownership-trace/final.json` (`scripts/gear_attempt_trace.ts`)
- `verification_evidence/forest-save-20261031/rejected.json` (`tests/zz_review_main_toolreport_saves.test.ts`)

Untracked leftovers that sat in those folders were moved to `C:\dev\_lw_archive\folders-20261128\evidence-leftovers` on Ryan's PC.

## Removed (second pass, 28 November 2026)

`review_evidence` (7,419 files), `inhabitant_evidence`, `autonomy_evidence`, `civic_evidence`, `viewer_evidence`, `wolf_evidence`: 8,673 files. No test in `npm test` reads them; the full suite passed without them.

What still names them:

- Code comments in `src/sim` and `tests` cite them as the origin of a rule or a test. Read those at the tag.
- About 30 browser checks and scene scripts write into them by default; the folder is created again when one runs.
- About 25 one-off probe and table scripts read an earlier run's output from them (for example `scripts/visit_door.ts`, `scripts/aspiration_tables.mjs`, `scripts/inhabitant_f1_replay.ts`, `scripts/recovered_wells_rank.ts`). Run those from the tag: `git worktree add <dir> pre-evidence-prune-20261128`.

`npm run test:evidence` reads local, never-tracked files in `autonomy_evidence/helper-receipt107-first-invalid/`; that folder stays on Ryan's PC. Every other untracked leftover was moved to `C:\dev\_lw_archive\folders-20261128\evidence-leftovers`.

The only `*_evidence` files still tracked are the two single files kept in the first pass.

## Removed (run output at the root, 28 November 2026)

Nine output folders (`gate_v2_unversioned`, `gate_v35`, `learn_out`, `noask_out`, `prep_out8`, `prep_out12`, `stage4_pilot_out`, `stage4_pilot2_out`, `town_out`) and 22 loose files (the `autonomy-*.err` and `autonomy-*-processes.json` run logs, `fix-smoke-*.json`, `smoke.json`, `connection-civic-food-diagnosis.json`): 221 files. Nothing in the code reads them. `experiments/` stays: `tests/inhabitant_attribute.test.ts` reads its transcripts.
