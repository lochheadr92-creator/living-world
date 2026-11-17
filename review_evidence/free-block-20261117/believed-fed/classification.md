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
