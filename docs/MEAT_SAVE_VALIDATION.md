# Meat receipts and complete resource validation

## Failure and cause

The rules-107 forest 45-day screens at `056dbac` all reached final save validation
and failed with `Invalid helper direct receipt`. A separate ordinary forest audit,
without supplies, controllers or induced choices, checked every 120 ticks and
retained the first invalid saved state at tick 43,440. Request 15,700 records an
actual partial care delivery: Ada (911) gave Viktor (916) one meat in conversation
15,695 at tick 43,325. Two were requested and offered; one was delivered.

Meat is a valid `FoodKind`/`ItemKind`, with nutrition and weight, but `ALL_ITEMS`
omitted it. That list owns receipt/lead/journey/production validation, conservation
reporting and the debug table. No decision or mutation path iterates it. The
historical `FOODS` decision list is deliberately unchanged in this correction.

## Correction and evidence

`constants.ts` includes meat in the complete item vocabulary. No simulation rule,
schema migration or protocol change is required: valid saved evidence is accepted
and existing meat is checked by conservation. Unknown items remain rejected.

Three regression tests failed before the correction and pass afterwards: vocabulary
completeness/uniqueness against the typed weight table; an exact meat-receipt
roundtrip with rejection of an invented item; and detection of an unaccounted unit
of meat followed by balanced explicit accounting. These are isolated schema and
accounting fixtures, not claims of physical food production.

The actual captured forest save is retained locally in the integration checkout at
`autonomy_evidence/helper-receipt107-first-invalid/final.json`, SHA-256
`c24c9d0e40b60ec9d50e9cbee88f7b01969338dd9e00fd3a8218d383c7d3fa9b`.
`scripts/item_save_audit.ts` loads it unchanged: meat created 4, currently held 4,
consumed/spoiled/initial 0. All item totals balance. Exact load, 1,200-tick twin
continuation, final reload and conservation pass. The retained river and meadow
day-45 saves pass the same checks (both contain no meat). Full saves stay local.

Focused verification: 20/20 tests across meat validation, helper learning, home
replacement candidate and the immutable rules-107 continuation. The wider current
suite is recorded separately. At that checkpoint, the failed forest 45-day
measurement reports still needed rerunning on corrected frozen source. Those
separate runs are now retained at `0182849` and recorded in `AUTONOMY_VALIDATION.md`.

Existing modules touched: `constants.ts`, because it owns the item vocabulary used
by all affected validators and accounting. No validator is bypassed or receipt removed.

## Follow-up on the owner's returned batch, 31 October 2026

The batch `living-world-longruns-20261031-212947-395` was still pinned to `056dbac`.
Its checkout, reports, logs, final saves and ZIP are preserved. An every-tick audit
against that exact source newly captured the first rejection at world tick 43,326,
immediately after the receipt at 43,325 described above. This narrows the earlier
120-tick sampling result without replacing it. The captured file is
`verification_evidence/forest-save-20261031/rejected.json`, SHA-256
`e6c8958a778f86d64e03f5144ec32a0912969c4ec0a68d6dd3182db8a87dc5c2`.
Current main at `57f4ca2` already includes `0182849`; no second runtime fix or
rules bump was needed. `scripts/item_save_audit.ts` accepts the captured bytes
unchanged, preserves exact 1,200-tick twins and final reload, and balances all
items (four meat created and held at capture).

Three new engine-path regressions in `meat_item_validation.test.ts` exercise an
offered food request, spoken response and actual meat hand-over at rules 78, 107
and current rules 110, then exact save/load and 120-tick continuation. They add
physical-path coverage to the existing isolated schema/accounting tests.
Focused meat/helper/runner checks pass 15/15; save, economy, food help and immutable
78/107/110 continuation checks pass 31/31; typecheck passes. No expected reference
was changed. See `LONG_RUN_BATCH.md` for the distinct exit-code repair.

All three already-retained corrected forest day-45 reports at `0182849` were
inspected again: horizon 108,000, 900 purity checks, equal twins, balanced resources,
and identical final-save SHA-256
`d6b77277899998e43f3818093b86838f0e9aaffbc572d5ab889d2aaf564c1f62`.
Those existing measurements were not rerun. They end with four living people and
27 deaths; accepting valid saves does not establish population viability.
