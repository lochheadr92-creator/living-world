# Completed normal-map findings

These three 30-day runs are complete. Larger maps are a separate part of the investigation; these conclusions do not stand in for their results. Source: the corresponding `results/normal-*/report.json` files, summarized in `summary.json` and `stories.json`. Rules 153, all ordinary capabilities enabled, arrivals on, harsh off.

| Seed | Initial population | Day-30 population | Original founders surviving |
|---|---:|---:|---:|
| forest | 28 | 7 | 6 |
| river | 28 | 24 | 22 |
| life-stages-6 | 28 | 24 | 19 |

Across the three worlds, 47/84 founders survived: 12/24 initial children, 2/2 initial youths, 32/52 initial adults and 1/6 initial elders. These are descriptive counts from three interacting worlds, not independent trials or a causal estimate of age. The selected children all survived, illustrating why their anecdotes alone would be misleading.

## Children and growing up

Forest's Hana started at age 10.10 and finished at 12.60, with health about 59. She participated in three successful foraging practices, six games and five family-time activities. Her mother Edda died of hunger at elapsed day 22.13; Hana learned of the death at a grave at tick 54775, rather than immediately acquiring global knowledge. Later she successfully delivered berries to her sibling Viktor and brought food home. Her own wood-chopping selections occurred twice while still under 12, so the age/task gap remains visible.

River's Ivo started at 10.78 and finished at 13.28, with full health and both parents in the household. His record includes two completed foraging practices, seven games and ten family-time activities. After becoming youth at tick 35163 (day 14.65), he delivered promised grain to his father Abel, completed hut construction, and gave berries to his sibling Eli. No under-12 wood-chopping selection was recorded for him. A restrictive age policy should preserve useful growth into responsibility, not make all young people inactive.

Zed in life-stages-6 survived to 12.34 with full health, eight foraging practices, six games and six family-time activities. He selected wood chopping once while still a child. Only two of that world's seven initial children survived, so his healthy outcome is not representative of all children there.

## Working adults and youths

Edda completed care and useful household activity, but died during the forest's second-winter collapse. Forest went from 27 people at day 21 to six at day 24; the completed run records 19 hunger deaths, two wolf-attack deaths and one fever death. Huts, a well, a timber yard and a storehouse existed before that collapse. Infrastructure presence is not proof of a sustainable food/heat system.

Cora in river survived with full health and an intact household. Alma in life-stages-6 also survived, but ended at about 80 health. Alma had seven interrupted crafting activities and no completed craft in the observed 30 days, while successfully giving goods seven times and depositing six times. That suggests a useful investigation of interrupted work, not proof that every interruption is wrong.

The preselected youth for life-stages-6 is Cass, age 15.90, rather than Dax: this investigation's fixed selection rule used the first youth, without the previous five-day visit's age ceiling. Cass became an adult on day 1.17 and survived to 18.40 with full health. Cass completed a rod, saw, basket, axe, spear and hammer, and completed a food rack. Most of this is an adult outcome, not evidence about teenager-only activity. Dax is still tracked in the whole-founder cohort; he survived at about 79 health, also as an adult.

## Elders and interacting needs

All three focal elders died, although one of the other three initial elders survived. Petra in forest completed hut construction but died of hunger at day 22.72. River's Milo owned a hut and remained at full health at day 20, then exhausted energy and warmth while moving between food, shelter and fire. He died of exposure at day 22.71. His last recorded activities include interrupted sheltering, a contested fishing attempt and depleted grain; this demonstrates interacting needs and unsuccessful attempts, not a proved single planner defect.

Kai in life-stages-6 recovered from 82 to 100 health by day 2 and remained at 100 through day 9, then died of hunger at day 10.88 with severe cold also present. This is a separate rules-153 run, not an extension of the earlier rules-155 visit. It demonstrates that early recovery is not necessarily sustained resilience.

## Exchanges and evidence limits

Founder activity logs contain 237 occurrences of the exact failure text `they had no room to carry it`: 65 forest, 72 river and 100 life-stages-6. Treat these as reported failures. The code can return that text after zero transfer in some other circumstances; both inventories were not captured at every failure, so the count is not 237 independently verified capacity diagnoses.

Edda's attempted berry deposit for Hana after a failed handover was interrupted at tick 5419. A later fruit handover failure at 26342 was followed by an explicitly intended home deposit for Hana, completed at 26358. Existing recovery therefore both activates and sometimes completes, but selected recovery, completed storage and consumption by the intended recipient must remain separate claims.

These records support retaining the queued age/task and exchange work, and investigating survival-action continuity and elder support. They do not prove that a particular policy change would prevent the deaths. See `METHOD_LIMITS.md` before interpreting totals or comparing with earlier versions.

## Child work: completed action follow-up

Hana completed Chopping wood twice while under 12: ticks 836-930 at age 10.13 (to keep the fire going), and 12778-12828 at age 10.55 (to repair the lean-to). Zed completed it at ticks 22002-22321, age 10.60, to repair the lean-to. These are successful activity-end records, not only options or selected intentions. Transfer details are retained in `child-chopping-evidence.json`. They are concrete examples for reviewing age-appropriate duties; no claim is made that these activities caused harm.

## Counterexample and inventory correction

Hal, the other initial elder in normal life-stages-6, survived from age 69.71 to 72.21 with health 100. He farmed (30 recorded farming actions), gathered fish and grain, received food through care and gifts, and deposited food. His capacity remained six without a basket at the final sample. This is a useful counterexample, not proof that farming, aid or small inventory caused his survival. He was not a focal diary subject.

Kai did make a basket at tick 10360 (day 4.32), and his daily capacity was 12 from day five onward. His death-account pack retained that basket. The raw deceased person object had been emptied and returned a capacity of six, which must not be interpreted as his pre-death carrying capacity. His death despite the basket supports investigating more than capacity alone; it does not show that the basket had no benefit.
