# Social opportunities, choice competition and personal goals

Brain calibration-and-agency items 4–6. One native day (96–97) in each of Aspen, Gen-4 and River, with arrivals on and rules 259. The probe recorded 7,293 decisions, including decisions to change an activity during review. It sampled the full option list, the list after filters, the actual choice, native activity endings, changes in company records, and the individual meal arrangements. A count in the table means decisions with at least one matching option. A single decision can qualify in several rows.

## Item 4. What residents could arrange and carry through

**Visits to specific people occurred in all three settlements.** Of 52 visits started, 50 aimed to check on someone and two sought a carer. Eighteen succeeded. In 19 of the 34 failures the other person had moved from the expected location, in 11 they were in a different space, and in four the visitor lacked what they needed. Aspen completed 6 of 25 visits, Gen-4 9 of 17, and River 3 of 10. These visits involved practical care. An ordinary chat and a trip to find someone use different mechanisms. The checked visit constructors also serve promises and trade. A general long-distance visit solely for companionship was not demonstrated.

**Continuing companionship was reachable.** The elder-specific reason to make time for familiar company appeared in seven ranked decisions and was selected twice. One activity succeeded. The broader relationship records also changed through ordinary contact. Of the directed relationships still recorded at day 97, 181 had new or updated company since day 96, and 95 of those recorded qualifying time together on at least two days. Six had increased help credit. Records are directional and bounded, so a pair can contribute two and a discarded record is absent from the endpoint comparison. The two elder choices cannot explain all these updates.

**Arranged meals went from invitation to real attendance.** River created two arrangements. For the first, three were invited, two accepted and arrived, and three ate including the host. For the second, one was invited, accepted and arrived, and two ate including the host. No new arranged meal was recorded in Aspen or Gen-4 that day. The implementation in meals.ts and meeting_knowledge.ts handles a named place, time, invitations, attendance, cancellations and replacement arrangements. Success is established for this meal mechanism. One day per world is too little to estimate its frequency, and these meals do not demonstrate a general-purpose social appointment.

## Item 5. Where choices lost out

| Activity | Generated | Survived ranking | In top 30 | In top 5 | Chosen and started | Succeeded | Failed | Interrupted | Partial | Still open |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Visit | 554 | 404 | 390 | 185 | 52 | 18 | 34 | 0 | 0 | 0 |
| Explore | 1,735 | 1,504 | 1,374 | 270 | 45 | 10 | 0 | 30 | 0 | 5 |
| Gather | 5,926 | 4,485 | 4,411 | 2,783 | 901 | 469 | 72 | 179 | 96 | 85 |
| Invite to a meal | 159 | 158 | 150 | 18 | 7 | 4 | 3 | 0 | 0 | 0 |
| Host a meal | 2 | 2 | 2 | 2 | 2 | 2 | 0 | 0 | 0 | 0 |
| Attend a meal | 5 | 5 | 5 | 5 | 4 | 3 | 1 | 0 | 0 | 0 |
| Any option receiving the resident’s aspiration bonus | 2,744 | 2,469 | 2,445 | 1,568 | 672 | 376 | 170 | 80 | 21 | 25 |

The top-30 display showed a visit in 390 decisions but only 52 visits started. Among decisions where a visit survived and another activity won, the largest winning categories were gathering with no immediate need (47), deposits (44), harvesting (38) and sleeping (31). Across comparable decisions the chosen option averaged 18.1 score points above the best visit. For exploration the gap was 22.0 points. Among alternatives to exploration, non-need gathering won 245 times, deposits 182, withdrawals 121 and harvests 118. Measurement uses the actual final option scores. It establishes observed competition; changing a score could also change the rest of the trajectory.

The earlier 205 hybrid decision observations concerned one person under mixed AI and first-ranked control. This table is native play across whole settlements. Its counts include mid-activity switches recorded by the decision ledger, a wider denominator than the earlier fresh-launch choice-funnel report.

## Item 6. Do residents lack ambitions?

The observations identify three distinct ways that a real ambition can stall.

1. **Opportunity and selection.** In native River, Ines already hoped for a family. Across 13 winter days a qualifying option appeared in 50 of her 236 decisions; she chose one 12 times. Seven failed, two were interrupted and three succeeded. Her partner-and-children score stayed at zero. On the first day her only two ranked goal-aligned opportunities lost to harvesting and gathering. The older hybrid River Ines had reached a different ambition, a home, and then wanted a good reputation. The comparison describes different trajectories and goals.
2. **Execution.** A visitor can set out with locally plausible knowledge, discover the other person has moved and return without contact. Once invitation and attendance worked, two real groups sat down to shared meals in River. The approach, agreement and eventual outcome warrant separate measures.
3. **What progress counts.** Cora physically delivered fruit that fed Abel II and her family ate from its cellar. Both activities supported household food provision even as her stocked-home score returned to zero. Reputation handovers also had a recipient-specific limit: all 56 first-day gifts from reputation seekers went to a neighbour already counted. These are places where a broad action bonus or a narrow progress measure obscures the outcome of an otherwise successful act.

The forty-question inhabitant register asks about motivation, relationships, survival, intelligence, individuality and what a viewer experiences. This pass answers the item-6 question for the observed cases. Residents acquired distinct hopes, some fulfilled them, and both work and immediate needs displaced opportunities. How changing priorities would affect survival or family formation, how much benefit comes from the aspiration bonus itself, and how meaningful the experience feels to a viewer remain open. Evidence for a targeted next investigation is strongest where 30 of 34 failed visits found the person absent or in a different space. A matched trace could distinguish stale whereabouts from a target who moved after departure.

## Reproduction and checks

Build with `node scripts/build_social_reach.mjs <bundle.cjs>`. Run for each seed with `--load C:/dev/lw_saves/rules256/<seed>-day96.save.json --rules-up 259 --out review_evidence/social-reach/<seed>.json`. The three output files retain per-world counts, reasons, scores aggregated over losses, company changes and meal outcomes. All three day-97 endpoints matched the prior choice-funnel hashes (243d5e61, e66b885f, d1973df5 respectively) and passed conservation. TypeScript checking passed. The five focused suites covering life goals, company, welfare and meeting arrangements passed all 52 tests. Source routes include welfare.ts, options_social.ts, companionship.ts, social.ts, meals.ts and decision.ts. The 13-day Ines case is in review_evidence/aspiration-trace/river.json; the food case is in review_evidence/cora-food/RESULTS.md.

