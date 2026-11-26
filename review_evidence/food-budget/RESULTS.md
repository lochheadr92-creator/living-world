# Aspen daily food budget, rules 259

Day 96 to 97, arrivals on, 2,400 ticks. The day-96 rules-256 save was explicitly raised to 259. The independent unobserved replay and the observed run ended at the same serialized state and random generator state. World hash 243d5e61 also matches the prior Aspen endpoint. Engine conservation and the opening-to-closing balance of each edible item passed.

| Edible stock, in nutrition points | Amount |
|---|---:|
| Opening | 44,950 |
| Created | +19,266 |
| Consumed by all processes | −11,000 |
| Spoiled | −1,174 |
| Closing | 52,042 |

All 307 grain units harvested were existing plot stock moved to a person. Standing grain rose from 109 to 402 units. Harvest activities accounted for 6,233 person-ticks of travel and 4,313 of work. Other transfer reasons and start/end holder categories are in the JSON. The stock balance includes wild supplies and standing crops, so its closing value alone cannot establish access to food.

| Life stage | Gross metabolic demand | Nutrition taken in meals | Uncovered demand at hunger zero |
|---|---:|---:|---:|
| Child | 1,485.84 | 2,198 | 0 |
| Youth | 332.23 | 442 | 0 |
| Adult | 4,904.18 | 7,216 | 0 |
| Elder | 55.33 | 88 | 0 |

Intake counts paid meal nutrition before clamping or reserve conversion. Ledger consumption also includes recipe inputs and other uses. Demand measures actual metabolic debits, including the effects of age, activity and sleep. A hungry waking tick uses hunger below 62 during the needs update. Uncovered demand measures the deficit after available nourishment reserves, before clamping hunger to zero. Residents spent 57.92% of waking person-ticks below 62 despite zero uncovered demand at the starvation boundary.

## Reproduce

From the branch worktree, bundle the CLI with `node node_modules/esbuild/bin/esbuild scripts/food_budget.ts --bundle --platform=node --outfile=food-budget.cjs`. Run `node food-budget.cjs --load C:/dev/lw_saves/rules256/aspen-day96.save.json --rules-up 259 --days 1 --verify-twin --out aspen-day96.json`. The CLI also accepts fresh seeds and multiple days and writes one budget per interval. Figures here describe one settlement-day.
