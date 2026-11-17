# Free block experiment: report (SCRATCH ONLY, 17 November 2026)

Brief: `C:\dev\_claude_scratch\regime-20261117\FREE_BLOCK_BRIEF.md` (Ryan accepted its three assumptions on 17 November 21:06). Scratch tree `wt`, detached at `95ce6377`, rules 250, three day 48 saves, 30 days, 16 runs, one run per arm. Every run ended at the horizon with 600 purity checks and conservation holding. Labels: VERIFIED = read from this session's files or output; LIKELY = reasoned, not tested; UNKNOWN = not measured. One run per arm is a description, never a rate. No benefit is claimed.

## Verdict by the fixed reading: GATE RARELY ACTIVE (VERIFIED, `tables.md` "The fixed reading, applied")
Tested in the fixed order. SURVIVAL COST: no (survival fails for E in 1 of 3 worlds, river; 2 needed). GATE RARELY ACTIVE: **yes, 3 of 3 worlds**. The later two readings were not reached, and they would not have held either: OPENS A LIFE 0 of 3, TIME OPENS NOTHING FILLS IT 0 of 3.

- **The predicate held for 10.5 to 13.6% of E window person-ticks in the E runs** (aspen 11.8, river 10.5, gen-4 13.6; the A runs 9.8, 9.1, 17.7). Across all 16 runs, 79 to 91% of window person-ticks failed on "household short of food" alone, at most 0.1% on an urgent need alone, at most 1.2% on both. (VERIFIED)
- **Why "short": the person's own belief.** At the first evening of the aspen day 48 save, the 36 people of 12 and over believed their household held 2.4 units a head on average against the line of 4 (one day, `provision.ts` DAY_FOOD x RESERVE_DAYS); 17% were at or above 4. A granary the person has glanced at is remembered as one of each kind (rules 169), so its believed contents averaged 1.6 units; counting that belief in full lifts the share to 22%. One world, one moment, a read-only throwaway script. (VERIFIED for that moment; that the other worlds look alike is LIKELY, from the window figures above.)
- **Life (social_contact + leisure, % of waking time, people of 12 and over)**, aspen / river / gen-4: A 11.1 / 11.4 / 11.0; N1 10.2 / 11.2 / 10.2; N2 11.1 / 11.1 / 11.2; D 11.4 / 11.2 / 11.3; E 11.6 / 11.8 / 11.6. E minus A: +0.4 / +0.3 / +0.5 against nudge spreads of 1.0 / 0.3 / 0.9 (river's +0.3 is the spread). D minus A: +0.3 / -0.2 / +0.3. Leisure alone: 0.3 to 0.5, 0.2 to 0.3, 0.3 to 0.3. (VERIFIED)
- **Survival.** River E had 3 deaths (thirst, wolf attack, fever) against 0 in A, N1 and N2, so survival fails there; aspen and gen-4 hold, and D holds in all three. Hungry-with-no-food stays within A plus noise plus 3 points in every arm. One run: nothing links those deaths to the gate (UNKNOWN).

## Where the gated time went, category by category (VERIFIED, `tables.md` window and category tables)
The gate removed 19,435 to 52,424 options per run (a call-count that includes the 600 observer samples), over 1,148 to 3,072 calls where it applied; the running activity was kept 103 to 167 times. In the **holding ticks of window E**, A against E, % of holding ticks (aspen / river / gen-4): work 17.7 to 5.7 / 12.1 to 5.7 / 13.8 to 5.3; social_contact 13.5 to 25.5 / 18.5 to 25.8 / 16.0 to 27.5; leisure 1.0 to 4.3 / 0.5 to 3.1 / 1.0 to 1.7; travel 55.7 to 47.4 / 52.2 to 48.2 / 58.1 to 49.9; rest 4.2 to 8.9 / 10.3 to 6.7 / 7.1 to 10.6. Waiting plus idle plus rest plus early sleep is only 10.1 / 9.5 / 11.8% of E's holding ticks, so the freed time was not left empty. By kind it went to converse, attend, socialize, wander (9.2 / 8.2 / 6.2%), give, and **fetch_water (7.1 / 4.6 / 4.0%, a kept kind and a doubtful row)**. Those ticks are a selected subset (people who hold a day's believed food), so this compares what the same predicate picks out in two runs, not the same ticks (LIKELY).
Over the **whole waking day** the ten time categories show three marginal exceedances of the two-nudge spread (aspen leisure +0.2 on a spread under 0.05; river eating_drinking_warming -2.5 on 2.4; gen-4 travel -3.6 on 3.5), and work stays 14.1 to 13.7, 11.3 to 11.5, 11.9 to 11.7 (VERIFIED). Of eight other measures (outdoor company, hungry-with-no-food, food held, food and wood gathered, jobs finished, deaths, people at the end), **13 of 48 D or E comparisons exceed the spread, with no consistent sign across worlds**: aspen D outdoor company +2.6, food held -2.1, wood +0.05; river D and E outdoor company -3.3 and -2.7 on a spread of 0.3, hungry-with-no-food -4.3 and -4.2, food gathered +0.17 and +0.11, E deaths +3; gen-4 D deaths +2, E food held -3.9 and jobs -0.17 (VERIFIED, computed from the reports). Under no effect a comparison clears the larger of two nudge differences about a third of the time, and 13 of 48 is 27%, so I read none of them as a finding (LIKELY: reasoning from exchangeability, not tested). The one pattern worth a second look is river outdoor company, lower in both gated arms (41.6, 42.1) than in all three controls (44.5 to 45.0); it does not recur in aspen (higher) or gen-4. The gate acted on about a tenth of the window, and the whole-day shares are what a tenth of the window can move.

## Checks (VERIFIED, `tables.md` "Checks"; `verification-before.txt`, `verification-after.txt`)
- Hash equalities: aspen A `168d98f7`, river A `8f513a37`, gen-4 A `523f2943`, each EQUAL to the brief; aspen D `a5f9e6c5` equals its repeat. Gate off is inert; the gate on is deterministic.
- 16 of 16 run folders hold `report.json`. Purity 600 of 600 and conservation ok in every run; DayShape, window-vs-OutdoorCompany/DayShape and travel-total checks ok in every run. The runner never calls `setPace` or the plenty setter (read in `free_probe.ts`); every report shows plenty factors wild 2, crops 2, as the earlier probes did.
- `npx tsc --noEmit` exit 0 (before the runs and after). Integrate: `main` `baa9257d`, 36 status lines before and after; no worktree added; `free_block.ts` exists only in `wt`. The scratch status gained two modified files (`decision.ts`, `options_survival.ts`) and four new ones.
- Stop conditions: none tripped. Stocking and own-hunger gathering differ by `Option.need` (null against `hunger`); the gate touches 2 existing files, 3 lines; the review path is untouched (the running option's key is spared in the filter, and the filter stands in `rankOptions`, so `ctx.options`, `currentUtility`, `reviewTrade` and `reviewIntentions` see what they always saw); belief functions exist.

## Deviations, slips and choices of mine (Ryan to veto)
1. **A slip: the first launcher died after wave one.** A loop variable `$r` overwrote `$R` (PowerShell is not case sensitive), so the ninth run's log path was garbage and the supervisor stopped. The eight runs it had started were untouched. I fixed it, added `launch_free.ps1 -Resume`, and started the remaining eight at 21:56:11, six to ten minutes after the slots had freed (21:46 to 21:50). No result depends on it; the cause of death is VERIFIED as a mechanism, but I did not capture the supervisor's own error (LIKELY).
2. **TripShape attached, not named in the brief**, because the units gathered and jobs finished the tables ask for exist nowhere else. Its stage-split self-check is false in 5 of 16 runs (aspen N2, D, D-repeat; river N1; gen-4 N1), as in four of six pace runs earlier today; the totals equal TimeBudget's. LIKELY a walk under way at a twelfth birthday; it touches only the "share of gathered units by 12 and over" column.
3. **Both windows (0.62 and 0.50) are accounted in every run**, since the controls have no flag and still need one.
4. **"Fed" = own pack + remembered stores of the household that `optEat` counts as `mine` (homes and cellars) + `granaryRation` (belief based), at least 4 units a head.** The sum is mine; every part is an existing function (`granaryRation` needed the keyword `export`). Counting cellars is a choice.
5. **Where the gate stands:** in `rankOptions` (`decision.ts`: an import line and one call line), not at each of the 97 `addBlocked` calls; a removed option is kept in `ctx.blocked` with "done for today" where the ctx collects. Gated: the brief's named kinds, plus `cart_haul`, `plan_site`, `tree_work`; kept: any option with its `need` set, tags care, promise, meal, relocation, and every other kind. Rule: **a kind the brief does not name is kept.** 34 of 110 classification rows are flagged doubtful (appendix).
6. "Sleep before bedtime" is read as the share of window person-ticks asleep, per window.

## Limits (UNKNOWN unless said)
Three worlds, one run per arm, a noise floor from two nudges (crude); rules 250, not 255 (what 251 to 255 changed is unread); 30 days from day 48; the gate acted on about a tenth of the window, so this says little about whether freed time becomes life. Counts of gate calls include observer samples.

## Next step (a proposal; nothing here is decided)
The experiment cannot say what freed time does, because the fed test seldom passes. Cheapest honest next run: an upper bound with the gate on for every safe person in the window whatever they believe (same runner, one flag, three worlds), which separates "rarely on" from "does nothing when on". The alternative is to change "fed" to the household's own existing `LOW_FOOD_DAYS` line (half a day) or to exact own stores. Both are new definitions for Ryan to accept.

---

# Appendix: classification table (every option site, gated or kept; checked against `classifyOption` by `scripts/free_classify.ts`, 110 rows, 0 mismatches)

Read as: an option is **GATED** when it is one of the named stocking or production kinds and its `need` is null and its tag is not care, promise, meal or relocation; otherwise kept.

| site (file:line) | kind | need | tag | key | verdict | rule applied | doubtful |
| --- | --- | --- | --- | --- | --- | --- | --- |
| options_survival.ts:131 | flee | safety | - | flee:0 | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:229 (foragePlans, mode eat) | gather | hunger | food | gather:ID | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:229 (foragePlans, mode stock) | gather | null | food | gather:ID | **GATED** | gated: stocking or production work |  |
| options_survival.ts:229 (foragePlans, food for a named person) | gather | null | care | care_supply:ID:gather:ID | **kept** | kept: tag care |  |
| options_survival.ts:304 | eat | hunger | food | eat:0 | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:365 | eat_store | hunger | food | eat_store:ID | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:411 | drink | thirst | water | drink:inv | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:441 | drink | thirst | water | drink:ID | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:516 | sleep | energy | rest | sleep:ID | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:549 | sleep | energy | rest | sleep:here | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:595 | warm | warmth | warmth | warm:ID | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:634 | rest | warmth | warmth | rest:home:ID | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:691 | rest | warmth | rest | shelter:ID | **kept** | kept: serves the person's own present need |  |
| options_survival.ts:730 | rest | energy | rest | rest:here | **kept** | kept: serves the person's own present need |  |
| stored_water.ts:11 | drink | thirst | water | drink:store:ID | **kept** | kept: serves the person's own present need |  |
| wells.ts:57 | drink | thirst | water | drink:well:ID | **kept** | kept: serves the person's own present need |  |
| defence.ts:240 | defend | safety | danger | defend:ID | **kept** | kept: serves the person's own present need |  |
| hungry_harvest.ts:30 | harvest | hunger | food | harvest:ID | **kept** | kept: serves the person's own present need |  |
| hearth.ts:88 | plan_site | warmth | build | hearth_layout:ID | **kept** | kept: serves the person's own present need |  |
| hearth.ts:97 | fuel_fire | warmth | fire | hearth_fuel:ID | **kept** | kept: serves the person's own present need |  |
| clothing.ts:86 | tool_work | warmth | warmth | dress:ID | **kept** | kept: serves the person's own present need |  |
| hunting.ts:57 | hunt | hunger | food | hunt:ID | **kept** | kept: serves the person's own present need | DOUBTFUL: work category; hunts for meat, but the option is built as hunger-serving (need hunger), so it is kept |
| passive_gear.ts:107 | gear_work | hunger | food | gear:OP:ID | **kept** | kept: serves the person's own present need | DOUBTFUL: setting, checking and retrieving traps and nets is work for later, but every option is built with need hunger, so it is kept |
| carcass.ts:98 | butcher | hunger | food | butcher:ID:PART | **kept** | kept: serves the person's own present need | DOUBTFUL: recovering meat from a body: built with need hunger (warmth for a hide), so it is kept |
| carcass_supply.ts:33 | butcher | warmth | warmth | butcher:ID:hide | **kept** | kept: serves the person's own present need | DOUBTFUL: as carcass.ts:98 |
| options_work.ts:295 | deposit | null | store | deposit:ID:food | **GATED** | gated: stocking or production work |  |
| options_work.ts:534 | gather | null | site | gather:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:534 (other tags: repair, fire, craft, stock) | gather | null | craft | gather:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:662 | haul | null | site | haul:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:715 | build | null | site | build:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:858 | plan_site | null | build | plan_site:TYPE | **GATED** | gated: stocking or production work | DOUBTFUL: laying out a building is not itself named in the brief; gated as the first step of build |
| options_work.ts:991 (home is cold) | fuel_fire | warmth | fire | fuel:ID | **kept** | kept: serves the person's own present need |  |
| options_work.ts:991 (not cold) | fuel_fire | null | fire | fuel:ID | **kept** | kept: not a named stocking or production kind | DOUBTFUL: feeding a fire when nobody is cold is upkeep, work for later; not a named kind, so kept |
| options_work.ts:1040 | repair | null | repair | repair:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:1177 (merged at 1102) | craft | null | craft | craft:TOOL | **GATED** | gated: stocking or production work |  |
| options_work.ts:1234 (mk till) | till | null | farm | till:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:1234 (mk plant) | plant | null | farm | plant:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:1234 (mk tend) | tend | null | farm | tend:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:1234 (mk harvest) | harvest | null | farm | harvest:ID | **GATED** | gated: stocking or production work |  |
| options_work.ts:1307 | till | null | farm | till:new | **GATED** | gated: stocking or production work |  |
| options_work.ts:1349 | withdraw | null | farm | withdraw:ID:seeds | **GATED** | gated: stocking or production work |  |
| options_work.ts:1417 | withdraw | null | salvage | withdraw:ID:salvage | **GATED** | gated: stocking or production work |  |
| options_work.ts:1470 | fetch_water | null | water | fetch_water | **kept** | kept: not a named stocking or production kind | DOUBTFUL: carrying water home is work that builds a stock, but fetch_water is not a named kind, so kept |
| options_work.ts:1580 (explore, no known water or food) | explore | thirst | explore | explore | **kept** | kept: serves the person's own present need | DOUBTFUL: explore is named as gated; kept only when it is built for the person's own present thirst or hunger (need set) |
| options_work.ts:1580 (explore, nothing pressing) | explore | null | explore | explore | **GATED** | gated: stocking or production work |  |
| options_work.ts:1710 | give | null | care | give:ID | **kept** | kept: tag care |  |
| options_work.ts:1773 | visit | null | promise | watch:ID | **kept** | kept: tag promise |  |
| options_work.ts:1818 | deposit | null | promise | leave:ID:promise:ID | **kept** | kept: tag promise | DOUBTFUL: deposit is gated, but this one keeps a promise to a named person (tag promise) |
| options_work.ts:1861 | give | null | promise | give:ID:promise | **kept** | kept: tag promise |  |
| options_work.ts:1938 | give | null | promise | give:ID:return:ID | **kept** | kept: tag promise |  |
| options_work.ts:1980 | fetch_water | null | promise | fetch_water:promise | **kept** | kept: tag promise |  |
| options_work.ts:2028 | claim_home | null | home | claim_home:ID | **kept** | kept: not a named stocking or production kind | DOUBTFUL: work category (settling into a home); not a named kind, so kept |
| options_work.ts:2067 | wander | null | idle | wander | **kept** | kept: not a named stocking or production kind |  |
| options_work.ts:2113 | wander | null | idle | wander | **kept** | kept: not a named stocking or production kind |  |
| production.ts:182 (collect from a workshop or store) | withdraw | null | craft | collect:ID:ITEMS | **GATED** | gated: stocking or production work |  |
| production.ts:236 | deposit | null | craft | bring:ID:ITEMS | **GATED** | gated: stocking or production work |  |
| production.ts:280 | fetch_water | null | craft | fetch_water:production | **kept** | kept: not a named stocking or production kind | DOUBTFUL: water for a workshop job; fetch_water is not a named kind, so kept |
| production.ts:496 | operate | null | craft | operate:ID:RECIPE | **GATED** | gated: stocking or production work |  |
| production.ts:812 | tool_work | null | craft | mend:ID | **GATED** | gated: stocking or production work |  |
| production.ts:835 | tool_work | null | craft | mend:cart:ID | **GATED** | gated: stocking or production work |  |
| production.ts:922 | deposit | null | craft | rack:ID:KIND | **GATED** | gated: stocking or production work |  |
| production.ts:995 | cart_haul | null | site | cart:ID:ID | **GATED** | gated: stocking or production work |  |
| production.ts:1188 | plan_site | null | build | plan_site:TYPE | **GATED** | gated: stocking or production work | DOUBTFUL: as options_work.ts:858 |
| production.ts:1267 | plan_site | null | build | plan_site:house | **GATED** | gated: stocking or production work | DOUBTFUL: as options_work.ts:858 |
| production.ts:1410 | rest | null | rest | project_wait:ID:ID | **kept** | kept: not a named stocking or production kind |  |
| transport.ts:122 | cart_haul | null | transport | cart:… | **GATED** | gated: stocking or production work |  |
| care_capacity.ts:70 | deposit | null | care | care_store:ID:ID | **kept** | kept: tag care | DOUBTFUL: deposit is gated, but this one is made for a named dependant (tag care) |
| care_capacity.ts:96 | deposit | null | care | care_water:ID:ID | **kept** | kept: tag care | DOUBTFUL: as care_capacity.ts:70 |
| care_supply.ts:54 | fetch_water | null | care | care_supply:ID:water:ID | **kept** | kept: tag care |  |
| wells.ts:65 (water for a named person) | fetch_water | null | care | care_supply:ID:water:ID | **kept** | kept: tag care |  |
| wells.ts:65 (water for the household) | fetch_water | null | - | fetch_water:well:ID | **kept** | kept: not a named stocking or production kind | DOUBTFUL: as options_work.ts:1470 |
| clothing.ts:93 | give | null | help | clothe_child:ID | **kept** | kept: not a named stocking or production kind |  |
| resident_care.ts:59 | give | null | care | give:ID:home | **kept** | kept: tag care |  |
| toys.ts:178 | give | null | gift | give:toy:ID | **kept** | kept: not a named stocking or production kind | DOUBTFUL: a toy for a child is not "a person in need", but give is not a gated kind |
| toys.ts:125 | craft | null | craft | craft:toy | **GATED** | gated: stocking or production work | DOUBTFUL: carving a toy for a child is craft (gated); it is made for a named child but not one in need |
| toys.ts:220 | wander | null | play | play:toy | **kept** | kept: not a named stocking or production kind |  |
| play.ts:134 | wander | null | play | play:KIND | **kept** | kept: not a named stocking or production kind |  |
| evening_fire.ts:115 | wander | null | leisure | evening:fire | **kept** | kept: not a named stocking or production kind |  |
| temperament.ts:125 | alone | null | rest | alone | **kept** | kept: not a named stocking or production kind |  |
| communal_stock.ts:49 | deposit | null | store | communal_stock:ID | **GATED** | gated: stocking or production work |  |
| communal_stock.ts:71 (restock gathers pushed from a scratch ctx) | gather | null | store | gather:ID | **GATED** | gated: stocking or production work |  |
| leave_heaviest.ts:131 | deposit | null | store | leave:ID:ITEM | **GATED** | gated: stocking or production work | DOUBTFUL: putting a left-over down to free the hands is housekeeping, but deposit is a named kind |
| pack_materials.ts:52 | deposit | null | store | pack_materials:ID | **GATED** | gated: stocking or production work | DOUBTFUL: as leave_heaviest.ts:131 |
| seed_storage.ts:44 | deposit | null | store | seed_stash:ID | **GATED** | gated: stocking or production work | DOUBTFUL: as leave_heaviest.ts:131 |
| site_supply.ts:116 | deposit | null | craft | saw_to_yard:ID | **GATED** | gated: stocking or production work |  |
| shared_projects.ts:14 (a copy of a plan_site option) | plan_site | null | build | plan_shared:TYPE | **GATED** | gated: stocking or production work | DOUBTFUL: as options_work.ts:858 |
| journey.ts:65 | fetch_water | null | journey | fetch_water:ID | **kept** | kept: not a named stocking or production kind | DOUBTFUL: water for a work trip; fetch_water is not a named kind, so kept |
| journey.ts:83 (gather, build and operate options re-pushed with a journey attached) | gather | null | site | gather:ID | **GATED** | gated: stocking or production work |  |
| forestry.ts:81 | tree_work | null | work | plant_tree:X:Y | **GATED** | gated: stocking or production work | DOUBTFUL: tree_work is not a named kind; gated as planting a tree for wood later |
| forestry.ts:85 | tree_work | null | work | tree_cutting:ID | **GATED** | gated: stocking or production work | DOUBTFUL: as forestry.ts:81 |
| livestock.ts:130 | gather | null | animals | sheep-grain:ID | **GATED** | gated: stocking or production work | DOUBTFUL: grain for sheep is a gather (gated) but it is care of animals, not of a named person |
| livestock.ts:133 (every sheep chore but slaughter) | animal_work | null | animals | sheep:OP:ID | **kept** | kept: not a named stocking or production kind | DOUBTFUL: feeding, watering, shearing and mating sheep is work for later; animal_work is not a named kind, so kept |
| livestock.ts:133 (slaughter) | animal_work | hunger | animals | sheep:slaughter:ID | **kept** | kept: serves the person's own present need |  |
| exchange_journeys.ts:69 | exchange_journey | null | trade | exchange:ID:ITEM:ITEM | **kept** | kept: not a named stocking or production kind | DOUBTFUL: a trip to swap goods; not a named kind, so kept |
| relocation.ts:155 | relocate | null | relocation | relocate:ID:STEP:ID | **kept** | kept: tag relocation | DOUBTFUL: a household move from sustained hunger; kept |
| relocation.ts:225 | withdraw | null | relocation | relocate-pack:ID:ID | **kept** | kept: tag relocation | DOUBTFUL: withdraw is gated, but this packs the household for a move (tag relocation) |
| relocation.ts:245 | plan_site | null | build | relocate-shelter:ID | **kept** | kept: household relocation | DOUBTFUL: plan_site is gated, but this lays out shelter for a move (key relocate…) |
| options_places.ts:20 | pay_respects | null | social | respects:ID | **kept** | kept: not a named stocking or production kind | DOUBTFUL: work category in TimeBudget, but it is a visit to a grave; kept |
| wolf_skin.ts:116 | hang_skin | null | social | hang_skin:ID | **kept** | kept: not a named stocking or production kind | DOUBTFUL: work category in TimeBudget; a ritual at the hall, kept |
| options_social.ts:102 (chat, request, ask, warn, offer, and the rest) | socialize | social | social | socialize:ID:PURPOSE | **kept** | kept: serves the person's own present need |  |
| options_social.ts:714 | visit | null | trade | supply:ID:ITEM | **kept** | kept: not a named stocking or production kind |  |
| meals.ts:174 | socialize | social | meal | socialize:ID:invite | **kept** | kept: serves the person's own present need |  |
| meals.ts:230 | socialize | social | meal | socialize:ID:invite2 | **kept** | kept: serves the person's own present need |  |
| meals.ts:272 | withdraw | null | meal | withdraw:ID:meal | **kept** | kept: tag meal | DOUBTFUL: withdraw is gated, but this fetches a meal to share (tag meal) |
| meals.ts:313 | host_meal | null | meal | host_meal:ID | **kept** | kept: tag meal |  |
| meals.ts:355 | socialize | social | meal | socialize:ID:reschedule:ID | **kept** | kept: serves the person's own present need |  |
| meals.ts:371 | attend_meal | null | meal | attend_meal:ID | **kept** | kept: tag meal |  |
| occasions.ts:225 | attend | social | social | attend:ID | **kept** | kept: serves the person's own present need |  |
| welfare.ts:186 | visit | null | care | visit:ID | **kept** | kept: tag care |  |
| welfare.ts:269 | visit | null | care | seek:ID | **kept** | kept: tag care |  |

Not option kinds (no row of their own):

- optutil.ts:282, 283: the definition of addOption
- options_survival.ts:511: the list of beds before the sleep option is built (sleep rows above)
- options_work.ts:446 to 468: the weights of the tool a person might make (a list of {t, w}, not options)
- options_work.ts:1102: the craft offers of a scratch ctx merged into ctx.options (craft row above)
- production.ts:1422: the batch plan's step offers merged into ctx.options (the kinds of production.ts above)
- carcass_supply.ts:33, communal_stock.ts:71, journey.ts:83: re-pushes of options built elsewhere (rows above)

By kind (rows of the table above):

| kind | rows | gated | kept | any doubtful |
| --- | --- | --- | --- | --- |
| alone | 1 | 0 | 1 |  |
| animal_work | 2 | 0 | 2 | yes |
| attend | 1 | 0 | 1 |  |
| attend_meal | 1 | 0 | 1 |  |
| build | 1 | 1 | 0 |  |
| butcher | 2 | 0 | 2 | yes |
| cart_haul | 2 | 2 | 0 |  |
| claim_home | 1 | 0 | 1 | yes |
| craft | 2 | 2 | 0 | yes |
| defend | 1 | 0 | 1 |  |
| deposit | 11 | 8 | 3 | yes |
| drink | 4 | 0 | 4 |  |
| eat | 1 | 0 | 1 |  |
| eat_store | 1 | 0 | 1 |  |
| exchange_journey | 1 | 0 | 1 | yes |
| explore | 2 | 1 | 1 | yes |
| fetch_water | 7 | 0 | 7 | yes |
| flee | 1 | 0 | 1 |  |
| fuel_fire | 3 | 0 | 3 | yes |
| gather | 8 | 6 | 2 | yes |
| gear_work | 1 | 0 | 1 | yes |
| give | 6 | 0 | 6 | yes |
| hang_skin | 1 | 0 | 1 | yes |
| harvest | 2 | 1 | 1 |  |
| haul | 1 | 1 | 0 |  |
| host_meal | 1 | 0 | 1 |  |
| hunt | 1 | 0 | 1 | yes |
| operate | 1 | 1 | 0 |  |
| pay_respects | 1 | 0 | 1 | yes |
| plan_site | 6 | 4 | 2 | yes |
| plant | 1 | 1 | 0 |  |
| relocate | 1 | 0 | 1 | yes |
| repair | 1 | 1 | 0 |  |
| rest | 4 | 0 | 4 |  |
| sleep | 2 | 0 | 2 |  |
| socialize | 4 | 0 | 4 |  |
| tend | 1 | 1 | 0 |  |
| till | 2 | 2 | 0 |  |
| tool_work | 3 | 2 | 1 |  |
| tree_work | 2 | 2 | 0 | yes |
| visit | 4 | 0 | 4 |  |
| wander | 5 | 0 | 5 |  |
| warm | 1 | 0 | 1 |  |
| withdraw | 5 | 3 | 2 | yes |

Activity kinds that appear in no option row: converse, argue, care, fulfill, search, return_tool (they are started by the social and commitment code, not offered through addOption; return_tool is a commitment kind). Rows: 110; doubtful rows: 34; table and classifyOption agree on every row: true.
