# Plan: a childhood of play and being shown, and more to do for everyone (draft, 11 November 2026)

Drafted for the owner. The owner approved the order and phase 0 on 11 November 2026 ("Yes, start probe"); phase 0 is done and its result is section 6. No rule
has changed. The five decisions of section 5 are still the owner's. The owner's idea, in chat on 11 November 2026: children should not work before they are older;
they should play with each other, by themselves, with toys, sticks and bugs; they should learn basic skills from each other or by being shown by an adult, so
that they do not overdevelop before they are old enough to do tasks; and that needs many more things to do, for them and for everyone.

## 1. What is true today (from the code and from this week's measurements)

- **Ages.** Under 12 is a child, 12 to 15 a youth, 16 an adult, 62 an elder (`constants.ts`). There is no younger band: a four-year-old and an eleven-year-old
  have the same rules.
- **What a child may do.** Pick berries, fruit and grain, fish, fetch water, carry food home, eat, warn, ask for food. Not allowed: building, hauling, laying
  out, repairing, crafting, farming, fuelling a fire, operating a workshop, defending (`decision.ts CHILD_FORBIDDEN`), chopping wood or breaking stone
  (`child_tasks.ts`, rules 156).
- **Childhood time** (`childhood.ts`, rules 120): exactly three kinds, each at most once a day for the child who asks: family time with kin (120 ticks), a
  guessing game with another child (120 ticks), foraging practice with a grown-up (160 ticks). Each gives a mood lift of 4 for half a day and 12 social.
- **How skill grows.** Every unit gathered adds 0.004 to that skill, at any age, with no ceiling but the world's (`act_resource.ts`). A foraging lesson adds
  0.025, capped at the teacher's level, and is refused when the teacher does not out-forage the child ("I cannot teach you more about foraging yet").
  Nobody remembers that refusal, so the same asks repeat.
- **What that produces.** Lived as Mona, nine, at rules 202: she was her household's most active forager, six grown-ups were asked for a lesson, four stopped,
  and all four could not teach her because she already foraged as well as they did. Children spend 24 percent of their recorded time on company and play
  against adults' 11 percent, so play is not absent; the trouble is that their work is unlimited and their play has one game.
- **Spare time for everyone** (`leisure.ts`, rules 28): a walk to one of up to four places a person knows (their door, the square, the water's edge, the trees),
  worth about 6 against work at 20 to 45. Nothing happens at the place. Chosen 154 times in 7,223 offers per settlement in 25 days.
- **Gatherings**: funeral, birth feast, wedding, harvest feast, market, a midwinter tradition (`occasions.ts`, `traditions.ts`), about seven a settlement in 25
  days, and shared meals at 2.0 after rules 200. Elders already "still tell how" old events in passing conversation (`traditions.ts pickStory`).
- **Pieces that exist and can be built on**: learning by watching and by helping (`watch_learning.ts`, `helper_learning.ts`), companionship records, the craft
  and gift machinery, the chronicle, haunts.

## 2. The design in one page

**Three ages of childhood instead of one.**

| age | may do | learns by |
|---|---|---|
| little one, under 7 | play, be carried food, stay near kin; no work of any kind | being shown, watching |
| child, 7 to 11 | play first; *helping* at tasks they have been shown, a bounded amount a day (about one small pack-load or two hours), always food and water, never heavy work | being shown by an adult or by an older child who has been shown; a little by doing |
| youth, 12 to 15 | as now | as now |

**Being shown is how a skill starts.** A child may only help at a task somebody has shown them (a record per task: berries, fruit, grain, fishing, water). The
showing is the existing lesson, opened up: an adult, or a child of 7 to 11 who already holds that task, may show a younger one. What a child gains by doing is
scaled by age (a seven-year-old's practice counts for about half), so children arrive at twelve able but not masters. A pupil remembers, for a few days, who
has told them "I have nothing more to show you", and stops asking them.

**Play becomes many things.** Each is an ordinary activity a viewer can see and name, at a place, with a mood lift, and where it makes sense a small seed of a
basic skill. None needs a new item in its first version.

| play | who | where | what it seeds |
|---|---|---|---|
| a guessing game (exists) | two children | anywhere | company |
| chase | two to four children | open ground near home | stamina, friendship |
| hide and seek | two to four children | among trees or buildings they know | knowing the place |
| skipping stones | one or two | the water's edge | fishing, a little |
| watching bugs and poking about | one | bushes, the trees | foraging, a little |
| building with sticks | one or two | near home | building, a little |
| playing house | two or three | at their own lean-to or hut | company |
| follow and watch | one child and a working adult | wherever the adult works | the adult's task, as a showing |

A child is offered several kinds a day (the once-a-day limit stays per kind), other children are drawn in by seeing a game under way, and danger, hunger,
cold and night end play as they end anything.

**Toys are real things.** An adult with a knife and a little wood, or a child with sticks and fibre, makes a toy (a stick doll, a ball, a carved animal): a
small owned object, made through the ordinary craft step, given through the ordinary gift, kept in a pack, passed on with a household's goods. A child with a
toy has one more thing to do alone and something to share; a toy given is remembered between giver and child.

**More to do for everyone.**

| thing | who | built on |
|---|---|---|
| the evening fire | anyone fed and not needed elsewhere, from dusk | the fire as a haunt; sitting together is company, and talk starts more easily there |
| a story told | an elder or anyone who was there, to those at the fire, children first | `pickStory`, the chronicle; the teller is thanked, the listeners carry the story |
| watching the children | parents and kin near a game | a small lift for the watcher; no new activity |
| a throwing game at the square | two to four adults or youths | a turn-taking session like the guessing game |
| a race or a wrestle at a feast | those attending | occasions; the winner goes in the chronicle and is remembered |
| a swim or a wash on a warm day | anyone | the water's edge as a haunt |
| song at the fire or a meal | anyone, more with a flute or drum somebody made | later: one made instrument, like a toy |

## 3. What it costs, said plainly

- **Food.** If under-twelves stop providing, adults must. At the old drain rates that would have starved households; rules 195 gave adults slack, but how much
  children bring in has never been measured. It is step 0 below, and the cut is phased: first cap and "shown first", then measure, then little ones stop.
- **Adult time.** Showing, watching and story-telling take adult hours. The lab's work share, tools, homes and deaths are the guard.
- **Save format.** Toys, the "shown" record and the age-scaled practice are new saved fields on a person or the world. Each is small and optional, but each
  needs the save and load checked and a line in the save notes.
- **Not everything is a mechanic.** Watching the children and the swim are mood and place, not systems; they are cheap and they are where the plan should not
  grow.

## 4. Build order

Each phase is one rules version of separately switched parts, with contract tests, a pin, and one lab compared with the lab before it (the procedure the owner
set: no twin, no second baseline, the suite once at the end of the stream). A new stream, **childhood**, claims its range in `docs/RULES_RANGES.md` before the first line (above the carrying stream's 205 to 209, so 210 to 219; the numbers in the table below were drafted before that claim and each moves up by five).

| phase | rules | what | why this order | measured by |
|---|---|---|---|---|
| 0 | none | a probe of a child's day at rules 203: hours by activity and age, the share of a household's food its children bring in, skill by age at day 25 | nothing below is safe to size without it | the probe itself |
| 1 | 205 | the pupil remembers who cannot teach her; an older child may show a younger one; lessons in fishing, grain and water beside foraging | small, stands alone, fixes what Mona hit | lessons completed, repeated refusals, skills by age |
| 2 | 206 | play: chase, hide and seek, skipping stones, bugs, sticks, playing house; children drawn to a game under way | content before restriction, so the time freed later has somewhere to go | distinct plays per child per day, child play time, child mood |
| 3 | 207 | the three ages: little ones do no work; 7 to 11 help only at shown tasks, a bounded amount; practice scaled by age | the big change, made once play and showing exist | child and adult hunger exposure and deaths, household food, child forage skill against adults, adult work share |
| 4 | 208 | toys: made, given, owned, played with, passed on | first new object; needs the save checked | toys made and given, solo play, gifts remembered |
| 5 | 209 | the evening fire and a story told | the first thing for adults and elders; uses what exists | evening company, chats (which fell at 202), elders' time in company, stories carried |
| 6 | 210 | a throwing game at the square; a race or wrestle at a feast; the swim | variety for adults and youths | adult life share, occasions' attendance, chronicle entries |

Phases 1 and 2 are independent of each other and of the food question, so they can go first in either order. Phase 3 does not start until phase 0's numbers
and phases 1 and 2 are in. Each phase is about fifteen to forty-five minutes of machine time and one working session; the stream ends with one full suite and
one page that puts every measure beside the rules-203 baseline.

What the viewer sees, phase by phase: children running in a knot near the huts, a child at the water alone throwing stones, a girl showing a smaller boy
which bush is ripe, a carved animal in a pack and the name of who gave it, a ring of people at the fire after dark and an elder's line in the feed.

## 5. Decisions the owner should make before phase 3

1. **The bands.** Proposed: little ones under 7, children 7 to 11. (Under 8 and 8 to 11 is the other sensible split.)
2. **Helping at all?** Proposed: yes for 7 to 11, bounded and shown-first. The stricter reading of the idea, no gathering at all under 12, is one switch away
   and the lab can run both.
3. **Who feeds a little one.** The care system already carries food to dependants; proposed: no change, measured in phase 3.
4. **Toys as objects.** Proposed: yes, in phase 4, because a thing that can be made, given, kept and inherited is worth more to watch than a mood number.
5. **Order.** Proposed: 0, 1, 2, 3, 4, 5, 6. Phase 5 (the evening fire) can be pulled forward if the fall in chats is the more urgent thing.

## 6. Phase 0 result: what a child's day is at rules 203

A measurement, not a rule: `scripts/childhood_probe.ts`, twelve ordinary worlds (the lab's seeds, Normal, arrivals on, 25 days, rules 203), run from `d54091cf`
with no tracked change, twelve processes in 3 minutes 38 seconds. Every tick each living person's activity is counted under their age; food units are read from
each person's own gathered counter. Evidence: `review_evidence/childhood-20261111/` (`report.txt`, one JSON per seed, `run.txt`). A year is twelve days, so a
child ages two years inside a run. A settlement has about 5 under-sevens, 3 to 4 children of 7 to 11, 1 youth, 17 to 20 adults and 2 elders.

**The day, in hours of 24.**

| age | sleep and rest | own needs | food and water work | other work | company and play |
|---|---|---|---|---|---|
| under 7 | 10.6 | 3.0 | 4.6 | 0.3 | 5.4 |
| 7 to 11 | 10.8 | 2.9 | 4.1 | 0.5 | 5.5 |
| 12 to 15 | 10.0 | 3.0 | 3.9 | 4.3 | 2.7 |
| adult | 9.8 | 3.0 | 3.5 | 4.9 | 2.8 |
| elder | 10.1 | 3.3 | 3.6 | 4.0 | 2.9 |

Inside those figures, for an under-seven: gathering food 4.6 hours, a foraging lesson 0.9, a game 0.7, family time 0.7, walking up to someone to talk 1.3, asking
for things 0.6, being warned or warning 0.6, a spare-time walk 0.3. "Rest" is 6.2 of a child's 10.6 hours and 3.6 of an adult's 9.8; it includes waiting in
shelter until it is light.

**Food.**

| age | units a person-day | share of all food taken | awake time hungry | awake time critical |
|---|---|---|---|---|
| under 7 | 2.85 | 12.4% | 47% | 1.5% |
| 7 to 11 | 3.75 | 14.0% | 42% | 0.6% |
| 12 to 15 | 3.39 | 2.2% | 55% | 3.0% |
| adult | 3.79 | 65.6% | 59% | 1.9% |
| elder | 3.37 | 5.8% | 67% | 3.9% |

Under-twelves are 29 percent of the people and take 26 percent of the food: by head count they nearly feed themselves. In the 76 households that had an
under-twelve, the under-twelves took 38 percent of the household's food (the median household 39 percent; 18 households at half or more, 59 at a quarter or
more, none at nothing). Children take wild plants and a little fish; every harvested unit is a grown person's. Units eaten at the bush are counted as taken, and a
unit of fish is not a unit of berries, so these are shares of units, not of nourishment.

**Skill at day 25.**

| age | people | foraging | fishing | farming |
|---|---|---|---|---|
| under 7 | 57 | 0.65 | 0.32 | 0.29 |
| 7 to 11 | 51 | 1.08 | 0.56 | 0.51 |
| 12 to 15 | 13 | 1.22 | 0.76 | 0.74 |
| adult | 235 | 1.10 | 0.93 | 0.93 |
| elder | 19 | 1.22 | 0.96 | 0.97 |

The under-twelves alive at the end foraged at 0.41 when first seen and 0.86 at the end, having taken 70 units each. A child of 7 to 11 forages as well as an
adult. Fishing and farming are where a child still has something to learn.

**Childhood time, a settlement in 25 days.**

| kind | asked | completed | the main refusal |
|---|---|---|---|
| family time | 76 | 66 (87%) | the other had already had it today, 7% |
| a game | 64 | 40 (62%) | the other child had already had their game today, 36% |
| foraging practice | 118 | 77 (65%) | "I cannot teach you more about foraging yet", 28% |

A child completes a game on 0.18 of their days, family time on 0.30 and a lesson on 0.35. On average two thirds of the grown people alive could still teach a
given child foraging; 14 of 108 children forage as well as or better than the best grown person in their own household, and one has nobody left to learn from.

**What this means for the plan.** These are readings of the measurement, not results of a change.

1. **The owner's worry is confirmed.** Children do more food work than adults (4.1 to 4.6 hours against 3.5), a child of 7 to 11 takes as much food as an adult,
   and by eleven they forage as well as their parents.
2. **Stopping it is not free.** If under-sevens stop gathering, 12 percent of the food taken has to come from everyone else, who would each take about 14 percent
   more. If every under-twelve stops, it is 26 percent, and each person of twelve and over would take about 36 percent more, about an hour and a quarter more food
   work a day for adults who are already hungry for 59 percent of their waking time. The strict reading of the idea (no gathering at all under twelve) is the
   expensive one. Phase 3 as drafted (little ones stop, 7 to 11 help a bounded amount) removes somewhere between 12 and 19 percent, depending on the bound.
3. **Phase 2 has to carry four and a half hours.** That is what an under-seven's food work is today, against 0.7 of an hour of games. The once-a-day limit on the
   child who is asked refuses a third of all games; the new kinds of play should not inherit it.
4. **Phase 1 should teach fishing and farming, not more foraging.** Foraging is saturated by the age of seven to eleven, which is why 28 percent of lessons are
   refused. Fishing and farming are at half the adult level.
5. **There are idle hours to fill.** A child spends six hours a day at rest, awake, and an adult three and a half. Rest includes waiting in shelter until it is
   light; the probe does not split it by hour. If most of it is that wait, it is the time the evening fire and a story told (phase 5) would fill, at no cost in
   food work. Phase 5's own measurement should split rest by time of day first.
