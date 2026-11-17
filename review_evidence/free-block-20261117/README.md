# Free block experiment, 17 November 2026 (SCRATCH ONLY, rules 250)

Evidence for the branch `scratch/free-block-20261117`: one gate tested in scratch, on the day 48 saves of three worlds (aspen, river, gen-4), 30 days a run, one run per arm. A description, never a rate. No benefit is claimed. Nothing here is a rules version, a pin or a lab arm, and the branch is a record, not a proposal for main.

The question: with stocking and production work switched off for part of the day, do residents fill the time with company and leisure? `src/sim/free_block.ts` removes options that would start new stocking or production work, from a day fraction until the person's own bedtime, for people of 12 and over.

## What was found
- `believed-fed/` (16 runs: controls A, N1, N2, arms D from 0.62 and E from 0.50 of the day, an aspen D repeat). The gate applied only to people who are safe and believe their household holds a day of food a head. Verdict by the fixed reading: **GATE RARELY ACTIVE** in 3 of 3 worlds; the predicate held for 9 to 19% of window person-ticks, almost every failure being "household short of food" by the person's own belief. Life time (social contact plus leisure, people of 12 and over) moved +0.3 to +0.5 points against nudge spreads of 0.3 to 1.0.
- `upper-bound/` (6 runs, the same controls): the gate on for every safe person in the window whatever they believe. The reading was written first (`briefs-and-readings/FREE_UPPER_READING.md`, SHA-256 `07f7cad94eabe5c8af9d0aa2939613a3c6f7f0dd6d896498b37c324af806f625`). Verdict: **NOT OPENED**; life +5.2 to +6.9 points in the 0.50 arm, above the noise and below the 8 point bar (missed by 1.1 to 2.8 points); no deaths, but 16% to 33% fewer jobs finished, a thinner store at day 30, and gen-4 past the hungry-with-no-food limit.

## What is here
`briefs-and-readings/` the brief and the upper-bound reading; `scripts/` the launchers and the tables scripts (they hold the absolute paths of the scratch folder); `believed-fed/` and `upper-bound/` the reports, tables, commands, process ids and the before and after checks; `believed-fed/classification.md` the 110-row table of every option site, gated or kept.

## What is not here
The 22 run folders (`report.json`, `trips.jsonl`, `meals.json`, provenance, 876 MB), the day 48 saves and the scratch logs stay in `C:\dev\_claude_scratch\regime-20261117\` (`out\free`, `out\free-upper`, `saves`, `logs`) on TheWeapon. They are not in git. The brain note `projects/claude-living-world` has the ninth and tenth checkpoints of 17 November.
