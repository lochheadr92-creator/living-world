# Workshop access: paired 13-day comparison

VERIFIED: The rules-257 workshop-access change and its switch-off control were run from each of six rules-256 saves with arrivals on. These are three settlements at two ages, not six independent seeds. The saves were explicitly reinterpreted at rules 257. The fixed reading and its safety clarification are in `FIX_READING.md` and `FIX_READING_AMENDMENT.md`; detailed denominators, food, travel, hash, conservation and observer checks are in `FIX_SUMMARY.json`.

| Start | Empty adult withdrawals, off | Empty adult withdrawals, on | Deaths, off → on | Hungry with no food, off → on |
|---|---:|---:|---:|---:|
| Aspen 48 | 340/1,074 (31.7%) | 124/1,196 (10.4%) | 0 → 0 | 16.25% → 14.84% |
| Aspen 96 | 1,330/3,711 (35.8%) | 405/3,353 (12.1%) | 1 → 0 | 12.10% → 10.54% |
| Gen-4 48 | 601/1,348 (44.6%) | 133/1,451 (9.2%) | 0 → 0 | 15.68% → 14.78% |
| Gen-4 96 | 1,103/2,760 (40.0%) | 399/2,704 (14.8%) | 0 → 1 | 24.91% → 23.76% |
| River 48 | 547/1,316 (41.6%) | 170/1,428 (11.9%) | 0 → 0 | 14.78% → 15.36% |
| River 96 | 504/1,514 (33.3%) | 150/2,098 (7.1%) | 0 → 0 | 28.01% → 27.80% |

The shares use sampled finished adult withdrawals; interrupted trips are included. One ending was unseen in each River 96 arm, with age not established. Thus the original `analyze_fix.mjs` exits 1 and this comparison is incomplete by those endings. End-hook details identify both as inaccessible cellar doorway failures with no goods moved, rather than empty-store withdrawals; see `DIAGNOSTIC.md`. Open activities at run end are not counted as finished.

VERIFIED: In these samples the empty share is less than half the control share in every start. Conservation passed in all 12 runs. Deaths and hungry waking time without food in the pack or home store were within the prewritten 13-day thresholds in each pair. The hunger threshold uses historical rules-256 nudge spreads; it is not a new rules-257 noise estimate. Ending store food per living person ranged 4.87–10.91 off and 5.27–11.10 on, with changes in both directions. These outcomes do not establish long-term safety or benefit.

All-age travel and company-plus-leisure are recorded descriptively in the JSON. Age-stage travel checks fail in some runs, so adult-stage travel results are not established. One run per arm and save describes those continuations; changed trajectories and the lack of fresh nudges prevent a general benefit claim.

The fix also affects recipe-input and smithy supply planning, not just direct withdrawal choices. Its remembered stock and builder-access data are observed locally and fingerprinted; existing older eligibility logic still has a separate live-builder-data dependency. The code began as a concurrent rules-257 draft; provenance and differences are described in `OVERLAP_REVIEW.md`. Both the active checkout and this branch claim 257, so integration needs an explicit conflict review. Raw run outputs remain local in `fix-runs/`.

## Verification

Typecheck passed; the focused bench, supply, rules-256 continuation and related save, knowledge, production and smithy tests passed. The full suite failed: 681 files passed, 3 failed, 1 skipped; 3,756 tests passed, 4 failed, 1 skipped. Two failed because a retained rules-107 save was absent in this checkout; after copying the existing save from the active checkout into this isolated workspace, both tests passed on retry. Rules-249 continuation and a river observer-purity test timed out during the full suite. A focused retry passed both observer-purity cases but rules-249 timed out again while concurrent work was running; it passed on a subsequent lower-contention retry in 169 seconds with its original timeout. The original full-suite result remains failed; follow-up outcomes do not turn it into a pass. Logs are `FULL_SUITE.txt`, `FOCUSED_RETRY.txt`, `FAMINE_RETRY.txt` and `V249_RETRY.txt`.
