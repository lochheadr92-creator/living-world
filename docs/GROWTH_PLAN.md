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

**Result: not measured yet.** The 20-year runs were started on 13 November (12 worlds at rules 225).

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

**Result: not measured yet.** The 20-year runs were started on 13 November (12 worlds at rules 226, beside the 12 at 225 and the
12 at rules 220 already recorded in `review_evidence/generation-20261113/`).

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

## Not done, and known

- The full suite has not been run since the rules-208 head. With these two commits 119 related tests and the pins of rules 216,
  220, 225 and 226 pass, and typecheck passes.
- More people use ids faster: the counter stood at about 268,000 after 20 years of 41 people and breaks at 1,000,000. Step 6.
- `PRODUCT_VISION.md` still describes a world of about 100 people. It is the owner's to change.
