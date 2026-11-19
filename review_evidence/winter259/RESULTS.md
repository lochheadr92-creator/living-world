# Keeping a workshop errand through winter

Rules 259 reduced immediate store A → B → A reversals in every start, from 377 to 30 combined. Across six equally weighted starts, people aged 12 and over spent 54.73% of waking time walking with the rule off and 54.79% with it on. The unrounded change was +0.07 percentage points. Finished workshop operations increased in all six starts. Successful withdrawals increased in five, with an especially large increase in day-96 Aspen (1,314 to 2,132).

## Where the time went

Walking fell in all day-48 starts. Aspen spent 0.63 percentage points less walking and 0.46 more resting. River spent 0.59 less walking and 0.62 more working. Gen-4 spent 0.18 less walking, 0.89 more resting and 0.64 more working, alongside decreases in eating, drinking or warming, waiting and company. Only River's walking reduction exceeded its control spread.

Walking rose in all day-96 starts, by 0.21 points in Aspen, 1.01 in Gen-4 and 0.56 in River. The latter two exceeded their control spreads. Across six starts, rest gained 0.26 points and work gained 0.17. Social contact fell 0.30, leisure fell 0.03 and waiting fell 0.16. Company plus leisure fell in every comparison. These are differences between waking-day budgets. The experiment does not establish which later trip replaced a particular abandoned trip.

## Survival and measurement limits

Day-96 Aspen crossed the predeclared adverse hunger check. Hungry waking time with no pack or home food rose by 0.93 points against a control spread of 0.55. River day 48 improved by 3.20 points against 1.92. Day-96 River recorded one death with the rule enabled and zero disabled, equalling its control spread of one. Gen-4 day 96 recorded one death in each arm. All other enabled/disabled pairs recorded zero. Cause of death was not measured.

The six starts are three settlements at two ages. In day-48 Gen-4 and River the second nudged control reached the same end hash as the enabled run. Their measured spreads rely on only one distinct nudged outcome. Exceeding the spread is a descriptive check, not a statistical significance test.

## Verification and reproduction

All 24 runs cover 31,200 ticks, including four calendar winter days and one day after winter. All 17 checks per run passed, including independent walking tallies by age, recorded withdrawal endings, category totals and conservation. All four arms per start matched on initial state and save hash. The focused observer, transport and workshop-errand tests passed (25 tests), as did TypeScript checking. This experiment did not rerun the whole suite.

The starting revision was a42f202a on codex/withdraw-baseline-20261119. The measurement-source.patch records the three modified dependency files used for the executable. Using that revision and patch, bundle scripts/workshop_winter.ts with esbuild for Node as CommonJS. For each aspen, gen-4 and river save at day 48 and 96 in C:/dev/lw_saves/rules256, run the bundle with --rules-up 259 --load <save> --arm <on|off|n1|n2> --out <seed>-day<age>-<arm>.json. The nudges are one or two extra shared-stream draws with retention enabled. All arms have arrivals on. Each raw output records the source save and executable hashes. Run node scripts/workshop_winter_summary.mjs from the branch root to regenerate the comparison.

[Fixed reading](READING.md) · [Per-start measurements](tables.md) · [Unrounded comparison](comparison.json)
