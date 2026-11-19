# What residents hope for, and what advances it

P0 calibration and agency, item 3. Read-only measurement in the rules-259 feature worktree, based on ff46700b with the existing local save loader. Three ordinary settlements with arrivals enabled were followed from day 96 to day 109. A separate replay of the first day measured changes during individual activities. Tables and per-world JSON are beside this report.

## What happened through winter

Of 380 living residents on day 96, 273 had a recorded first aspiration. The first choices recovered from their histories were home 67, family 56, stocked stores 58, reputation 47 and trade 45. The other 107 had no goal yet. This distribution describes residents alive at that date. Across the next 13 days, 36 residents took up a first goal and 11 successor goals appeared.

Across the three settlements, 309 distinct residents held goals during observation. Of 318 unfinished or newly assigned goal episodes, the simulation marked 14 achieved. Six were family, four trade, two reputation and two home. Twelve of the 14 still met their underlying condition at day 109. The two home conditions had slipped to 98.8% and 80.3%. Some newly assigned goals already met the target at their first check. These counts describe a single trajectory from each save.

**Stocked stores showed the largest gap.** Of 129 episodes, 78 rose at least once and 75 fell at least once, but none reached the target. The highest recorded progress was 25% in Aspen, 21% in Gen-4 and 33% in River. People completed 3,368 activities that earned the stocked-store bonus. Gen-4's Cora chose 67 such activities, rose from zero to 21%, and ended at zero after eight recorded drops. Household consumption, caller intent and use of other stores must be traced before assigning the shortfall to any one cause.

**Reputation could advance.** Eight of the 93 reputation episodes showed an increase, and two reached the goal. Both were in Aspen. Quinn and Pia began with four qualifying neighbours and finished with five or more. Both still met the target on day 109. The first-day handover audit below shows why many qualifying actions yielded no immediate progress.

**A completed hope could lead to another.** River's Dax (85582) achieved his family hope on day 96.06, took up a home hope three days later, and achieved that too on day 101.06. At day 109 he still met the family condition. His remembered home achievement remained, but its live condition had fallen to 80.3% of the target. No revised elder-company goal appeared in these runs.

Across 1,804 repeat directed social pairs, 868 had higher trust and 771 higher affinity at their last approach than their first. These endpoints include intervening experiences. They show that relationships can move while an aspiration score stays on the same step.

## What the simulation calls an aspiration

A resident receives their first aspiration at their first eligible adult or elder half-day check. The draw uses world and person identity, with character traits influencing the weights. Caution favours a solid home and stocked stores, sociability a family, diligence a trade and stores, and generosity a good name. A fulfilled goal is recorded in the resident’s history. After three days the resident can take up a different, still-unmet goal. An elder can revise an unmet family hope to continuing company after experiencing it.

| Hope | What the planner gives four extra points | What changes the resident’s progress |
|---|---|---|
| A solid home | Building, repairs, hauling or laying out a site | Their household has a solid home, in condition 60 or better. A non-solid home earns one quarter. |
| A family | A social approach tagged household or social | Half for having a partner, half for having children. A chat can improve a relationship without moving this score. |
| A trade | Operating a workplace, crafting or tool work | A declared trade meets the hope. Apprenticeship gives 60%. Otherwise the best skill can give up to 50%. |
| Stocked stores | Gathering for the hunger need, any deposit, or harvesting | Edible food in the household home divided by 12 units per member, capped at 100%. Food still in a pack earns no credit. |
| A good name | Giving, care, fulfilling an obligation or a social approach tagged help | One fifth per living neighbour whose affinity **toward the resident** reaches 40, up to five neighbours. |
| Lasting company | Family’s social approaches plus teach, help and trade approaches | Half for company sustained over three qualifying days with someone and half for help received in that relationship. The company record must still be recent. |

The simulation records progress to two decimals twice a day. Reaching the displayed target generates a life event and a +12 thought for three days. A hope over ten days old and below halfway can generate a −3 thought for a day. Once achieved, the saved score stays at 100%. The endpoint check in TABLES.md independently evaluates the underlying condition for each observed achievement. A resident can remember having achieved something and later lose it.

## What reached the resident on the first day

* **Reputation.** Thirty residents with a reputation hope completed 56 care handovers to 33 recipients (41 directed pairs). Every recipient already counted as a neighbour at affinity 40. In 55 handovers the recipient already rated the giver at the ceiling of 100. The remaining recipient rated the giver more highly afterward, but already counted. All 56 reputation scores stayed flat. A handover can still matter to the recipient. The four-point bonus recognises the kind of action, without checking whether this recipient could move the giver's next milestone.
* **Stores.** Residents with the stocked-store hope completed 165 deposits. Only 23 went to their own home. Across those 23, the home-food score increased during 20. Of all 292 successful activities with the stocked-store bonus, only those 20 coincided with an increase. Gathering and harvest can supply a later delivery. A successful non-home deposit has a different immediate destination from the one the hope measures.
* **Family.** All 22 successful goal-aligned social activities on this day ended with the same family score as at launch. A relationship can develop before there is a partner or a child. At tick 231,381 in River, Silas approached Kira about sharing a household. After 23 ticks the activity ended with “Kira was too busy to stop”. In social.ts this is the final availability-weighted willingness-to-talk check, after the hard sleep, busy, avoidance and pressing-needs checks. This attempt ended before the partnership proposal could be discussed. It gives no evidence of a refusal to form a couple.

## Ines in the original hybrid run

The rules-227 River transcript contains 205 decision observations. Three preceded a recorded aspiration, 70 showed her solid-home hope at 25%, and 46 showed it fulfilled. At tick 20,775 she took up reputation. All 86 subsequent observations showed zero progress, including 17 selected chat approaches. Her final save records her highest incoming affinity as Milo’s 33.10. The first 20% requires a neighbour to reach 40. Ines’s own feelings toward somebody are a different number. This explains the displayed zero despite her social activity. The mixed AI and native controller and the early-world start make this a separate case from the mature autonomous replays.

Historical inputs are transcript.json and final-world.json under review_evidence/civilian-fifteen-days-20261113/hybrid in the integrate checkout. Native definitions are in src/sim/life.ts (pickGoal, goalNudge, goalProgress, lifeTickRich), src/sim/companionship.ts (companyProgress), and src/sim/decision.ts (rankOptions).

## Reproduction

From the feature worktree, build once with `node scripts/build_aspiration_trace.mjs <bundle.cjs>`. For each of aspen, gen-4 and river, run the bundle with `--load C:/dev/lw_saves/rules256/<seed>-day96.save.json --rules-up 259 --reference review_evidence/winter259/<seed>-day96-on.json --out review_evidence/aspiration-trace/<seed>.json`. Repeat with `--payoff-day on --reference review_evidence/choice-funnel/<seed>-final.json` and an output named `<seed>-payoff.json`. Rebuild the tables with `node scripts/aspiration_tables.mjs C:/dev/lw_saves/rules256`.

The observer calls the native read-only score and progress functions and records the chosen activity ID and its ending. It takes no draws. A qualifying activity can affect somebody else's home or stores. Other residents can change the goal holder's circumstances during that activity. Individual causal effects of the four-point bonus require a separate comparison.


## Interpretation and next investigation

The strongest candidate for further tracing is the household store. Follow a home delivery from the giver’s remembered destination through transfer, later meals and the next twice-daily aspiration check. Count other edible stores the household can actually use alongside the stock at home. This would distinguish food being consumed usefully, food going somewhere else, and a target that measures only part of the resident’s original hope. The next separate item on the Brain list is whether deliberate visits, continuing companionship and arranged meetings are reachable.

TypeScript checking passed and all 13 tests in life.test.ts and achievement.test.ts passed. All three one-day and three full-winter endpoint hashes matched prior runs, and conservation passed at all six endpoints. The measurement was local to the feature branch. No simulation rule was edited.
