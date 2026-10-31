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
suite is recorded separately. This repairs the load failure; the failed forest
45-day measurement reports must still be re-run on the corrected frozen source.

Existing modules touched: `constants.ts`, because it owns the item vocabulary used
by all affected validators and accounting. No validator is bypassed or receipt removed.
