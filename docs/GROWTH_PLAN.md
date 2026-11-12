# The growth plan: from a camp of 30 to a world that keeps growing

Asked for by the owner on 13 November 2026, after the 20-year run at rules 220 (`docs/GENERATION_RUN.md`): "I want it to grow and
expand", to many people and ever more advanced buildings (their examples: hospitals, skyscrapers), "not just a simulation of 30
people living forever". This file is the plan and the record of each step taken on it. One section a step; no other paperwork.

## Where it stands (rules 220, measured)

- A settlement holds at about 31 people for 20 years without arrivals; with arrivals it climbs to 55 to 59 and starves, 27 times
  in ten of twelve worlds. The land feeds about 35 people through a lean season.
- People are under the hungry line for half their waking time in every year. Pairing up, having a child and rebuilding a hut as a
  house are each allowed only to someone who is not hungry (read in source, not measured as the cause).
- Building stops after year two. No house, smithy, mill, bakery or brewery stands in any of 24 runs; ore is never used.
- The whole ladder is 18 building types and three crafts. Its top is an iron-age village.
- A 20-year run of about 40 people takes 71 to 110 minutes. The id counter runs out near day 900.

## How each step is done

One change, one rules version, with a switch. Then 12 worlds for 20 years with arrivals on, beside the version before (about two
hours on this machine). Keep it if the settlement grows without more dying; otherwise turn it off and say so. The measure for
every step is the same four numbers: people at years 5, 10 and 20; deaths; falls of eight or more in three days; and what stands.

## The steps

| # | Step | What it is | Done when | Size |
|---|---|---|---|---|
| 1 | **Room to grow** | The fixed limits on people and building lifted (rules 225) | done, 13 November | small |
| 2 | **Food to grow on** | More food from the same land (rules 226: wild food and crops doubled) | the 20-year runs show people rising year on year and fewer famines than at 220 | small |
| 3 | **Arrivals the land can carry** | Newcomers admitted on what the settlement has put by for a lean season, not on one day's food | two in three newcomers no longer die; no fall of eight in most worlds | small |
| 4 | **Families** | Find why few pair up and few are born (count weddings and partnered women), then repair that one thing | births exceed deaths without arrivals | medium |
| 5 | **Building that goes on** | Find why no house and no smithy is ever built, repair the chain to iron; stone that does not run out | every world has a smithy and iron tools by year 5 and houses by year 10 | medium |
| 6 | **A faster engine** | Measure where the time goes; a wider id space; the aim is 500 people at the speed 40 run at today. First part taken: a job begun is finished (rules 227) | a 20-year run of 500 people finishes overnight | large |
| 7 | **Room to spread** | Bigger maps, daughter settlements founded by the crowded, trade between them (maps for 100 and 250 founders exist) | one world passes 300 people across several settlements | large |
| 8 | **New rungs, one at a time** | Each rung is a new need, new buildings, new crafts and the knowledge to pass on. Village: healer's hut, school, mill and bakery in use, carts and roads. Town: brick and stone streets, coin, a market hall, a hospital. City: buildings of several floors, workshops that become works, and so on up | each rung is reached in an ordinary run by a settlement large and fed enough, and never before | open-ended |
| 9 | **Near and far** | People close to the viewer simulated in full, those far away in outline, so thousands are possible | a world of thousands runs | large |

Steps 2 to 5 make a village that grows by itself. Steps 6 and 7 make it more than one village. Steps 8 and 9 are the long road:
hospitals come early on it, skyscrapers at its far end. Steps 4, 5 and 6 do not depend on each other and can be taken in any order.

## Step 1: room to grow (rules 225, `src/sim/growth_room.ts`)

The owner's instruction: "lift the population limits ... lift the building limits". Four switched parts:

- **People**: no number of living people stops a conception or an arrival (the ceilings were 64 and 54). What admits an arrival
  (food per head and roofs on the day, the spacing between groups) and what allows a conception are unchanged.
- **Sites**: no count of open ordinary sites turns a new one away (it was four). A household still lays out one at a time.
- **Projects**: one improvement project for every 14 living people, never fewer than the two (three from 55) there were.
- **Workplaces**: one workplace of each kind for every 28 living people, never fewer than one: a second from 56 people.

Checks: `tests/growth_room.test.ts` (9, each with the rules-220 contrast); pin `tests/v225_continuation.*` (Normal river, arrivals
on: five open sites at tick 800 where rules 220 has four; recorded from a clean checkout of `c3c3c444`). In ordinary worlds the
site limit bites on the first day: river, birch, cedar and fern part from their rules-220 twins by ticks 800, 900, 2,400 and 2,600.
Lab arms: `rich-no-growth-room` and one for each part.

**Result (20-year runs, 12 seeds, arrivals on; `review_evidence/growth-20261113/generation/`): lifting the limits alone does not
make a settlement bigger.** Eleven of the twelve runs reached year 18 or more (two were stopped at the owner's word at years 18
and 19). Beside rules 220, to year 12, a settlement: people 35.7 against 36.6; came 37.8 against 30.8; died 38.0 against 30.7;
starved (all twelve) 216 against 163; falls of eight or more in three days 12 against 14. Peaks went past the old ceiling (78, 74,
68, 63) and fell back. Open sites 7.2 against 5.5 and sites abandoned 61 against 41 a settlement: the lifted site limit spreads
the building thinner. One run a seed, so a description and not an effect against chance. The parts are not separated yet (the
lab arms `rich-no-growth-room-sites` and the others are for that).

## Step 2: food to grow on (rules 226, `src/sim/plenty.ts`)

The owner's instruction: "if need be ... increase the amount of food available". The need is already in the rules-220 run (the
land feeds about 35; a ceiling of 54 already starved), so this was built with step 1 and is measured beside it. Two switched parts:

- **Wild**: berries, fruit, fish and wild grain come back twice as fast. A place holds no more than it did. What people expect of
  a place they have not seen for a while follows the same pace.
- **Crops**: a ripened plot carries twice the grain; seed, time and work unchanged.

A lean season, a dry spell and winter cut the larger amount by the fractions they always did. The factor of two is a first dose,
not a measured one.

Checks: `tests/plenty.test.ts` (7, each with the rules-225 contrast); pin `tests/v226_continuation.*` (Normal aspen, arrivals on,
one day: 592 wild food standing where rules 225 has 579; recorded from a clean checkout of `e59db513`). Lab arms: `rich-no-plenty`,
`rich-no-plenty-wild`, `rich-no-plenty-crops`.

**Result (the same runs at rules 226; five finished 20 years, one died out, six were stopped at the owner's word between years
12 and 17): more food makes a settlement grow, and shows the next ceilings.** To year 12, a settlement, against rules 220:
people 51.8 against 36.6 (60.8 against 43.9 at year 9); born 14.3 against 8.5; children 12.5 against 7.9; couples 10.2 against
6.8; time under the hungry line 53% against 57%; family time 834 against 549; falls of eight or more 8 against 14. Six worlds
passed 80 people and four passed 100.

- **Water is the next ceiling.** gen-5 reached 112 people with about 500 food in store and lost all of them to thirst in three
  days of its tenth year (13, then 91, then 5). Thirst took 140 people in the twelve runs against 8 at rules 220.
- **A lean season that runs into winter still starves the large settlement**: aspen fell from 103 to 63 in three days, meadow
  from 76 to 56.
- **Four worlds had no arrival in 20 years** (birch, gen-2, gen-3, gen-6; at rules 225 the last three had 24 to 82). They grew
  by births alone to 32 to 43 people and lost 2 to 9 people in 20 years. Why nobody came is not looked into.
- **Nothing higher was built**: no house, smithy, mill or bakery in any of the 24 runs; one hall and one granary. See step 5.
- Sites abandoned 98 a settlement against 41, open sites 12.8 against 5.5, stone left 198 against 272.
- The id counter reached 318,000 in 17 years at about 75 people (the limit is 1,000,000).

One run a seed: a description, not an effect against chance. The factor of two was a first dose and is not tuned.

## Step 5, the diagnosis: why nothing higher is built (measured 13 November, no rule changed)

The owner's question: why is everything abandoned and nothing higher built. Evidence: `review_evidence/growth-20261113/building-stall/`.

**They do plan the higher buildings.** In the 24 finished rules-220 runs a smithy site was open at the end of 12 to 19 of the 20
years in every settlement, a house site in every settlement, a hall site in 23 and a granary site in 22; none of the smithies or
houses was ever finished.

**The sites wait for planks and bricks that are never made** (`scripts/build_trace.ts`, new and read-only; birch and river, six
years each, rules 227, one run each):

| site | laid out | finished | what the abandoned ones still lacked |
|---|---|---|---|
| smithy | 8 | 0 | 4 bricks, every time (the wood and stone had arrived) |
| house (a hut rebuilt) | 6 | 0 | 7 or 8 planks and 6 bricks |
| hall | 5 | 0 | 10 planks |
| granary | 2 | 0 | 8 planks |
| hut, hut rebuilt, lean-to, well, storehouse, timber yard, kiln, quarry, mine, food rack | 75 | 75 | (one hut still open) |
| cellar | 30 | 20 | river only: 9 abandoned short of 9 stone and wood |

In those six years the two settlements made **no bricks and two and three planks**, with a kiln and a timber yard standing from
the first years. Nobody fired charcoal either. A site of this kind is abandoned after seven days untouched and laid out again.

**The work is offered, and loses** (`scripts/supply_probe.ts`, new and read-only: each grown person awake, every 300 ticks from
the second year for two years, asked as an observer what their options are; birch and river). Of 3,409 looks at somebody who knew
of a site short of planks or bricks:

- in 2,110 (62%) a step toward planks or bricks was among their options, and it was their first choice 46 times (1.3%). When it
  lost it was behind by about 25 points, to sleep and waiting for light, storing and gathering food, the fire, fibre and stone;
- what is offered is nearly always the first step of the chain (bring wood to the yard, chop wood for planks, dig clay for
  bricks). "Hewing planks" was offered 20 times and "Firing bricks" never;
- the refusals that concern the chain: "Sawing planks: needs a saw and has none (and none is on the rack)" 638 times, although
  seven or eight saws had been made in each world (each in its maker's pack); "Get clay ...: no room in my pack for one clay" 411
  times; "does not know of a kiln they may use" 41 times;
- in river, "Cutting stone: the outcrop is worked out" 554 times: the quarry's outcrop was finished within three years;
- in 793 looks (23%) nothing about it was offered or refused: the person was too hungry, thirsty or tired for any production
  (`production.ts productionOptions`), or it was not their turn to see it.

Read in source: a site's missing material is wanted at 34 times the site's relevance to the person, plus 4
(`options_work.ts materialNeeds`), and each further step of a chain is worth a little less than the one before
(`production.ts planRecipe`). A household's own hut gets the full weight and is built in two or three days; a shared smithy
gets less, and its bricks are three steps away (clay, wood, a firing by two people).

So the stall is priority and logistics, not want: making planks and bricks is a chain of low-scoring steps, the saw is not where
the sawing is, and packs have no room for clay. No repair is made yet; what to change is the owner's to choose.

## Step 6, first part: a job begun is finished (rules 227, `src/sim/finish_job.ts`)

The owner's instruction of 13 November: people should finish certain jobs before doing anything else unless a critical need says
otherwise (not the walk there), and should stop changing what they are doing half-way or to talk. It is a repair of behaviour
first and a saving of work second.

Measured first, at rules 226 (`scripts/job_drops.ts`, four ordinary worlds, eight days, one run each;
`review_evidence/growth-20261113/job-drops/`):

- People took 31,657 second looks at a job under way against 10,833 fresh choices: three in four of all the choosing done.
- A third of gathering trips were dropped at the work, on average 46% through (866 of 2,664); so were 30% of spells of building,
  36% of tilling and 55% of repairs, and no repair was finished in one go. "Something better came up" was 77% of the reasons.
- Second looks go most to people asleep (about 28%) and resting (21%); about 15% to people at a job.
- Somebody beginning to talk to a person put their work on hold 616 times, and what had been done of that piece was set back.

Three switched parts:

- **Hold**: somebody at the work of a job takes no second look. A danger, a critical need, a stuck job, hunger eased with food
  already in the pack, or 800 ticks since the job was chosen bring it back. Walking to the job is not held.
- **Asleep**: a sleeper takes no second look unless a need is critical or a danger is known.
- **Quiet**: nobody walks up to a person they can see is at work for a chat, family time or a game. Asking, warning, offering
  and teaching are unchanged.

The same four worlds at rules 227 (one run each: a description, not a measured effect):

| | rules 226 | rules 227 |
|---|---|---|
| second looks at a job under way | 31,657 | 18,511 |
| gathering trips finished / dropped at the work | 1,019 / 866 of 2,664 | 1,482 / 321 of 2,821 |
| repairs finished / dropped at the work | 0 / 36 of 66 | 17 / 0 of 44 |
| crafting dropped at the work | 24 of 114 | 0 of 145 |
| tilling dropped at the work | 20 of 56 | 3 of 55 |
| building dropped at the work | 145 of 483 | 149 of 513 |
| milliseconds a tick (machine busy with other runs) | 3.8 to 4.5 | 3.2 to 3.9 |

Building is not changed, and why is not looked into. The speed figures were taken while 24 other runs used every core, so no
speed claim is made; the engine is to be profiled on a free machine.

Checks: `tests/finish_job.test.ts` (10); 366 tests in 35 related files pass; pin `tests/v227_continuation.*` (Normal aspen,
arrivals on, one day: 1 job dropped at the work for something better where rules 226 has 22; clean checkout of `44c6dae1`). Lab
arms: `rich-no-finish-job`, and `-hold`, `-asleep`, `-quiet`.

**Result: the paired lab is not run yet** (it waits for the 20-year runs to free the machine). What to watch in it: hunger time
(a person no longer breaks off work to eat until it is critical, unless the work was for hunger and food is in the pack), family
time, child play and chats (the quiet part), and deaths.

## Everything found that needs attention (13 November 2026)

Gathered from the 20-year runs at rules 220, 225 and 226, the job, site and supply probes, and the source read on the way. Each
line says how it is known: measured, read in source, or not looked into.

**What stops growth, in the order it bites**

1. **No bricks and almost no planks are made**, so no smithy, house, hall or granary is finished and ore is never used
   (measured; step 5). The work is offered and loses; the saw is in its maker's pack, not at the yard; packs have no room for clay.
2. **Water runs out.** A settlement of 110 died of thirst in three days; nothing slows people or warns them first (measured).
   Natural water is a stock only rain refills and a well holds a few units (read in source).
3. **A lean season running into winter** starves a large settlement: 25 to 34 deaths a season at 50 people and more at rules
   220, and falls of 20 to 40 at 226 (measured). Open since rules 220.
4. **Arrivals are admitted on one day's food and roofs.** At rules 220 two in three newcomers die and they are 498 of 735
   deaths (measured). In four of twelve extra-food worlds nobody arrived in 20 years (measured; cause not looked into).
5. **People are under the hungry line half the time** even with double food (57% to 53%), and farm plots growing from 14 to 95
   did not change it (measured; cause not looked into).
6. **Few pair up and few are born.** Births fall each four years at rules 220; with more food births and couples rise by half
   (measured). Half of all pairs can never be partners and nobody proposes while hungry (read in source). Weddings and partnered
   women are not counted by the trace, so which rule holds births down is not measured.
7. **Stone is finite and runs down faster as a settlement grows**: 570 to 193 in 20 years at 220; one quarry's outcrop was
   worked out in three years; cellars are abandoned for want of stone (measured).
8. **More sites are abandoned with the site limit lifted**: 41, 61 and 98 a settlement by year 12 at 220, 225 and 226
   (measured; the part is not separated in a lab yet). It may need to come back in a milder form.
9. **Lifting the people limit without more food** made nothing bigger and more starved (measured). It belongs with step 2.
10. **The ladder is short**: 18 building types and three crafts; no healer, school or anything past an iron-age village (read
    in source; step 8). No cart and almost no apprentice in any run; craft skill falls over 20 years (measured).
11. Other deaths at rules 220: exposure 178, wolves 78, fever 73 of 735; only 23 people in 24 runs died of old age (measured).

**Behaviour**

12. Jobs dropped half-way: repaired by rules 227, **paired lab not yet read**.
13. Building is still dropped at the work as often at 227 (149 spells against 145) (measured; not looked into).
14. Somebody beginning to talk to a worker resets the piece of work in hand (616 times in four worlds over eight days) (measured).
15. Resting people take a fifth of all second looks; rules 227 holds jobs and sleep, not rest (measured).
16. Under rules 227 a worker runs hunger and thirst down to the critical line (14) before breaking off; whether that costs
    anything is for the lab (read in source).
17. In about a quarter of looks a grown person is too hungry, thirsty or tired to consider any workshop job (measured).

**Engine**

18. Speed: 71 to 110 minutes for 20 years at 40 people; 22 minutes a simulated year at 108 people. Not profiled yet.
19. The id counter: 318,000 in 17 years at about 75 people, limit 1,000,000 (measured). A world of a few hundred cannot run long.
20. Remembered things grow without limit and slow an old world (read in `docs/SCALING.md`, not re-measured).

**State of the work**

21. Rules 225, 226 and 227 are the current rules and none has a paired lab verdict; the factor of two in 226 is a first dose.
22. All of this evidence is one run a seed: descriptions, no noise floor.
23. The full test suite has not been run since the rules-208 head; `tests/iron_chain_stall.test.ts` has failed since rules 206.
24. Nothing since `cc0e656a` is pushed.
25. `PRODUCT_VISION.md` still describes a world of about 100 people.
26. Another session was working in this checkout on 13 November (`review_evidence/civilian-fifteen-days-20261113/`,
    `nova-standard-15day-20261113/`). Its ten-year aspen run was stopped by mistake when the 20-year runs were stopped and was
    started again with the same arguments.
27. Still open from before: whether a lean season may run into winter; the childhood plan's phase 6 and its rules number; what
    arrivals are for (OD-04).

**Order proposed**: 1 (planks and bricks), then 2 (water), 4 (arrivals), 3 (lean winter), 7 (stone), 8 (the site limit), 6
(families, measure first), then the engine (19, then a profile), with 23 and 24 whenever the owner says.

## Not done, and known

- The full suite has not been run since the rules-208 head. With these two commits 119 related tests and the pins of rules 216,
  220, 225 and 226 pass, and typecheck passes.
- More people use ids faster: the counter stood at about 268,000 after 20 years of 41 people and breaks at 1,000,000. Step 6.
- `PRODUCT_VISION.md` still describes a world of about 100 people. It is the owner's to change.
