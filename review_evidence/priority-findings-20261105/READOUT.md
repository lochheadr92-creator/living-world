# Thirty-day villager investigation: comparison and interpretation

Completed locally on THEWEAPON on 5 November 2026 (Brisbane time). Three fixed seeds were run on Normal (80×80, 28 founders, one camp) and Large (160×160, 100 founders, four camps) profiles. Rich dynamics and arrivals were on, harsh mode off. There was no intervention in decisions, resources or population.

The frozen source was commit `79e3ac402ebd93812c93b53c7947e406649dbafe`, rules 153, exported outside the development checkout with independent copied dependencies. This is not a comparison of current main with the earlier five-day rules-155 visit. No game code, Git refs, Brain notes, shared server or other agent process was changed. At most two below-normal-priority workers were used.

## World outcomes

| Profile / seed | Final total population | Original founders surviving | Reading |
|---|---:|---:|---|
| Normal / forest | 7 | 6/28 | Severe second-winter collapse |
| Normal / river | 24 | 22/28 | Most founders survived |
| Normal / life-stages-6 | 24 | 19/28 | Substantial losses, particularly children and an elder |
| Large / forest | 0 | 0/100 | Extinct by day 24 |
| Large / life-stages-6 | 131 | 91/100 | Strong overall survival, with serious individual failures |
| Large / river, supplemental | 76 | 63/100 | Still declining at day 30; original exact-check exception below |

Total population includes later arrivals and births; the founder column prevents them from hiding original losses. Seed names are identifiers, not biome settings. Map profiles change area, founder population, camps and generated layout together, so this is not a causal test of map size.

| World | Initial children | Initial youths | Initial adults | Initial elders |
|---|---:|---:|---:|---:|
| Normal / forest | 3/9 | None present | 3/17 | 0/2 |
| Normal / river | 7/8 | None present | 15/18 | 0/2 |
| Normal / life-stages-6 | 2/7 | 2/2 | 14/17 | 1/2 |
| Large / forest | 0/30 | 0/3 | 0/60 | 0/7 |
| Large / life-stages-6 | 16/21 | 6/6 | 62/64 | 7/9 |
| Large / river, supplemental | 16/28 | 2/2 | 42/62 | 3/8 |

These are survivors/initial cohort. People age during the run: 30 days spans 2.5 simulated years. All founders were tracked, alongside one preselected person of each stage where present. Nobody was replaced after death. The first three selected normal-map children all survived, although only 12/24 initial children on those maps survived. Selected anecdotes alone would have overstated child welfare.

## The most revealing life: Fenn

Fenn started at 6.87 in the best-surviving large world. He participated in 14 completed foraging practices, nine games and 14 family-time activities. He had two living parents and a hut. He nevertheless died of hunger on day 23.73.

His recent daily pack samples held two wood and one seed: 4.25 used out of five capacity. His mother Ines tried to bring him fruit; the final handover attempt failed at tick 55678 with `they had no room to carry it`. No immediate storage fallback followed. She had also asked Fenn for food during the preceding sequence, receiving a no-item refusal, before selecting care again. He died 1283 ticks later.

This supports investigating the interaction between age-appropriate responsibility, carrying room, food handover, changing priorities and care. It does not establish that pack capacity alone caused the death or that one delivery would have saved him. His path also included depleted food sources and interrupted gathering. He did sometimes eat successfully from home storage despite the same pack. Exact event and sample evidence is retained in `fenn-care-window.json` and explained in `LARGE_FINDINGS.md`.

## Experience across life stages

- Children had recognisable childhood activities, teaching and family relationships, but those did not ensure survival. Hana survived losing her mother and later delivered food to her sibling. Separately, Hana and Zed completed wood-chopping activities while about ten years old; actual wood transfers are recorded. Those are concrete cases for reviewing child duties, not proof those chores caused harm.
- Teenagers are present in four of the six initial populations. Kira in Large life-stages-6 spent almost the whole run as a youth, becoming an adult on day 29.51. She survived at full health after work on a food rack and hut, making a spear, farming and bringing food home. She successfully stored a spare seed to free carrying room for hearth fuel. Cass in Normal life-stages-6 became an adult on day 1.17, so most of Cass's productive career must not be labelled teenage behaviour.
- Adults worked, made tools, maintained homes and attempted care. They could survive while a dependent child died. Ines's survival and completed food deposits did not establish that Fenn received enough food. Una in the supplemental River run survived with only 34 health after many care attempts and 33 reported no-room handover failures. Alive is not the same as healthy or secure.
- Elders remained useful: Pavel made tools, delivered promised fish and helped finish a granary and cellar. He still died of hunger. All six selected elders died, but the whole-cohort evidence is less absolute: seven of nine initial elders survived in Large life-stages-6, and Hal survived Normal life-stages-6 at full health. Avoid both a universal-doom story and an all-is-well story.

## What they might ask

These are imagined interpretations of the evidence, not generated dialogue or claims of sentience.

- Child: “Help me put these logs somewhere and get food when I cannot manage it myself.”
- Teenager: “Give me useful work I can grow into, and someone to learn from.”
- Adult: “Help me make sure the food actually reaches my family.”
- Elder: “Let me keep contributing, with food, warmth and help close enough when I struggle.”

The earlier priorities remain justified: age-appropriate duties, reliable carrying/storage/handover, and timely care. The positive cases show that several building blocks already work. The next question is whether they work reliably together under hunger, cold and exhaustion. The extinct large world already had huts, wells, cellars and a food rack; infrastructure counts did not prove sustained access to their benefits. All three large worlds also began with similar global wild-food-source counts.

## Integrity and remaining uncertainty

Five original worlds passed 31 daily exact observed/unobserved twin comparisons, observer-purity checks, conservation, unchanged-source checks and a 120-tick save/reload continuation. These are runtime integrity checks, not a full software test suite.

Large River's original attempt failed exact serialized equality on day 19, and a fresh reproduction repeated it. Captured states had identical parsed values and array order; one person's by-kind memory index differed only in object key order. A separate continuation resumed both captures to day 30. All subsequent daily parsed-state comparisons and the semantic 120-tick continuation passed, while exact text equality remained unequal. The original failure is retained. Reloading rebuilds non-serialized indexes, so this does not prove the original uninterrupted twins would have remained equivalent. See `DIAGNOSTIC_FINDINGS.md` and `verification.json`.

Thirty days exposes failures hidden by five days, but does not prove indefinite viability. Three seeds are a small descriptive sample. No counterfactual fix or controlled causal comparison was performed, and no live-development repair was attempted.

Detailed numerical report: `REPORT.md`. Individual interpretations: `NORMAL_FINDINGS.md` and `LARGE_FINDINGS.md`. Measurement cautions: `METHOD_LIMITS.md`. Figure: `population-comparison.png` / `.svg`. Raw observations and frozen inputs remain alongside these files.
