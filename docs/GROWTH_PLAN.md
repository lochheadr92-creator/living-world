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
the first years. Nobody fired charcoal either. A site of this kind is abandoned after seven days untouched and laid out again. Aspen and meadow, finished later (77 and 76 people at year six), agree: no bricks, none and two planks, all 15 smithy sites short of their 4 bricks; and there cellars are the stone sink, 65 laid out and 32 abandoned short of 9 stone.

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

## Step 5, the repair: what a waiting site lacks gets made (rules 229, `src/sim/site_supply.ts`)

The owner's word on 13 November: build the fix for planks and bricks. Evidence: `review_evidence/growth-20261113/site-supply/`.

**The cause was found while measuring the fix.** The first draft raised the worth of the work, and people then chose a step
toward planks or bricks 697 times in 1,594 daylight looks (before: 46 in 1,485), brought wood to the timber yard, and still made
four planks and no brick in three years. Read in source: since rules 169 (9 November) a glance at a store remembers each kind
there as one, or the store as full, and the planner read a workshop's stock from that glance. Three wood at the yard were one;
a batch needing three was always two short; everybody brought wood and nobody sawed. Only work needing one of a thing, or
nothing, was ever begun (fibre, cut stone). Checked: the same two worlds at rules 228 with the exact copy restored make 17 and 37
planks and 18 bricks in three years, against 2 and none.

Four switched parts:

- **Bench**: somebody judging whether a workshop holds what a batch needs, or collecting what it has made, counts what the
  workshop's own record shows lying ready (kept exact by rules 169, which says so). The glance still governs a house, a
  storehouse and what is passed on.
- **Worth**: a made material a known site waits for counts for 18 more than the site's wood and stone, about the middle of
  ordinary work (the step was worth 16 at the middle, ordinary work 32).
- **Saw**: somebody carrying a saw may leave it at a timber yard with none on its rack, where it is the settlement's and
  whoever saws uses it at the bench (worth 34 before the walk; at 24 it lost nearly every time).
- **Room**: the rule of rules 33 (leave the heaviest left-over of wood or stone to free the hands) also applies to the clay and
  wood a workshop needs for a site's planks and bricks.

**What becomes of the sites** (`scripts/build_trace.ts`, birch, river, aspen and meadow, six years, one run each: a description):

| site | rules 227: laid out, finished | rules 229: laid out, finished |
|---|---|---|
| smithy | 23, 0 | 6, 5 (one still open) |
| hall | 7, 0 | 4, 4 |
| house (a hut rebuilt) | 9, 0 | 6, 3 (one abandoned, two open) |
| granary | 3, 0 | none laid out (not looked into) |

Planks made 22, 18, 20 and 23 (before 2, 3, 0 and 2); bricks 21, 12, 18 and 30 (before none); charcoal in three of the four
(before none). **No iron yet**: smelting and forging are refused as not learned. A saw lies at the yard in all six worlds tried
within 20 days (never before). What is abandoned now is short of stone: cellars 45 of 100, huts 23 of 87 in the
two large settlements, wells 4 of 16.

**Paired lab** (clean checkout of `090424f6` and the untracked pin recorder script, which the lab does not use; 12 seeds,
Normal, fork 0, 25 days, arrivals on; control, two nudges and five removals, 96 arms;
`review_evidence/growth-20261113/site-supply/lab229/report.txt`). Figures are with the rule against without it. Three seeds were
resumed after my own copy of the recorder into the checkout tripped the lab's source guard; the nine finished seeds were kept.

- **The whole rule**: the first hall stands on day 18.1 against 25.0, which is the end of the run, larger than chance, in 11 of
  12 seeds. Workplaces 5.0 against 4.0 and buildings 43.3 against 41.3 lean the same way inside the noise floor. **Tools in hand
  67.0 against 73.7, fewer with the rule, larger than chance.** People 35.1 against 36.3, deaths, hunger, family time and child
  play are not distinguishable.
- **Bench** carries the hall (18.1 against 25.0, larger than chance) and the workshop work (32.8 jobs against 20.8), with
  nothing lost that the lab can see; food in store leans higher with it (4.4 against 3.4 a person).
- **Worth** brings the hall forward (18.1 against 22.9, inside the floor) and **costs upkeep: buildings stand at 61.0 of
  condition against 66.1 without it, larger than chance, in 12 of 12 seeds**; tools 67.0 against 71.0 and people 35.1 against
  36.6 lean the wrong way inside the floor. Whether to keep it at 18, lower it or drop it is the owner's to decide.
- **Saw**: the hall 18.1 against 20.4, inside the floor; nothing else.
- **Room**: the world ends exactly as without it in every seed. It does nothing in two years.

Checks: `tests/site_supply.test.ts` (9); pin `tests/v229_continuation.*` (Normal forest, arrivals on, 20,200 ticks, by when 13
planks have been made and a saw lies at the yard; clean checkout of `090424f6`). Lab arms: `rich-no-site-supply`, `-bench`,
`-worth`, `-saw`, `-room`.

## The worth halved, and deposits that hold more (rules 230 and 231)

On the owner's word after the rules-229 lab. Evidence: `review_evidence/growth-20261113/deposit-plenty/`.

- **Rules 230** (`src/sim/site_supply.ts madeForSiteDose`): a made material a site waits for counts for 9 more, not 18.
- **Rules 231** (`src/sim/deposit_plenty.ts`): a stone outcrop and an ore vein are laid down holding ten times as much. The same
  deposits in the same places from the same draws; loose rocks, clay and the work of a batch unchanged (aspen: outcrop stone
  103 to 1,034, vein ore 54 to 546). A first dose. It acts when a world is made, so it has no removal arm; versions are compared.

**The worth, at 0, 9 and 18** (paired lab at rules 231, clean checkout of `12d3da8c`, 12 seeds, Normal, fork 0, 25 days,
arrivals on, 60 arms; figures are with 9 against the other):

- Against none: the first hall on day 19.0 against 22.6, in 12 of 12 seeds, and workshop jobs 34.4 against 27.3, both inside the
  noise floor; building condition 62.3 against 63.3 and tools 74.2 against 75.8 are not distinguishable. People 35.7 against
  37.0 and deaths 0.3 against none lean the wrong way inside the floor.
- Against 18: the hall comes no sooner at 18 (19.1 against 19.0), and projects finished 92.3 against 87.0, tools 74.2 against
  71.8 and condition 62.3 against 61.1 lean better at 9. **Halving kept what the part gave and the cost that was larger than
  chance at 18 is no longer distinguishable.**

**Deposits, rules 231 against 230** (`scripts/lab_versions.ts`, the same 12 seeds, rules 230 pinned, control and two nudges
each): nothing moves by more than a single draw moves it in 25 days. Leaning with 231, all inside the floor: tools 74.2 against
68.5 (10 of 10 seeds that differ), projects finished 92.3 against 84.8 (11 of 11), workshop jobs 34.4 against 26.5, buildings
45.3 against 43.9. People, deaths and hunger are not distinguishable.

**Six years, four worlds** (`scripts/build_trace.ts`, birch, river, aspen and meadow, one run each: a description; rules 230
against 231):

| site | rules 230: laid out, finished, abandoned | rules 231: laid out, finished, abandoned |
|---|---|---|
| cellar | 102, 39, 59 | 90, 60, 20 |
| hut | 103, 73, 14 | 97, 86, 8 |
| hut rebuilt | 77, 68, 0 | 84, 80, 1 |
| well | 15, 9, 4 | 12, 11, 0 |
| smithy | 6, 5, 1 | 5, 5, 0 |
| hall | 4, 4, 0 | 4, 4, 0 |
| house | 6, 0, 2 | 5, 2, 1 |

Batches of stone cut at the quarry 35 against 109; stone used 1,542 against 1,942. **Still no iron and no ore mined** in any of
the eight runs: a mine stands in every world and "Working the ore mine" was done 0 times. People at year six 34, 35, 80 and 73
against 33, 34, 71 and 69 (one run each; not a finding).

Checks: `tests/deposit_plenty.test.ts` (7), `tests/site_supply.test.ts` (10); pins `tests/v230_continuation.*` (Normal cedar,
19,500 ticks; clean checkout of `9dd86ad8`) and `tests/v231_continuation.*` (Normal aspen, one day; clean checkout of
`12d3da8c`). Lab arm `rich-site-supply-worth-full` holds the worth at 18.

## A builder who runs out goes for materials, and work picked up where it was left (rules 232 and 233)

Steps B and C of the order the owner approved on 13 November. Evidence: `review_evidence/growth-20261113/builder-fetches/`.

**Measured first** (`scripts/job_drops.ts` extended, rules 231, aspen, birch, meadow and river, eight days, one run each):

- Building is not abandoned; it runs out of things to build with. Of 425 spells of building that reached the site, 291 ended
  with the builder standing waiting for materials (60 to 68 ticks each), 85 did no work at all and 85 ended done. Of the 124
  spells counted as dropped, 118 were dropped while waiting. None had run the 800 ticks at which the hold of rules 227 lapses.
  A builder may work only as far as what has been delivered allows (`act_build.ts`), and stood up to 80 ticks before leaving.
- Somebody beginning to talk put work on hold 581 times at the work and set 43,476 ticks of progress back to nothing: rest
  24,890, wandering and warming up about 11,000, gathering 3,389, building 3,073 (which the site keeps), making, tilling and
  mending about 1,200. All but 14 of 1,302 held activities were picked up again.

**Rules 232** (`src/sim/builder_fetches.ts`), two switched parts: a builder with nothing left to build with stands 10 ticks, not
80, and takes a fresh look at the site as they go; and for 600 ticks what that site lacks counts for 10 more to them.

**Rules 233** (`src/sim/picked_up.ts`), two switched parts: work put on hold by talk keeps how far the piece in hand had got, and
has it back when picked up at the same place for a piece of the same length; for jobs (gather, craft, till, plant, tend,
harvest, repair, tree work) and for rest and warming up. This answers AR-01 of `docs/ADVERSARIAL_REVIEW_20261113.md`.

Checks: `tests/builder_fetches.test.ts` (5), `tests/picked_up.test.ts` (5); pins `tests/v232_continuation.*` (Normal aspen, one
day, five builders carrying the note; clean checkout of `574fcdc3`) and `tests/v233_continuation.*` (Normal aspen, tick 134,
held work carrying its count; clean checkout of `0444278f`). Lab arms: `rich-no-builder-fetches`, `-leave`, `-fetch`;
`rich-no-picked-up`, `-jobs`, `-rest`.

**Ordinary worlds at rules 233 against 231** (`scripts/job_drops.ts`, the same four worlds, eight days, one run each: a
description): a builder with nothing to build with stands 11 ticks, not 60 to 68; spells of building dropped while waiting 25
against 118; spells that did no work 87 against 85, and deliveries to sites finished 498 against 490 (no change). Of 219 held
activities picked up again at the work, 155 had their count as it was (12,944 ticks kept) and 64 began again (1,829 ticks; the
kinds the rule leaves out, or the person had moved). Six years, four worlds (`scripts/build_trace.ts`, one run each): a cellar
takes 5.0 days against 6.8, a hut rebuilt 2.0 against 2.6, a well 2.0 against 2.7; what is finished and abandoned is about the
same.

**Paired lab** (clean checkout of `0444278f`, 12 seeds, Normal, fork 0, 25 days, arrivals on; control, two nudges and six
removals, 108 arms; `review_evidence/growth-20261113/builder-fetches/lab233/report.txt`). Figures are with the rule against
without it.

- **Rules 232, both parts**: nothing moves by more than a single draw moves it. **Leave** leans right inside the noise floor:
  buildings 46.7 against 44.3 (11 of 12 seeds), tools 77.1 against 73.3, projects finished 93.3 against 86.4. **Fetch** changes
  nothing the lab can see; whether to keep it is the owner's to decide.
- **Rules 233, jobs**: with the count kept, buildings 46.7 against 43.3, people 36.4 against 34.5 and deaths 0.1 against 0.5, all
  larger than chance; the first hall 18.3 against 22.1 inside the floor. **Rest** changes nothing the lab can see. With both
  parts removed together the same three are not distinguishable (buildings 46.7 against 45.9), and tools 77.1 against 81.8 and
  projects finished 93.3 against 99.8 lean the wrong way inside the floor: the two removals do not agree, so the benefit of the
  jobs part is one lab's finding, not a settled one.

Found on the way, not from these rules: `tests/household_home.test.ts` fails 19 of 51, equally at `cc0e656a` (rules 220) and
`652c3b77` (rules 228); cause not looked into.

## Step F: the ids of real things and of water knowledge no longer meet (rules 234, `src/sim/id_ranges.ts`)

Answers gap ledger G226 and G227 and AR-02 to AR-05 of `docs/ADVERSARIAL_REVIEW_20261113.md`.

- Water knowledge takes its ids from two thousand million upward, not from one million, which the id counter crosses in a large
  world within a lifetime (318,000 ids in 20 years at 30 to 50 people). The counter is refused that range.
- The record of who was told what is keyed by the pair "listener:belief", not by a product two pairs could share.
- For every save, whatever its rules: refused on loading if its id counter is not beyond the ids in use, or two things share an id.
- `scripts/generation_trace.ts`: the count labelled `householdsEver` is the households standing now; relabelled.

A world keeps the scheme it was made with. A world at 234 parts from the same world at 233 within days (measured, three worlds),
because some choices are hashed on a belief's id: a different draw, not a different rule. **The lab comparison of versions
(`scripts/lab_versions.ts`, the 12 seeds, 25 days, control and two nudges each, clean checkouts of `0444278f` and `cd465dae`;
`review_evidence/growth-20261113/id-ranges/`): nothing moved by more than a single draw moves it; no metric is larger than
chance (buildings 46.7 and 46.3, people 36.4 and 36.0, deaths 0.1 and 0.2).**

Checks: `tests/id_ranges.test.ts` (7); 92 tests in 12 files pass, among them golden, observer purity and the rules-229 and
rules-230 pins; pin `tests/v234_continuation.*` (Normal aspen, one day; clean checkout of `cd465dae`).

## Step E, measured: why no iron is made (13 November, no rule changed)

`scripts/supply_probe.ts --match "\biron\b|\bore\b|charcoal|smelt|forg|\bmine\b" --knows smithy`, aspen, birch, meadow
and river, five years each, rules 234, one run each; `review_evidence/growth-20261113/iron/`. Each grown person who knows of a
smithy, awake, every 300 ticks from the second year. **No iron was made and no ore mined in any of the four.**

- **The want is weak.** A step toward iron was among the options in 5,071 daylight looks and was the first choice 138 times
  (under 3 in 100). The step is worth 18 at the middle where ordinary work is worth 32, and is behind the first choice by 18
  to 21 at the middle: the same shape as planks and bricks before rules 229. The only want for iron is one person's wish to
  replace a worn tool (13 and a little, `production.ts demandsOf`); the smithy's charcoal has a standing want of 30 (rules 10)
  and is made (6 to 21 a world) and carried between kiln and smithy; ore and iron have none.
- **Few know the work, and not for want of knowers.** Of 20 to 50 grown people, 4 to 17 know charcoal firing, 1 to 8 smelting
  and 1 to 8 forging. The commonest refusals are of those who do not: "Burning charcoal: has not learned charcoal firing"
  1,257 to 3,518 times a world, "Forging an iron axe: has not learned iron forging" 451 to 798.
- **The mine has no pick.** "Working the ore mine: needs a pickaxe and has none (and none is on the rack)" 152 to 226 times a
  world, with 4 to 6 picks in people's packs; "does not know of a mine they may use" 330 times in river.
- **Packs.** "Get ore ...: no room in my pack for one ore" 93 to 303 times a world; "Forging an iron axe: needs a hammer and has
  none" 64 to 172 times in the two large worlds.
- 18 to 35 people a world hold a worn tool an iron one would replace.

## Step E, the repair: a standing smithy is a standing want for iron (rules 235, `src/sim/smithy_iron.ts`)

Four switched parts:

- **Want**: somebody who knows a smithy they may use, with fewer than two bars of iron lying at the smithies they know, wants
  the difference at 40: the charcoal want of rules 10 (30) and ten for the walk, an ore vein lying 24 to 46 tiles from the camp.
  A first dose. The ordinary planner mines, smelts, learns or tries from there.
- **Carry**: somebody who does not know smelting still brings the ore and the charcoal a batch lacks to the smithy, for whoever
  does. A first draft without this part made no iron in two worlds over five years: the want reached everybody, one to four
  of twenty knew smelting, and for the rest it ended at "has not learned iron smelting" about 2,000 times a world.
- **Count**: what lies at a workshop for the smithy's two standing wants is counted from the workshop's own record, not the
  glance of rules 169 (four charcoal at the smithy were one, so charcoal went on being made and fetched).
- **Room**: the left-over rule of rules 33 also applies to ore wanted for a workshop.

**Measured** (the same probe, the same four worlds, five years, rules 235, one run each: a description;
`review_evidence/growth-20261113/iron/`): **iron is made in all four: 8, 2, 6 and 4 bars, where there was none.** A step toward
iron is the first choice in 537 of 7,912 daylight looks at which one is offered (7 in 100; before, 3). Still refused, a world:
"has not learned iron smelting" 1,621 to 2,902 times, "has not learned iron forging" 595 to 1,266, "needs a pickaxe and has
none" 426 to 1,021, "no room in my pack for one ore" 124 to 743. Whether iron tools are forged from the bars was not counted.

Checks: `tests/smithy_iron.test.ts` (7). Lab arms: `rich-no-smithy-iron`, `-want`, `-carry`, `-count`, `-room`. Pin
`tests/v235_continuation.*` (Normal river, tick 48,500, somebody at work for the smithy's iron; clean checkout of `00f58a5c`).

**Paired lab** (clean checkout of `00f58a5c`, 12 seeds, Normal, fork 0, 25 days, arrivals on; control, two nudges and two
removals, 60 arms; `review_evidence/growth-20261113/iron/lab235/report.txt`): nothing moves by more than a single draw moves
it, with the whole rule removed or the count part alone (people 35.9 against 36.3, buildings 46.5 against 46.8, tools 78.2
against 81.7, none distinguishable). In 25 days only one world of six tried reaches iron work at all, so this lab says the rule
does no harm early; what it gives is the five-year measurement above, a description.

## Step G, measured: why few pair up and few are born (13 November, no rule changed)

`scripts/family_probe.ts` (new, read-only), aspen, birch, meadow, river, cedar and gen-5, six years each, rules 236, arrivals
on, one run each; `review_evidence/growth-20261113/families/`. Every 300 ticks each unattached grown person awake is taken
through the gates of a partner proposal in order (`options_social.ts optPropose`, `relations.ts spark`); every 200 ticks, as the
world itself checks, each woman of 17 to 44 is taken through the gates of conception (`lifecycle.ts conceptionTick`).

**What happened in six years**: 42 children born in the six worlds (11, 4, 8, 7, 6, 6) and 153 people arrived in the four that
had arrivals (birch and river had none). A settlement of 70 to 77 holds 20 to 24 women of 17 to 44, 12 to 19 of them with a
partner, and has six to eleven births in six years.

**A child** (65,988 checks of a woman of 17 to 44), where each stopped:

| share | gate |
|---|---|
| 28.8% | no partner |
| 23.8% | less than three food a head at home |
| 23.1% | may conceive (then one chance in two a year: 0.35 in a hundred at each check) |
| 8.6% | a birth in the last year and a half |
| 7.4% | already expecting |
| 3.5% | no home yet |
| 2.5% | three children at home already |
| 2.0% | partner not of the household |
| 0.3% | unwell or hungry |

So a woman may conceive for under a quarter of her childbearing years, and then at a child every two years.

**A partner** (24,182 looks at an unattached grown person awake), where each stopped: does not like any they could be a couple
with enough (affinity under 30) 39.9%; knows them too little (familiarity under 10) 31.6%; nobody they could be a couple with
(attraction, which half of all pairs lack by a fixed draw, and age within 18 years) 20.1%; trust 3.8%; none in sight 1.8%; too
hungry or thirsty to ask 0.1%. **A proposal was among the options at 45 of the 24,182 looks.** Couples do form (84 in the six
worlds), slowly: a newcomer arriving alone (61 of the 153) has to come to know and like somebody first.

Read in source, not yet measured: the food "at home" that conception asks for is the members' packs and the home's own store;
a household's cellar is another building and is not counted.

No rule is changed.

## Step G, the repair: the cellar counts toward the food before a child (rules 237, `src/sim/family_food.ts`)

**Measured first** (`scripts/family_probe.ts`, aspen, cedar, river and gen-5, four years each, rules 236;
`review_evidence/growth-20261113/families/cellar-food/`). Of the conception checks stopped at "less than three food a head at
home", 35, 39, 69 and 51 in a hundred held three a head once the household's other buildings were counted: 64,783 units in
cellars and 1,608 in lean-tos over the readings. `lifecycle.ts householdFoodPerHead` counted the members' packs and the store
of the home; a cellar is another building.

**Repair.** From rules 237 the count takes in every building the household owns (`foodInOtherStores`). Three a head and every
other gate are unchanged. One switched part, lab arm `rich-no-family-food`. Nothing is saved.

**Checks.** `tests/family_food.test.ts` 7 of 7 (the cellar counts; another household's cellar and a shared store do not; a
cellar with too little is still too little; a couple whose food is in the cellar conceives where at 236 it could not; the part
removed is rules 236); pin `tests/v237_continuation.*` (river, tick 9,500, where a couple is fed only by its cellar) recorded
from a clean checkout.

**What it did.**

- The gate, read with the world's own count, same four worlds and four years, rules 236 against rules 238 (one run each;
  `review_evidence/growth-20261113/families/gate238/`): checks stopped for food 22.5 -> 17.1 in a hundred; checks at which the
  woman may conceive 24.3 -> 30.9 in a hundred. About a quarter more of a woman's childbearing years are open, less than the
  first measurement promised: a household that now passes is still stopped when its cellar runs down.
- Births, six worlds, six years, rules 236 against 237, one run each: 42 -> 48 born, 49 -> 58 conceived. Leaning the right
  way and not distinguishable from chance: the worlds part within days (river received 22 newcomers in one run and none in
  the other).
- Lab, 12 worlds, 25 days (`review_evidence/growth-20261113/families/lab237/`): nothing moved by more than a single draw
  moves it, as expected in two years.

**Still true.** No partner is the first stop (28.8 in a hundred), and a proposal is offered at about one look in five hundred.
The pairing gates (liking, knowing, the fixed draw of who may be a couple) are a design choice and are the owner's.

## Step I, first finding: nobody could come in (rules 238, `src/sim/arrival_way.ts`)

**Found.** Twelve ordinary worlds were run for twenty years at rules 236 (`scripts/generation_trace.ts`, arrivals on). Birch,
gen-2, gen-3 and gen-6 received no newcomer in twenty years and stood at 35, 39, 38 and 40 people, with 10 to 14 born in all
that time. That is the "thirty people living forever" the owner described.

**Measured** (`scripts/arrivals_probe.ts`, new, read-only; `review_evidence/growth-20261113/arrivals/`). Just before each of the
world's own checks for travellers (`lifecycle.ts immigrationTick`) the gates were read in order, and every three days each
point along the map's four edges was tried on a copy of the world as the world tries it. In birch, gen-2, gen-3, gen-6 and
river, three years each: food, roofs and spacing passed at 88 to 94 in a hundred checks, and **no edge point gave a way in at
any of the twelve readings**. In aspen, which does get newcomers, 9 in a hundred edge points were open and three readings of
twelve had none.

**Cause.** Travellers come in "away from known wolf dens": an edge point is refused if a wolf is within 14 tiles, and a way in
if its path passes within 12 tiles of a den. Both tests read every animal in the world. Deer (hunting) and the founding pair of
sheep (livestock) came later and were counted as wolves, and the place each began as a den. The sheep stand beside the
settlement, so every path to it "passes a den". In birch over six days, by animal: sheep alone closed 29 in a hundred edge
points, sheep and wolf together 21, deer alone 13, a wolf alone 9, and 21 were not open ground; with wolves only counted, 44 in
a hundred would be open. (The first files in the evidence folder print "wolf" for any animal; `which-animals-birch-6days.txt`
names them.)

**Repair.** From rules 238 the two tests read wolves only (`barsTheWay`). One switched part, lab arm `rich-no-arrival-way`.
Nothing is saved. In birch the first travellers arrive at tick 5,012.

**Checks.** `tests/arrival_way.test.ts` 6 of 6 (a sheep or a deer beside the settlement kept every traveller out before and
does not now; a wolf's den still does; the part removed is rules 237); survival, growth_room, settlements, nourishment,
livestock and the pins of 236 and 237 pass; pin `tests/v238_continuation.*` (birch, tick 5,100) recorded from a clean checkout.

**Lab** (12 worlds, 25 days, arrivals on, at `2eb9a813`; `review_evidence/growth-20261113/arrivals/lab238/`). With the rule
removed, beyond chance: people 42.1 -> 35.0 (lower in 10 of 12 worlds), buildings 55.7 -> 47.2, solid homes 15.4 -> 13.0,
plots 29.4 -> 24.2, projects done 110 -> 92. So with the rule the settlement is a fifth larger after two years. What it costs,
also beyond chance: stored food a head is lower with the rule (3.9 against 5.4) and people are bitten by wolves more often
(10.7 against 6.3 bites in a world); deaths lean higher (1.1 against 0.2, inside the noise floor). More people sooner on the
same food is the thing to watch: see the famine below.

## Step I, second finding: the famine at 75 to 110 people (measured 13 November, not repaired)

**Found.** In the twenty-year runs at rules 236, six of the eight worlds that grow (aspen, gen-1, gen-4, gen-5, meadow, river)
lost a third to a half of their people inside two or three days, between years 9 and 18; cedar and fern had not by year 12.
gen-1 84 -> 42 (days 142 to 143), gen-4 93 -> 57 (106 to 107), river 88 -> 58 (167 to 168). Each is a lean season ending in
winter: wild food falls from about 400 units to about 40 in four days.

**Measured** (`scripts/famine_probe.ts`, new, read-only; river, gen-4 and gen-1 replayed at rules 236 to just before the crash
and read every 200 ticks through it; `review_evidence/growth-20261113/famine/`). Two things, and they are the same thing seen
twice: too little is put by, and none of it is common.

- gen-4 (92 people) went into its lean season with 601 units of food in packs and households, gen-1 (82) with 527: six and a
  half units a head, at about three and a half eaten a head a day. Two days. By the worst day gen-4 held 68 units and gen-1
  20, with 2 and 1 households holding three a head.
- River (82) went in with 766, and its food was not gone at the worst: see below.
- In the twenty-year runs the food stored stays at 2 to 8 units a head whatever the size of the settlement; the wild holds
  about 580 units whatever the size, so it feeds much of a settlement of 40 and little of one of 100; a lean season of three
  to five days comes every two or three years. About 24 cellars of 90 units stand mostly empty: room is not the limit.

River in detail:

- On the worst day (166.3) the settlement of 83 held 264 units in households' own buildings, 25 in packs and **none in any
  shared store**; shared stores held 0 to 3 units throughout.
- 27 of 35 households held nothing at all; 8 held three a head or more, the richest 27 to 41 a head.
- Of 874 readings of a starving person, 5 in a hundred had food in their own household's stores and 3 in a hundred in their
  pack. 78 in a hundred were out gathering, where there was nothing to find; 9 in a hundred were eating from a store; about
  1 in a hundred was asking anybody for food.
- All 23 who died of hunger: nothing in the pack, nothing in the household, no shared food within 20 tiles.

So a settlement of this size puts by two days of food, holds none of it in common, and has no working way for a household with
a full cellar to feed a neighbour with none.

**Why so little is put by** (the same probe reading the goods account by the day; gen-4, days 85 to 108, 84 to 93 people, 77
to 96 plots; `famine/flow-gen-4.txt`):

| a day | food made | of it the wild's regrowth | of it crops | eaten | spoiled in store |
|---|---|---|---|---|---|
| ordinary (twelve days) | 454 | 374 | 93 | 301 | 86 |
| winter (days 92 to 94) | 164 | 149 | 14 | 223 | 90 |
| lean season (days 101 to 105) | 78 | 52 | 18 | 217 | 46 |

- A settlement of ninety still lives off the wild: three quarters of its food is berries, fruit, wild grain and fish growing
  back, and its ninety plots give about one unit a plot a day. The wild grows back about 370 a day and no more, however many
  mouths there are; ninety people eat 300.
- What is stored goes off at about 90 units a day, a third of what is eaten, from a stock of about 600: stored food in a rich
  world spoils three times as fast (`hardship.ts SPOIL_STORE`), and most of what is stored is the wild's perishables. Grain
  keeps (0.22 of a berry's rate, and a fifth of that in a tended granary), but there is little grain and there are no
  granaries or two.
- So in winter and in a lean season the settlement is short 150 to 185 units a day against a stock of 600: three to four days.


**Not decided.** What to change is the owner's choice. The measurement points at three things, in this order: farming has to
carry a large settlement (more plots a head, or more from each, as the wild runs short); what is grown has to be kept (grain
in granaries, a granary for every so many people); and some of it has to be common, or reach the hungry. No rule is changed.

## Wolves can be fought (rules 239 and 240, on the owner's direction)

**Rules 239, a spear wounds and a wolf can be killed** (`src/sim/wolf_fight.ts`). Since rules 4 a won stand drove a wolf off
and never hurt it. Now it takes 50 of the wolf's 100 health (8 more for each of up to two people standing by); a wolf brought
to nothing dies and leaves a body of two meat and a hide, butchered as a deer's is; a wounded wolf mends five points a day;
two years after a kill another wolf comes in at a map edge, 25 tiles or more from any settlement. Nobody goes looking for
wolves. Saved: `world.wolfReturns`.

Measured (`scripts/wolf_probe.ts`, six worlds, four years, one run each; `review_evidence/growth-20261113/wolves/`): a world
has three wolves and one of them takes nearly all the stands. At a first setting of 34 mending ten a day, three wolves died in
24 world-years; at 50 mending five a day, four (aspen, birch, fern, meadow), and fern's came back. People were bitten 4 to 40
times a world in the four years. Lab, 12 worlds, 25 days: 0.8 wolves wounded and 0.1 killed a world, and nothing else moved
beyond a single draw (stands offered are fewer with the rule, 11.4 against 17.5, beyond chance: a wounded wolf keeps away).

**Rules 240, a wooden spear, and everybody grown wants one** (`src/sim/wooden_spear.ts`). A spear made by hand is two wood and
no stone (60 ticks of work for 85); every grown person without one wants one at 1.9, under the basket's 2.1; its wood trip
and its making are worth 8 more than another tool's, as the basket's are. Every place that read a hand tool's recipe now asks
`toolRecipe(world, kind)`.

Set from a measurement (`review_evidence/growth-20261113/wolves/arming/`): at rules 239 aspen had no spear until day 8; wanted
at 1.5 with no worth it had 3 among 21 grown people on day 8; at 2.3 it had 9 on day 1 and its baskets fell from 9 to 2; at
1.9 with the worth, aspen, birch and meadow had 7, 13 and 12 on day 8 with baskets and axes as before.

What it did (`review_evidence/growth-20261113/wolves/r240/` and `lab240/`):

- Six worlds, four years, one run each, rules 239 against 240: spears in the settlement 12 to 18 -> 28 to 38; wolves killed
  4 -> 6 (one in every world); bites 133 -> 120 in all (no difference to speak of); nobody killed by a wolf in either.
- Lab, 12 worlds, 25 days, with the rule removed: people holding a usable spear 22.5 -> 7.4, stands offered 30.1 -> 13.2,
  set out 13.0 -> 5.5 and tried 4.7 -> 2.3, all beyond chance; wolves wounded 2.0 -> 0.8 and killed 0.4 -> 0.1; people
  43.7 -> 41.7 and deaths 0.7 -> 1.5 lean the rule's way inside the noise floor; baskets, buildings, plots and bites do not
  move. So arming everybody makes more stands and more dead wolves and does not, in two years, make fewer bites.

**Rules 241, a wolf's skin is hung where everybody gathers** (`src/sim/wolf_skin.ts`). The hide cut from a wolf's body is kept
whole as a skin its cutter holds, not a hide in the pack; whoever killed the wolf values it at 46 and knows the wolf is dead
(found while testing: at 239 and 240 the killer ran from where it had been until they next looked about them); the holder
hangs it at the hall, or at the camp fire where they know no hall, three to a building, and keeps to the walk once begun; once
a day somebody within five tiles of a hung skin takes heart (a thought worth 2 and 1 for each further skin, and 6 of their
feeling of safety). It keeps no wolf away. Saved: `person.wolfSkins`, `building.wolfSkins`. The building inspector shows them.

The two worths were set from measurements, six worlds over four years, each of which killed one wolf
(`review_evidence/growth-20261113/wolves/skin-*`):

| the hide worth to the killer | hanging worth | skins cut | skins hung | what happened |
|---|---|---|---|---|
| 22 | 16 | 1 of 5 | 1 | the offer stood 3rd to 16th among the killer's options (work scores 25 to 55) and the body rotted in two days |
| 46 | 30 | 5 of 6 | 4 | birch's skin waited four and a half days and river's was unhung after six and a half; cedar's kill came half a day before the end |
| 46 | 48, kept to for 240 ticks | 3 of 3 re-run | 3 | birch, fern and meadow hung theirs 182, 263 and 234 ticks after cutting, all at the camp fire |

Pin `tests/v241_continuation.*` (fern, tick 17,400, a skin hung at the camp fire). The lab is running.

## Step H, first part: the full test suite (13 November, at `9c735b7b`, rules 235)

The first full run since rules 208, alone on the machine; `review_evidence/growth-20261113/full-suite/`. **624 of 641 files and
3,457 of 3,531 tests pass.** The 74 failures in 17 files:

- **64 fail the same at `cc0e656a`** (rules 220, before the growth stream), found by running the same 17 files there:
  `household_home` 19, `household_preparation` 10, `preservation` 10, `household_continuity_view` 8, `project_helpers` 7,
  `stored_materials` 5, and one each in `carcass_supply`, `project_inputs`, `transport`, `lab_report` and `lab_defaults`. Since
  when and why was not looked into; they are not from this stream.
- **6 are load**: `lab_defaults` (2), `lab_provenance`, `lab_report`, `zz_review_g_observer_purity` and
  `zz_review_main_toolreport_saves` time out in the full run and pass alone.
- **4 were stale tests, repaired**: `worldsize` (2) compared the limits with the ordinary ones by identity, which rules 225
  lifts; `livestock` required both of a forest's two sheep to have found water by tick 300, and from rules 226 one grazes
  elsewhere (why was not looked into); `iron_chain_stall` pinned itself to rules 211 after its world was made, so the world
  was laid down by the current rules, and rules 231, which acts when a world is made, changed its map. It now gives the pin
  when the world is made. None of the four is a change of behaviour.

Found on the way (`first-charcoal-by-rules.txt`, the measurement script beside that test, meadow, 60 days): no charcoal at rules
220, 226 or 228, and the first on days 2.6, 2.6, 3.6, 1.7 and 0.6 at rules 229, 231, 233, 234 and 235. The bench part of rules
229 is what lets a kiln's batch be begun.

## Step H, second part: where the engine's time goes (13 November, no code changed)

One ordinary world under Node's CPU profiler, alone on the machine: aspen, four years, 28 to about 60 people, rules 235, 524
seconds (`node --cpu-prof ... scripts/generation_trace.ts`; `review_evidence/growth-20261113/engine-profile/`). One run.

| share of all time | what |
|---|---|
| 34% | **seeing** (`perception.ts perceive`): 29% is the search of the grid for what is near, and 18% is writing each thing seen into the person's beliefs again (`knowledge.ts observe`, `snapshotEntity`, `seen_stock.ts glancedItems`) |
| 30% | **choosing** (`decision.ts generateOptions`): 19% in second looks at a job under way, 14% in fresh choices; the workshop options 10%, the work options 7% |
| 6% | **hand-over checks** (`work_handover.ts reviewHandovers`, `handover_state.ts personalHandovers`), run for every person |
| 5% | the time-window check on each work option (`action_scope.ts workWindow`) |
| 5% | needs (`needs.ts updateNeeds`, with `shelterAt`) |
| 2% | garbage collection |

So two thirds of the time is seeing and choosing. Three places where the same answer could be had for less, none of them a
rule: a thing seen again unchanged need not be written into the belief again; the hand-over check need not run for somebody
with nothing to hand over; and the second look, already cut by rules 227, still regenerates every option to compare one.
Nothing is changed here; each would be checked by the reference recordings staying identical.

## Step D, measured: how many people the water carries (13 November, no rule changed)

`scripts/water_probe.ts` (new, read-only), the 12 lab worlds, three years each, rules 233, arrivals on, one run each;
`review_evidence/growth-20261113/water/`.

Read in source first (`hydrology.ts`, `wells.ts`): natural water is a stock. A body holds 8 a deep tile and 2 a shallow one and
starts full; only rain puts water in, at most two units a tile a day in full rain; it evaporates, three times as fast in a dry
spell. **A well adds no water**: it draws one unit every 50 ticks from the nearest body within 14 tiles and holds 12.

Measured:

- A person draws 2.3 to 2.5 units a day, in every world.
- A settlement takes 56 to 99 parts in a hundred of its water from one body: 365 to 553 tiles, holding 1,804 to 2,690 when full.
- Rain could put 131 to 301 units a day into that body, and 21 to 33 evaporate. **At the measured draw the rain carries 42 to
  110 people, 64 at the middle** (sorted: 42, 46, 52, 59, 62, 62, 66, 73, 82, 91, 93, 110).
- With no rain a full body lasts a settlement of 30 about a month; at 110 people about nine days, fewer in a dry spell.
- A world has two or three such bodies, so a settlement that draws from all of them has two or three times that; the aspen
  ten-year run reached 123 people (rules 227) where its own body carries 59.

This is the ceiling under every settlement: gen-5, whose body carries 82, reached 112 at rules 226 and died of thirst in three
days. Food, housing and stone do not move it. What to change is the owner's to choose.

## Step D, the repair: a well reaches groundwater (rules 236, `src/sim/groundwater.ts`)

The owner's choice of 13 November, of the two put to them (wells with their own groundwater, or more rain in the lakes).

Three switched parts:

- **Ground**: a well draws from the ground beneath it, not from the lake. The ground at a well holds up to 240 units and takes
  the rain of 100 tiles of land at the rate a tile of lake takes it; rain measured at 0.29 to 0.60 units a tile a day gives a
  well 29 to 60 a day against the 48 it can raise: about 12 to 20 people a well. It does not evaporate; in a dry spell nothing
  comes in. A new well finds 120. The lake is as it was.
- **Anywhere**: a well may be dug away from any lake, and wells may stand 6 tiles apart, not 14.
- **More**: somebody with no well known within 10 tiles of home wants one there, lake or no lake; and where the wells near home
  were all empty when they last looked, they want another.

**Measured** (`scripts/water_probe.ts`, six worlds that grow, eight years each, rules 235 against 236, one run each: a
description; `review_evidence/growth-20261113/water/eight-years/`):

| world | rules 235: people at year 8, deaths of thirst, the lake's lowest | rules 236: people, deaths of thirst, wells, the lake's lowest |
|---|---|---|
| gen-4 | 0 (it reached 75), 73, empty | 90, 1, 16, 74 in 100 |
| gen-5 | 100, 1, 6 in 100 | 85, 0, 10, 84 |
| aspen | 90, 2, 42 | 100, 0, 10, 82 |
| meadow | 78, 0, 60 | 88, 0, 13, 81 |
| cedar | 89, 0, 78 | 89, 0, 11, 81 |
| fern | 69, 0, 52 | 76, 1, 10, 91 |

At rules 236 a settlement digs 10 to 16 wells (3 to 5 before, drawing from the lake), raises 107 to 135 units a day from the
ground and draws 6 to 13 from the lake (70 to 114 before). The ground at the wells held 962 to 3,744 units at the end, so the
wells were not the limit in these eight years.

Checks: `tests/groundwater.test.ts` (7); wells, stored water, golden, save and id tests pass (67 tests in 6 files). Lab arms:
`rich-no-groundwater`, `-ground`, `-anywhere`, `-more`. Pin `tests/v236_continuation.*` (Normal river, tick 3,300, two wells on
their own groundwater; clean checkout of `ad3bac1a`).

**Paired lab** (clean checkout of `ad3bac1a`, 12 seeds, Normal, fork 0, 25 days, arrivals on; control, two nudges and four
removals, 84 arms; `review_evidence/growth-20261113/water/lab236/report.txt`). Wells are now dug in the first days (river: tick
900), so this lab is the check on what that costs early. With the rule against without it: people 36.1 against 36.2, deaths 0.2
against 0.1, hunger, tools, projects finished, food in store and family time not distinguishable. Buildings 48.6 against 47.1
(the wells themselves) and workplaces 5.1 against 5.8 lean inside the noise floor: a little building effort goes to wells
before workshops. The share of time people are thirsty is lower with the rule in 10 of 12 seeds, by less than the report
prints. No part alone shows more. What the rule gives is the eight-year measurement above, a description.

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

**Result (paired lab, clean checkout of `44c6dae1`, 12 seeds, Normal, fork 0, 25 days, arrivals on; control, two nudges and
four removals, 84 arms; `review_evidence/growth-20261113/lab227/report.txt`). Figures are with the rule against without it.**

- **Hold works, beyond chance, and costs nothing the lab can see.** Field plots 26.4 against 18.8, tools in hand 74.4 against
  56.2, projects finished 87.2 against 68.7, building condition 63.3 against 55.1, food put by 990 against 858 units, food in
  store a person 5.3 against 3.2, fire feeds 110 against 82, all larger than chance and in 10 to 12 of 12 seeds. People, deaths,
  mood and time under the hungry line are not distinguishable; mean hunger leans better fed (65.9 against 63.6, inside the floor).
- **Asleep changes nothing**: no metric moves by more than a single draw, and three seeds end identical to the control. It is
  a saving of work with no effect on what people do.
- **Quiet costs family time and buys nothing measurable**: family time 94.4 against 120.2 (larger than chance, 12 of 12 seeds);
  chats, child play, people, deaths and everything else are not distinguishable. Whether to keep it, or to let family time
  through, is the owner's decision.
- **All three together**: buildings 42.6 against 38.2, plots 26.4 against 20.5, tools 74.4 against 54.7, projects finished 87.2
  against 65.8, the first timber yard on day 10.5 against 13.6, food in store a person 5.3 against 2.6, mean hunger 65.9 against
  62.2, chats 155 against 127, all larger than chance; family time 94.4 against 118.2, larger than chance the other way. People
  35.1 against 34.8 and deaths 0.4 against 0.7 are not distinguishable. The worry that held workers would go hungrier is not
  borne out: children are under the hungry line a little less with the rule.

## A child may ask, and the grown person decides (rules 228, `src/sim/parent_decides.ts`)

The owner's instruction after the rules-227 lab (its quiet part cost a fifth of family time for nothing): let children ask, but
the parent must make a real decision. Children always want time; work is usually important; the parent should be able to choose.
Before this there was no decision: a grown person asked for family time said yes unless somebody needed food, water, rest or
warmth, and put down whatever they were doing.

Two switched parts:

- **Ask**: a child may ask a grown relative seen at work for family time. Chats and games still wait, as rules 227 has it.
- **Weigh**: a grown person asked with a job in hand weighs the job, at what it was worth to them when they chose it, against the
  child: 20, plus up to 10 for a sociable and 6 for a generous person, plus 4 for each day since the two last had family time, to
  at most three. If the job counts for more they say "not now" and go back to it; the child may ask again after a quarter of a
  day. With nothing in hand, or resting, there is nothing to weigh and they say yes.

The numbers come from a measurement (one ordinary world, six days, rules 227): the jobs grown people do are worth 22 at the tenth
part, 32 at the middle and 44 at the ninetieth; building and carrying to a site about 40, gathering 31, making by hand 25. So a
parent of middling nature a day after their last time together weighs the child at 32, the middle of their work; three days on
at 40, above all but building.

Ordinary worlds (aspen, birch, river, eight days, one run each: a description): family-time asks answered 97 at rules 227 and
151 at rules 228; completed 84 and 103; answered "not now" for work 0 and 32.

Checks: `tests/parent_decides.test.ts` (7); 135 tests in 20 related files pass; pin `tests/v228_continuation.*` (Normal aspen,
arrivals on, one day, by when a grown person has said "not now" for a job in hand; clean checkout of `e98d298b`). Lab arms:
`rich-no-parent-decides`, `-ask`, `-weigh`.

**Result (paired lab, clean checkout of `e98d298b`, 12 seeds, Normal, fork 0, 25 days, arrivals on; control, two nudges and
three removals, 72 arms; `review_evidence/growth-20261113/lab228/report.txt`). Figures are with the rule against without it.**

- **Family time comes back, beyond chance, and the work is not hurt.** Family time 127.8 a settlement against 89.1, larger
  than chance, in 12 of 12 seeds. Buildings 42.6 against 42.2, tools 74.3 against 74.0, projects finished 86.4 against 88.4,
  food put by, hunger, chats and child play are not distinguishable. People 36.0 against 34.9 and deaths 0.1 against 0.6 lean
  the right way inside the noise floor.
- **Ask** is where the family time comes from: 127.8 against 95.7 without it, larger than chance.
- **Weigh** costs no family time and its effect on work is too small to see in 25 days: with it family time is 127.8 against
  117.1 (leaning higher, inside the floor; a child told "not now" asks again), and nothing on work is distinguishable. It is
  kept because it makes the answer a decision; the lab does not show it earning or costing anything.

## Everything found that needs attention (13 November 2026)

Gathered from the 20-year runs at rules 220, 225 and 226, the job, site and supply probes, and the source read on the way. Each
line says how it is known: measured, read in source, or not looked into.

**What stops growth, in the order it bites**

1. **No bricks and almost no planks are made**, so no smithy, house, hall or granary is finished and ore is never used
   (measured; step 5). **Repaired at rules 229**: the cause was the glance of rules 169 read at the bench; smithies, halls and
   houses are now finished. Left open by it: no iron is made (smelting and forging not learned); the worth part costs upkeep;
   no granary was laid out in four worlds; and a house or a storehouse is still emptied one unit a trip, because the glance
   remembers one of each kind (read in source, not measured).
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

12. Jobs dropped half-way: repaired by rules 227; the lab finds the hold part beneficial beyond chance and the sleep part
    neutral. Its quiet part cost a fifth of family time for no measured gain; rules 228 lets a child ask and has the grown person
    decide, and its lab finds family time back (127.8 against 89.1, beyond chance) with nothing lost on work.
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

21. Rules 225 and 226 are current rules with no paired lab verdict (their parts are not separated, and the factor of two in
    226 is a first dose). Rules 227 has one.
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
