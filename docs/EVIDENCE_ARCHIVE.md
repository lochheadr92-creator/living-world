# Evidence archive

Measurement output from past runs and reviews used to sit in `*_evidence` folders at the repository root. On 28 November 2026, on Ryan's word, the folders no test reads were taken out of the tree to make the repository easier to read.

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

## Still in the tree

`autonomy_evidence`, `civic_evidence`, `inhabitant_evidence`, `review_evidence`, `viewer_evidence` (read by tests and scripts in many places; a later pass keeps only the files read) and `wolf_evidence` (15 files; a browser script reads one of its subfolders by default).
