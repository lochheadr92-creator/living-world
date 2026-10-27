# Generated reference

Written by `npx vite-node scripts/reference.ts`. Do not edit by hand; values are read live from `src/sim/constants.ts`.

## Time

| Constant | Value | Meaning |
|---|---|---|
| TPS | 10 | simulation ticks per real second at 1× playback |
| DAY | 2400 | ticks in one simulated day (240 s) |
| START_FRAC | 0.3 | fraction of a day the world starts at (0.30 ≈ 07:12) |
| SUNRISE | 0.25 | fraction of a day the sun rises |
| SUNSET | 0.77 | fraction of a day the sun sets |
| TWILIGHT | 0.07 | fraction of a day of twilight after sunset |

## Need rates (lost or gained per tick)

| Constant | Value | Meaning |
|---|---|---|
| HUNGER_RATE | 0.03 | hunger lost per tick |
| THIRST_RATE | 0.04 | thirst lost per tick |
| ENERGY_RATE | 0.04 | energy lost per tick while awake |
| SOCIAL_RATE | 0.017 | social need lost per tick |
| SLEEP_RECOVER | 0.115 | energy recovered per tick while asleep |
| REST_RECOVER | 0.03 | energy recovered per tick while resting |

## Drive bands and critical thresholds (per need)

| Need | Starts to matter | Strongly pressing | Critical |
|---|---|---|---|
| hunger | 62 | 36 | 14 |
| thirst | 66 | 40 | 14 |
| energy | 46 | 20 | 8 |
| warmth | 52 | 30 | 14 |
| safety | 60 | 36 | 20 |
| social | 48 | 26 | 0 |

## Life

| Constant | Value | Meaning |
|---|---|---|
| AGE_CHILD | 12 | a person is a child until this age (years) |
| AGE_ADULT | 16 | a person is an adult from this age (years) |
| AGE_ELDER | 62 | a person is an elder from this age (years) |
| AGE_OLD_DEATH_START | 76 | old-age death becomes possible from this age (years) |
| DAYS_PER_YEAR | 12 | simulated days per year of age |
| TICKS_PER_YEAR | 28800 | ticks per year of age |
| PREGNANCY_TICKS | 21600 | pregnancy length (2160 s) |
| BIRTH_SPACING_TICKS | 43200 | minimum time between a mother's births (4320 s) |
| CONCEPTION_PER_YEAR | 0.5 | chance per year a settled, well-fed couple conceives |

## Social timings

| Constant | Value | Meaning |
|---|---|---|
| CONV_REACH | 2 | how close two people must be to talk (tiles) |
| REQUEST_TTL | 700 | how long a request stays open (70 s) |
| PROMISE_TTL | 1800 | how long a promise has to be met (180 s) |
| GREET_COOLDOWN | 400 | how long before the same pair greets again (40 s) |
| LOAN_TERM | 2400 | how long a loaned tool may be kept (240 s) |

## Commitment and decision timings

| Constant | Value | Meaning |
|---|---|---|
| REVIEW_EVERY | 45 | how often a busy person reviews their options (ticks) |
| MIN_COMMIT | 70 | minimum ticks a chosen activity commits to |
| SWITCH_MARGIN | 1.3 | how much better a new option must be to make someone switch |
| SITE_PATIENCE | 9600 | how long an unworked building site waits before being given up (960 s) |
| PROJECT_PATIENCE | 16800 | how long an improvement project waits for its materials (1680 s) |

## Option score terms (extracted text, not evaluated)

195 `sc.add('label', …)` call sites in `src/sim`. The label is the literal text as written at each call site; it is extracted, not evaluated.

| Site | Label |
|---|---|
| src/sim/defence.ts:229 | not one to run |
| src/sim/defence.ts:230 | would not leave them to it |
| src/sim/defence.ts:232 | too close to turn my back on |
| src/sim/defence.ts:235 | hurt already |
| src/sim/defence.ts:236 | walking |
| src/sim/hunting.ts:51 | a good hunter |
| src/sim/hunting.ts:53 | walking |
| src/sim/hunting.ts:54 | no room for the meat |
| src/sim/leisure.ts:123 | the evening gathering |
| src/sim/leisure.ts:125 | the walk |
| src/sim/leisure.ts:144 | nothing pressing |
| src/sim/leisure.ts:148 | spare time stays a fallback |
| src/sim/meals.ts:153 | food to share and good company to share it with |
| src/sim/meals.ts:154 | walking |
| src/sim/meals.ts:155 | a hall to eat in |
| src/sim/meals.ts:156 | the learned practice of sharing supper |
| src/sim/meals.ts:211 | room at the table |
| src/sim/meals.ts:211 | walking |
| src/sim/meals.ts:255 | guests are coming: lay the table |
| src/sim/meals.ts:255 | walking |
| src/sim/meals.ts:299 | walking |
| src/sim/occasions.ts:212 | company |
| src/sim/occasions.ts:216 | out of the weather at the hall |
| src/sim/occasions.ts:218 | walking |
| src/sim/options_social.ts:111 | wants company |
| src/sim/options_social.ts:113 | evening company |
| src/sim/options_social.ts:117 | drawn to each other |
| src/sim/options_social.ts:119 | close by |
| src/sim/options_social.ts:123 | someone to lean on |
| src/sim/options_social.ts:124 | one of my crew |
| src/sim/options_social.ts:125 | walking |
| src/sim/options_social.ts:182 | they owe me a favour |
| src/sim/options_social.ts:183 | walking |
| src/sim/options_social.ts:202 | walking |
| src/sim/options_social.ts:221 | the roof is failing and there is no one here who can mend it |
| src/sim/options_social.ts:221 | walking |
| src/sim/options_social.ts:236 | they are carrying one |
| src/sim/options_social.ts:236 | walking |
| src/sim/options_social.ts:295 | walking |
| src/sim/options_social.ts:330 | they are carrying some |
| src/sim/options_social.ts:330 | walking |
| src/sim/options_social.ts:371 | walking |
| src/sim/options_social.ts:391 | saw a wolf recently |
| src/sim/options_social.ts:391 | walking |
| src/sim/options_social.ts:392 | a child |
| src/sim/options_social.ts:431 | a child |
| src/sim/options_social.ts:432 | family |
| src/sim/options_social.ts:433 | friendship |
| src/sim/options_social.ts:434 | making peace |
| src/sim/options_social.ts:435 | walking |
| src/sim/options_social.ts:457 | walking |
| src/sim/options_social.ts:458 | misses the company |
| src/sim/options_social.ts:475 | a peacemaker by nature |
| src/sim/options_social.ts:476 | walking |
| src/sim/options_social.ts:508 | could use a hand with the building |
| src/sim/options_social.ts:508 | walking |
| src/sim/options_social.ts:543 | walking |
| src/sim/options_social.ts:580 | a swap could give me what I lack |
| src/sim/options_social.ts:580 | walking |
| src/sim/options_social.ts:595 | pass a useful technique to family or apprentice |
| src/sim/options_social.ts:595 | walking |
| src/sim/options_survival.ts:107 | danger close |
| src/sim/options_survival.ts:182 | hungry |
| src/sim/options_survival.ts:184 | well-liked food |
| src/sim/options_survival.ts:185 | walking |
| src/sim/options_survival.ts:187 | good at it |
| src/sim/options_survival.ts:191 | wolf nearby |
| src/sim/options_survival.ts:239 | hungry |
| src/sim/options_survival.ts:239 | food in pack |
| src/sim/options_survival.ts:291 | hungry |
| src/sim/options_survival.ts:291 | walking |
| src/sim/options_survival.ts:292 | conscience |
| src/sim/options_survival.ts:338 | thirsty |
| src/sim/options_survival.ts:338 | water in pack |
| src/sim/options_survival.ts:365 | thirsty |
| src/sim/options_survival.ts:365 | walking |
| src/sim/options_survival.ts:366 | wolf nearby |
| src/sim/options_survival.ts:367 | was driven off near here |
| src/sim/options_survival.ts:433 | walking |
| src/sim/options_survival.ts:435 | feverish |
| src/sim/options_survival.ts:437 | wolf nearby |
| src/sim/options_survival.ts:475 | exhausted |
| src/sim/options_survival.ts:521 | cold |
| src/sim/options_survival.ts:521 | walking |
| src/sim/options_survival.ts:521 | company at the fire |
| src/sim/options_survival.ts:560 | walking |
| src/sim/options_survival.ts:616 | the night to get through |
| src/sim/options_survival.ts:617 | cold out there |
| src/sim/options_survival.ts:655 | tired |
| src/sim/options_survival.ts:656 | feverish |
| src/sim/options_work.ts:198 | surplus food |
| src/sim/options_work.ts:200 | walking |
| src/sim/options_work.ts:382 | walking |
| src/sim/options_work.ts:384 | good at it |
| src/sim/options_work.ts:388 | wolf nearby |
| src/sim/options_work.ts:502 | carrying what it needs |
| src/sim/options_work.ts:502 | walking |
| src/sim/options_work.ts:503 | I promised |
| src/sim/options_work.ts:549 | building work to do |
| src/sim/options_work.ts:549 | walking |
| src/sim/options_work.ts:549 | good builder |
| src/sim/options_work.ts:550 | I promised |
| src/sim/options_work.ts:642 | night is coming |
| src/sim/options_work.ts:749 | walking |
| src/sim/options_work.ts:750 | promised to keep it going |
| src/sim/options_work.ts:751 | cold |
| src/sim/options_work.ts:797 | walking |
| src/sim/options_work.ts:895 | walking |
| src/sim/options_work.ts:985 | unfinished ground |
| src/sim/options_work.ts:985 | walking |
| src/sim/options_work.ts:989 | seed in hand, ground ready |
| src/sim/options_work.ts:989 | walking |
| src/sim/options_work.ts:997 | crop needs care |
| src/sim/options_work.ts:997 | walking |
| src/sim/options_work.ts:1001 | ripe crop |
| src/sim/options_work.ts:1001 | walking |
| src/sim/options_work.ts:1013 | seed to sow, ground to prepare |
| src/sim/options_work.ts:1054 | seed for planting is at home |
| src/sim/options_work.ts:1054 | walking |
| src/sim/options_work.ts:1120 | belongings lying about |
| src/sim/options_work.ts:1120 | walking |
| src/sim/options_work.ts:1121 | wolf nearby |
| src/sim/options_work.ts:1170 | walking |
| src/sim/options_work.ts:1171 | wolf nearby |
| src/sim/options_work.ts:1172 | was driven off near here |
| src/sim/options_work.ts:1279 | curiosity |
| src/sim/options_work.ts:1279 | walking |
| src/sim/options_work.ts:1279 | daylight to spare |
| src/sim/options_work.ts:1366 | walking |
| src/sim/options_work.ts:1368 | family |
| src/sim/options_work.ts:1424 | walking |
| src/sim/options_work.ts:1471 | walking |
| src/sim/options_work.ts:1548 | walking |
| src/sim/options_work.ts:1587 | walking |
| src/sim/options_work.ts:1588 | wolf nearby |
| src/sim/options_work.ts:1589 | was driven off near here |
| src/sim/options_work.ts:1636 | an empty home nobody uses |
| src/sim/options_work.ts:1636 | walking |
| src/sim/options_work.ts:1668 | nothing pressing |
| src/sim/production.ts:120 | walking |
| src/sim/production.ts:122 | wolf nearby |
| src/sim/production.ts:166 | walking |
| src/sim/production.ts:207 | walking |
| src/sim/production.ts:208 | wolf nearby |
| src/sim/production.ts:209 | was driven off near here |
| src/sim/production.ts:349 | walking |
| src/sim/production.ts:351 | practised at it |
| src/sim/production.ts:352 | already crowded |
| src/sim/production.ts:353 | cuts stone far faster than breaking small rocks |
| src/sim/production.ts:354 | a saw wastes far less wood |
| src/sim/production.ts:608 | the cart is wearing out |
| src/sim/production.ts:608 | walking |
| src/sim/production.ts:689 | walking |
| src/sim/production.ts:757 | a cart can move all of it in one go |
| src/sim/production.ts:759 | walking |
| src/sim/production.ts:1011 | the hut is too small and wearing thin: rebuild it as a proper house |
| src/sim/recipes.ts:305 | wood |
| src/sim/recipes.ts:306 | planks |
| src/sim/recipes.ts:307 | handles |
| src/sim/recipes.ts:308 | hammer |
| src/sim/recipes.ts:309 | saw |
| src/sim/recipes.ts:310 | axe |
| src/sim/recipes.ts:313 | stone |
| src/sim/recipes.ts:314 | pick |
| src/sim/recipes.ts:317 | clay |
| src/sim/recipes.ts:318 | wood |
| src/sim/recipes.ts:319 | bricks |
| src/sim/recipes.ts:320 | charcoal |
| src/sim/recipes.ts:321 | jar |
| src/sim/recipes.ts:324 | hammer |
| src/sim/recipes.ts:325 | ore |
| src/sim/recipes.ts:326 | charcoal |
| src/sim/recipes.ts:327 | iron |
| src/sim/recipes.ts:328 | handles |
| src/sim/recipes.ts:331 | grain |
| src/sim/recipes.ts:332 | flour |
| src/sim/recipes.ts:333 | bread |
| src/sim/recipes.ts:334 | wood |
| src/sim/recipes.ts:335 | water |
| src/sim/recipes.ts:338 | grain |
| src/sim/recipes.ts:339 | flour |
| src/sim/recipes.ts:340 | bread |
| src/sim/recipes.ts:341 | seeds |
| src/sim/recipes.ts:344 | bread |
| src/sim/recipes.ts:345 | fish |
| src/sim/recipes.ts:346 | fruit |
| src/sim/recipes.ts:347 | berries |
| src/sim/recipes.ts:348 | grain |
| src/sim/recipes.ts:349 | wood |
| src/sim/temperament.ts:115 | has had too much company |
| src/sim/temperament.ts:116 | walking |
| src/sim/welfare.ts:157 | walking |
| src/sim/welfare.ts:158 | family |
| src/sim/welfare.ts:159 | someone who cannot manage alone |
| src/sim/welfare.ts:160 | night |
