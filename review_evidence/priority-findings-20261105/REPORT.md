# Thirty-day life-stage investigation

Frozen commit `79e3ac402ebd93812c93b53c7947e406649dbafe`, rules 153. Six planned natural worlds: three fixed seeds on Normal and Large profiles, 30 elapsed days, rich dynamics, arrivals on, harsh off. No external control or staged population/resources.

Normal: 80×80, 28 founders, one camp. Large: 160×160, 100 founders, four camps. Seed names are procedural identifiers, not guaranteed biome labels. This changes several map/population conditions together and does not isolate map size as a cause.

The prior five-day report used rules 155. It is contextual evidence, not a same-version before/after baseline. Each initial focal person remains followed through ageing and death; no survivor replacement. Missing initial teenagers remain explicitly absent. Cohort tables classify all founders by their initial stage and exclude later arrivals/births; total population includes them.

Original runs completed with all original checks: 5/6. Thirty-day outcomes available including the separately labelled supplemental continuation: 6/6.

| Profile / seed | Day 5 population | Day 15 | Day 25 | Day 30 | Founders alive / initial |
|---|---:|---:|---:|---:|---:|
| normal / forest | 28 | 27 | 6 | 7 | 6/28 |
| normal / river | 28 | 29 | 26 | 24 | 22/28 |
| normal / life-stages-6 | 31 | 32 | 23 | 24 | 19/28 |
| large / forest | 103 | 112 | 0 | 0 | 0/100 |
| large / life-stages-6 | 106 | 123 | 125 | 131 | 91/100 |
| large / river (supplemental) | 107 | 119 | 118 | 76 | 63/100 |

## Integrity exceptions

The following original attempts failed. Any separately labelled supplemental continuation is additional evidence, not a retroactive pass:

- large/river: exit 1; see `logs/large-river.log`. Large river failed exact observed/unobserved twin equality at tick 45600 (elapsed day 19). A separate diagnostic in `diagnostic/large-river/` retains its own provenance; it is not silently substituted for this original run.

## Founder cohorts

Time percentages cover each founder while alive, grouped by initial stage. Activity time includes travel and waiting while that activity is selected: warming time is not necessarily all spent at a fire. Age, traits, skills, household, camp and supplies differ. These are descriptive observations, not causal age comparisons. Low-need values mean below 20/100; higher needs are better.

| World | Initial stage | Survived | Warming activity % | Food below 20 % | Warmth below 20 % | Social below 20 % | Death causes |
|---|---|---:|---:|---:|---:|---:|---|
| normal/forest | child | 3/9 | 8.33 | 7.79 | 7.99 | 2.38 | {'hunger': 4, 'wolf attack': 2} |
| normal/forest | adult | 3/17 | 6.34 | 9.78 | 7.04 | 3.59 | {'hunger': 13, 'fever': 1} |
| normal/forest | elder | 0/2 | 2.85 | 8.99 | 5.51 | 0.0 | {'hunger': 2} |
| normal/river | child | 7/8 | 8.68 | 5.98 | 5.35 | 1.23 | {'hunger': 1} |
| normal/river | adult | 15/18 | 6.62 | 6.22 | 5.47 | 4.93 | {'hunger': 2, 'injuries': 1} |
| normal/river | elder | 0/2 | 5.9 | 11.38 | 10.71 | 3.13 | {'exposure': 1, 'fever': 1} |
| normal/life-stages-6 | child | 2/7 | 9.3 | 8.83 | 8.58 | 0.83 | {'hunger': 4, 'exposure': 1} |
| normal/life-stages-6 | youth | 2/2 | 8.12 | 4.67 | 3.55 | 5.78 | {} |
| normal/life-stages-6 | adult | 14/17 | 6.3 | 5.71 | 6.48 | 3.51 | {'hunger': 3} |
| normal/life-stages-6 | elder | 1/2 | 9.94 | 12.91 | 9.06 | 11.38 | {'hunger': 1} |
| large/forest | child | 0/30 | 4.59 | 10.98 | 4.07 | 0.35 | {'fever': 1, 'hunger': 22, 'thirst': 1, 'wolf attack': 3, 'exposure': 3} |
| large/forest | youth | 0/3 | 4.34 | 12.58 | 3.43 | 4.49 | {'hunger': 1, 'exposure': 2} |
| large/forest | adult | 0/60 | 4.06 | 9.77 | 4.66 | 3.21 | {'hunger': 38, 'exposure': 7, 'thirst': 1, 'fever': 5, 'wolf attack': 9} |
| large/forest | elder | 0/7 | 5.06 | 11.91 | 4.35 | 5.62 | {'hunger': 6, 'thirst': 1} |
| large/life-stages-6 | child | 16/21 | 6.36 | 2.24 | 2.57 | 0.1 | {'wolf attack': 3, 'hunger': 1, 'fever': 1} |
| large/life-stages-6 | youth | 6/6 | 2.83 | 2.59 | 1.59 | 1.33 | {} |
| large/life-stages-6 | adult | 62/64 | 3.18 | 1.85 | 2.13 | 1.43 | {'hunger': 2} |
| large/life-stages-6 | elder | 7/9 | 3.33 | 3.62 | 3.02 | 2.68 | {'hunger': 2} |
| large/river (supplemental) | child | 16/28 | 8.74 | 7.17 | 1.71 | 1.29 | {'hunger': 10, 'injuries': 1, 'wolf attack': 1} |
| large/river (supplemental) | youth | 2/2 | 7.13 | 2.24 | 0.78 | 1.24 | {} |
| large/river (supplemental) | adult | 42/62 | 5.8 | 7.19 | 1.51 | 5.4 | {'hunger': 15, 'wolf attack': 4, 'injuries': 1} |
| large/river (supplemental) | elder | 3/8 | 8.4 | 8.29 | 2.24 | 6.09 | {'hunger': 5} |

## Focal lives

### normal / forest

- **Hana**, initially child, age 10.1: alive, health 58.7. Warming occupied 6.67% of time alive. Capacity 5→9 at last living daily sample. Transitions: [{'tick': 54657, 'from': 'child', 'to': 'youth'}]. See the world's report.json for daily local perspectives and timestamped events.
- youth: absent at the start; no invented or replacement person.
- **Edda**, initially adult, age 35.3: died at elapsed day 22.13: hunger. Warming occupied 7.68% of time alive. Capacity 12→12 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Petra**, initially elder, age 66.5: died at elapsed day 22.72: hunger. Warming occupied 5.13% of time alive. Capacity 6→6 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.

### normal / river

- **Ivo**, initially child, age 10.8: alive, health 100.0. Warming occupied 6.73% of time alive. Capacity 5→9 at last living daily sample. Transitions: [{'tick': 35163, 'from': 'child', 'to': 'youth'}]. See the world's report.json for daily local perspectives and timestamped events.
- youth: absent at the start; no invented or replacement person.
- **Cora**, initially adult, age 31.8: alive, health 100.0. Warming occupied 8.07% of time alive. Capacity 18→18 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Milo**, initially elder, age 70.7: died at elapsed day 22.71: exposure. Warming occupied 6.55% of time alive. Capacity 6→6 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.

### normal / life-stages-6

- **Zed**, initially child, age 9.8: alive, health 100.0. Warming occupied 9.66% of time alive. Capacity 5→9 at last living daily sample. Transitions: [{'tick': 62220, 'from': 'child', 'to': 'youth'}]. See the world's report.json for daily local perspectives and timestamped events.
- **Cass**, initially youth, age 15.9: alive, health 100.0. Warming occupied 5.46% of time alive. Capacity 9→18 at last living daily sample. Transitions: [{'tick': 2801, 'from': 'youth', 'to': 'adult'}]. See the world's report.json for daily local perspectives and timestamped events.
- **Alma**, initially adult, age 34.6: alive, health 79.9. Warming occupied 5.92% of time alive. Capacity 12→12 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Kai**, initially elder, age 73.3: died at elapsed day 10.88: hunger. Warming occupied 11.44% of time alive. Capacity 6→12 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.

### large / forest

- **Zeke**, initially child, age 6.0: died at elapsed day 20.00: fever. Warming occupied 8.01% of time alive. Capacity 5→5 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Tomas**, initially youth, age 15.1: died at elapsed day 20.63: hunger. Warming occupied 6.6% of time alive. Capacity 9→18 at last living daily sample. Transitions: [{'tick': 25905, 'from': 'youth', 'to': 'adult'}]. See the world's report.json for daily local perspectives and timestamped events.
- **Orla**, initially adult, age 42.7: died at elapsed day 22.53: hunger. Warming occupied 6.16% of time alive. Capacity 12→18 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Milo**, initially elder, age 72.3: died at elapsed day 22.02: hunger. Warming occupied 6.28% of time alive. Capacity 12→12 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.

### large / life-stages-6

- **Fenn**, initially child, age 6.9: died at elapsed day 23.73: hunger. Warming occupied 2.65% of time alive. Capacity 5→5 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Kira**, initially youth, age 13.5: alive, health 100.0. Warming occupied 0.72% of time alive. Capacity 9→12 at last living daily sample. Transitions: [{'tick': 70818, 'from': 'youth', 'to': 'adult'}]. See the world's report.json for daily local perspectives and timestamped events.
- **Ines**, initially adult, age 34.7: alive, health 100.0. Warming occupied 1.39% of time alive. Capacity 12→18 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Pavel**, initially elder, age 66.1: died at elapsed day 23.15: hunger. Warming occupied 1.47% of time alive. Capacity 6→12 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.

### large / river (supplemental)

- **Brigid**, initially child, age 6.6: alive, health 93.4. Warming occupied 4.76% of time alive. Capacity 5→5 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Zora**, initially youth, age 14.0: alive, health 78.1. Warming occupied 0.45% of time alive. Capacity 9→12 at last living daily sample. Transitions: [{'tick': 56945, 'from': 'youth', 'to': 'adult'}]. See the world's report.json for daily local perspectives and timestamped events.
- **Una**, initially adult, age 41.7: alive, health 34.0. Warming occupied 3.68% of time alive. Capacity 12→18 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.
- **Ben**, initially elder, age 66.9: died at elapsed day 24.95: hunger. Warming occupied 10.33% of time alive. Capacity 12→12 at last living daily sample. Transitions: []. See the world's report.json for daily local perspectives and timestamped events.

## Integrity and limitations

Each completed original world passed exact daily unobserved-twin comparisons, daily conservation, daily pure selected-inhabitant observations, unchanged frozen TypeScript source, and exact 120-tick save/reload continuation. The supplemental Large river continuation, if present, uses parsed-state equality with arrays in order and reports its exact mismatches separately in DIAGNOSTIC_FINDINGS.md; it must not be counted as passing all original checks. These are runtime checks, not a rerun of the full software test suite.

Independent dependencies and frozen source live in this investigation folder outside the development checkout. At most two below-normal-priority workers were used. No game code, Git refs, shared server or Brain document was changed by the investigation.

Raw files: protocol.json; driver-status.json; logs/; summary.json; results/<profile>-<seed>/{selection,initial,final,report,progress}.json; source.zip; observe.ts; driver.mjs. Interpret selected anecdotes alongside whole-founder cohorts and retain adverse/null results. Thirty days does not establish long-term viability, and three seeds are a small sample.

Further interpretation: `NORMAL_FINDINGS.md`, `LARGE_FINDINGS.md`, `DIAGNOSTIC_FINDINGS.md`, and `METHOD_LIMITS.md`. `PROGRESS.md` records final completion and remaining interpretation limits.
