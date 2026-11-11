# Plan: a childhood of play and being shown, and more to do for everyone (draft, 11 November 2026)

Drafted for the owner. The owner approved the order and phase 0 on 11 November 2026 ("Yes, start probe"); phase 0 is done and its result is section 6. No rule
has changed. The five decisions of section 5 were taken at their proposed defaults on the owner's instruction of the same day (section 5). The owner's idea, in chat on 11 November 2026: children should not work before they are older;
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

**Decided, 11 November 2026.** The owner's instruction in chat: "apply default decisions". Each of the five below is taken as proposed:

1. The bands are little ones under 7 and children 7 to 11.
2. Children of 7 to 11 may help, a bounded amount, and only at tasks they have been shown. The stricter reading (no gathering at all under 12) is not taken;
   phase 0 measured its cost at 36 percent more food work for everyone of twelve and over.
3. Who feeds a little one is not changed; it is measured in phase 3.
4. Toys are real objects, in phase 4.
5. The order is phases 0, 1, 2, 3, 4, 5, 6. Phase 0 is done.

These are decisions about the plan, not work done: no phase after 0 is started, and each phase still lands as its own rules version with its tests, pin and
lab. Related and already landed: rules 208 exempts under-twelves from the ration rule of the carrying stream (`docs/CARRYING.md`), which had them carrying
food home more than twice as often.

The proposals as they were put:

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

## 7. Phase 1 result: being shown (rules 210)

Landed on the owner's instruction of 11 November 2026 ("Do 1 then 2"). `src/sim/shown.ts`, three separately switched parts; the childhood stream claims rules
210 to 219 (`docs/RULES_RANGES.md`).

| part | what changes | lab removal |
|---|---|---|
| remember | A child told "I cannot teach you more about foraging yet" does not ask that person for practice again for three days. | `rich-no-shown-remember` |
| older | A child of seven or more, at least a year older than the asker, may be asked and may give practice on a grown person's terms. Whether they know more is found out by asking. Giving it does not use up their own turn. | `rich-no-shown-older` |
| more | A teacher who cannot teach more foraging shows fishing, then farming, where they know more: the same paid time and the same gain. Where foraging can still be taught nothing changes. | `rich-no-shown-more` |

`rich-no-shown` removes all three and equals rules 208. Contract tests `tests/shown.test.ts` (13, each with the rules-208 contrast). One case in
`tests/childhood.test.ts` is pinned to rules 208 with a comment (it stages a grown person who forages worse than the child and expects a refusal). Immutable pin
`tests/v210_continuation.*` (Normal gen-2, arrivals on; a practice of rules 210 in the world by tick 2,400; then 120 ticks after a save and load), recorded from
a clean checkout of `d70e02c4`.

Lab: clean checkout of `d70e02c4` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, `nudge:1`, `nudge:2` and the four removal arms, 84
arms in 24 minutes 45 seconds. Compared with the rules-208 lab already recorded. Evidence: `review_evidence/childhood-20261111/r210/`, `versions-208-210.txt`,
`run210.txt`.

| measure, a settlement in 25 days | 210 | all removed | remember removed | older removed | more removed |
|---|---|---|---|---|---|
| practices refused "I cannot teach you more" | 5.2 | 34.5, larger than chance | 6.9 | 5.8 | 30.8, larger than chance |
| fishing practices completed | 18.5 | 0, larger than chance | 17.7 | 20.3 | 0, larger than chance |
| farming practices completed | 3.6 | 0, larger than chance | 2.8 | 3.1 | 0, larger than chance |
| foraging practices completed | 74.3 | 80.3 | 74.1 | 71.3 | 82.1 |
| practices given by a child | 9.8 | 0, larger than chance | 8.1 | 0, larger than chance | 9.0 |
| under-twelves' fishing skill at day 25 | 0.486 | 0.456 | 0.485 | 0.511 | 0.447 |
| child play (games) | 66.5 | 74.8, larger than chance | 66.9 | 68.9 | 69.6 |

Rules 208 against 210 on the three shared arms (`scripts/lab_versions.ts`): nothing moved by more than a single draw moves it. Practices asked fall from 121.7
to 110.6 inside the noise floor; people, deaths, tools, projects, hunger, mood and chats are not distinguishable from chance.

What that supports:

- **The refusal is nearly gone.** From about 35 a settlement to about 5, beyond chance, and it is the `more` part that does it: a teacher who cannot teach
  foraging shows something else.
- **Children are taught fishing and farming.** About 18 fishing and 4 farming practices a settlement, where there were none; practices completed rise from
  about 80 to about 96. Children's fishing skill at day 25 leans up (0.486 against 0.456) and is not distinguishable in 25 days.
- **An older child does teach a younger.** About 10 practices a settlement are given by an under-twelve.
- **`remember` shows little by itself** (refusals 5.2 against 6.9 without it): once a teacher has something else to show, there are few refusals left to
  remember. It is kept as harmless.
- **The cost is play.** With all three parts removed child play is 74.8 against 66.5, beyond chance: the extra practices take time that games had. That is the
  thing phase 2 (rules 211, more ways to play) is for, and it is the first measure phase 2 is read against.

## 8. Phase 2 result: more ways to play (rules 211)

`src/sim/play.ts`, two separately switched parts.

| part | what changes | lab removal |
|---|---|---|
| games | Chase, hide and seek and playing house join the guessing game between two children. Each has its own once-a-day limit for each child; the asker proposes a game they have not played today, and the one asked declines only if they have played that game. A child waits an eighth of a day between games. | `rich-no-play-games` |
| solo | Skipping stones at the water's edge, watching bugs among bushes or trees, building with sticks near home: each once a day for a child with nothing pressing, with a small lift of mood and a seed of fishing, foraging or building skill (0.003). A finished play counts as having been at that place. | `rich-no-play-solo` |

`rich-no-play` removes both and equals rules 210. Contract tests `tests/play.test.ts` (10, each with the rules-210 contrast). Two cases in
`tests/childhood.test.ts` are pinned to rules 210 with comments. Immutable pin `tests/v211_continuation.*` (Normal gen-2, arrivals on; a play of rules 211 in
the world by tick 400; then 120 ticks after a save and load), recorded from a clean checkout of `eaa44e5d`. Not in this version: a game joined by a third or
fourth child, children drawn to a game they can see, toys, and anything for grown people. No work is taken from children.

Lab: clean checkout of `eaa44e5d` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, `nudge:1`, `nudge:2` and the three removal arms, 72
arms in 20 minutes 42 seconds. Compared with the rules-210 lab already recorded. Evidence: `review_evidence/childhood-20261111/r211/`, `versions-210-211.txt`,
`run211.txt`.

| measure, a settlement in 25 days | 210 | 211 | both removed | games removed | solo removed |
|---|---|---|---|---|---|
| games asked for (child play) | 66.5 | 104.3, larger than chance (higher in 12 of 12 seeds) | 68.2 | 65.3 | 104.5 |
| games finished, all kinds | | 83.6 | 38.4 | 37.8 | 83.7 |
| of them the guessing game / chase / hide and seek / playing house | | 21.2 / 20.8 / 20.6 / 20.9 | 38.4 / 0 / 0 / 0 | 37.8 / 0 / 0 / 0 | 21.0 / 20.4 / 22.5 / 19.8 |
| games refused, "I have already had that time today" | | 18.5 | 28.4, larger than chance | 26.0 | 18.0 |
| plays alone finished: stones / bugs / sticks | | 6.3 / 6.9 / 6.2 | 0 / 0 / 0 | 7.5 / 8.3 / 8.6 | 0 / 0 / 0 |
| spare-time outings | 18.4 | 9.1, larger than chance (fewer) | 17.0 | 12.1 | 11.8 |
| share of waking time hungry | 0.57 | 0.58, systematic, within the noise floor (higher in 12 of 12) | 0.56 | 0.57 | 0.58 |
| mean mood | -10.8 | -13.4, systematic, within the noise floor | -10.3 | -7.8 | -12.8 |
| family time | 76.4 | 72.2, systematic, within the noise floor | 78.3 | 78.2 | 72.9 |
| people, deaths (2.3 and 2.7), deaths from hunger (0.5 and 0.9), tools, projects done, buildings, chats | | | | | not distinguishable from chance |

What that supports:

- **Games more than double.** About 84 games finished a settlement against 38, in four kinds played about equally, and a third fewer refusals for having
  already played. All beyond chance, all from the games part. The 8 games that the practices of phase 1 cost are recovered several times over.
- **Play alone happens, a little.** About 19 a settlement in 25 days, a few a day across all the children: a child who is fed and has nothing pressing is
  rare while children still gather a quarter of the food. It will matter more when phase 3 frees their time.
- **Fewer spare-time walks,** because a child with a free moment now plays; a play alone is counted as play, not as a walk.
- **The cost leans the expected way and stays small.** A little more of the day hungry (0.58 against 0.57, inside the noise floor), mood and family time
  leaning down inside the floor, and nothing on people, deaths, tools or buildings that can be told from chance. Children playing more are children gathering a
  little less; how much of their gathering to take away, and who makes it up, is phase 3's question and has its own measurement.

## 9. A little one's pace, and figures for the two ages (rules 212)

The owner asked on 11 November 2026 for new figures for the first two ages, "smaller and slower possibly". Phase 3 (the three ages)
moves to rules 213.

| part | what changes | lab removal |
|---|---|---|
| little (`src/sim/child_pace.ts`, read by `moveSpeed` in `activities.ts`) | A little one, under seven, walks at 0.72 of a grown person's pace instead of the 0.88 every under-twelve had. A child of seven to eleven keeps 0.88. Load, health, injury, ground, dark, storm, tiredness and running apply on top as for anyone. | `rich-no-little-pace` |

The figures are presentation only (`src/render/characters.ts`): a little one is drawn at 0.44 to 0.60 of a grown person, with a
bigger head and shorter legs, barefoot in a smock, no hat, with a toddling step (short quick steps, a big bob, arms held out for
balance); a child of seven to eleven at 0.64 to 0.78, longer in the leg, in a tunic, with a bouncier step. A smaller body takes more
steps over the same ground. Grown people are drawn as before. Page check `scripts/browser/child_figures_check.mjs` (ordinary
close-ups and a staged line-up walking at each person's own pace); evidence `viewer_evidence/child-figures-20261111/`.

Contract tests `tests/child_pace.test.ts` (5, each with the rules-211 contrast). One case of `tests/iron_chain_stall.test.ts` is pinned
to rules 211 with a comment: with the pace switched off it passes, with it on that meadow world's first charcoal moves past the
thirty-day window; the charcoal chain it checks is unchanged. Immutable pin `tests/v212_continuation.*` (Normal gen-2, arrivals on; a
little one walking by tick 100; then 120 ticks after a save and load), recorded from a clean checkout of `cdf294cc`.

Lab: clean checkout of `cdf294cc` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, `nudge:1`, `nudge:2` and
the removal, 48 arms in 15 minutes 39 seconds. Compared with the rules-211 lab already recorded. Evidence: `review_evidence/childhood-20261111/r212/`,
`versions-211-212.txt`, `run212.txt`.

| measure, a settlement in 25 days | 212 | little pace removed (as 211) |
|---|---|---|
| people, deaths, hunger deaths, tools, projects done, homes, child play, games, practices | | not distinguishable from chance |
| mean hunger level (higher is fuller) | 53.2 | 50.2, systematic, within the noise floor |
| mean mood | -11.9 | -15.2, systematic, within the noise floor |
| chats | 114.4 | 123.1, systematic, within the noise floor |
| family time | 68.7 | 74.4, systematic, within the noise floor |
| spare-time outings | 7.1 | 9.9, systematic, within the noise floor |

Rules 211 against 212 on the three shared arms (`scripts/lab_versions.ts`): nothing moved by more than a single draw moves it.

What that supports: the slower pace is seen (a little one falls behind the people it walks with) and costs nothing the lab can find.
The leanings inside the noise floor (a little fuller and better in mood, a little less company and spare time) are not attributed.
No benefit or harm is claimed.

## 10. Phase 3 result: the three ages (rules 213)

Owner instruction, 12 November 2026: "Start phase 3". `src/sim/three_ages.ts`, four separately switched parts, all on food gathering
(berries, fruit, wild grain, fish); wood, stone, farm work and building were already closed to children.

| part | what changes | lab removal |
|---|---|---|
| little | A little one (under seven) gathers no food; the grown-ups bring it. Eating, drinking and asking are not work. | `rich-no-ages-little` |
| shown | A child of seven to eleven gathers only a kind of food somebody has shown them. A completed practice records the task in `p.shown` (a small saved list, from 213 only, checked on load and in the fingerprint). | `rich-no-ages-shown` |
| bounded | After a stretch of gathering, a child of seven to eleven rests from it six times as long (cooldown `childwork`). | `rich-no-ages-bounded` |
| practice | What gathering teaches is scaled by age: 0.4 for a little one, 0.5 at seven rising to 1 at twelve. Lessons are not scaled. | `rich-no-ages-practice` |

A child whose hunger is critical is held by none of them. `rich-no-three-ages` removes all four and equals rules 212. Contract tests
`tests/three_ages.test.ts` (10, each with the rules-212 contrast). Immutable pin `tests/v213_continuation.*` (Normal gen-2, arrivals on;
a child shown a task or resting from gathering by tick 300; then 120 ticks after a save and load), recorded from a clean checkout of
`46418841`. In 243 related test files no new failure.

Lab: clean checkout of `46418841` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, two nudges, all four parts
removed and each removed alone, 84 arms in 25 minutes 44 seconds. Compared with the rules-212 lab already recorded. Evidence:
`review_evidence/childhood-20261111/r213/`, `versions-212-213.txt`, `run213.txt`.

| measure, a settlement in 25 days | 212 | 213 | verdict |
|---|---|---|---|
| food gathering finished by a little one (all removed / 213) | 166.9 | 20.2 | larger than chance; the `little` part |
| hours a little one spent gathering | 495 | 93 | larger than chance |
| food gathering finished by a child of 7 to 11 | 213.3 | 83.4 | larger than chance; `bounded` and `shown` |
| hours a child spent gathering | 456 | 247 | larger than chance; the `bounded` part |
| food gathering finished by everyone twelve and over | 988.7 | 1,085.3 | larger than chance (they gather a tenth more) |
| under-twelves' share of food gathered | about 0.2 | about 0.1 | larger than chance |
| child play | 102.7 | 123.7 | larger than chance |
| spare-time outings | 7.1 | 69.6 | larger than chance |
| plays alone: stones / bugs / sticks | 5.9 / 5.7 / 6.0 | 24.7 / 26.8 / 37.8 | larger than chance |
| visits | 14.7 | 32.7 | larger than chance |
| share of waking time hungry, everyone | 0.6 | 0.7 | larger than chance (higher in 12 of 12) |
| the same, little ones / children / twelve and over (all removed against 213) | 0.5 / 0.4 / 0.6 | 0.7 / 0.7 / 0.7 | larger than chance |
| deaths from hunger | 0.4 | 1.1 | systematic, within the noise floor |
| deaths | 2.3 | 2.9 | not distinguishable from chance |
| people at day 25 | 30.4 | 28.0 | systematic, within the noise floor |
| tools in hand / projects done | 54.6 / 68.3 | 45.1 / 59.4 | systematic, within the noise floor |
| children's foraging skill at day 25 | 0.8 | 0.7 | larger than chance |

What that supports:

- **The three ages happen.** Little ones gather about an eighth as often as before and children about two-fifths, and the time goes to
  play: child play up a fifth, plays alone about four times as many, spare-time outings and visits up sharply. All beyond chance.
- **Grown people make up only part of it.** They gather about a tenth more, but the settlement is hungry for more of the day: 0.7 of
  waking time against 0.6, beyond chance in every seed, and most of all for the children themselves (little ones 0.5 to 0.7, children
  0.4 to 0.7). Hunger deaths lean up (0.4 to 1.1) and people, tools and projects lean down, inside the noise floor. This is the cost the
  plan named in section 3; who feeds a little one was left unchanged on purpose and is now measured: not enough.
- **Which part does what.** `little` alone carries the little ones' gathering and their hunger; `bounded` carries most of the
  children's; `shown` and `practice` move nothing beyond chance by themselves.
- **No benefit to survival is claimed.** Whether to keep the parts as they are, phase them in (the plan's section 3 suggested the cap and
  "shown first", then measuring, before little ones stop), or add a rule for feeding a little one first, is the owner's decision.

## 11. Feeding the children who no longer feed themselves (rules 214)

Owner instruction, 12 November 2026: "+", read as the offered next step after the rules-213 report, add feeding for the children.
`src/sim/child_feeding.ts`, two separately switched parts. Rich worlds at 214 only.

| part | what changes | lab removal |
|---|---|---|
| meals | A carer keeps a child under twelve on a meal rhythm. From the carer's own memory of their last hand-over of food to that child (cooldown `fedby:<id>`, saved with the other cooldowns), once 800 ticks have passed the child counts as hunger 60 for the care option, whether or not they look hungry. A worse read still wins; every other check of the care option stands. | `rich-no-feeding-meals` |
| provide | The pull an adult with dependants feels to put food by grows by 4 for each under-twelve in the household. | `rich-no-feeding-provide` |

`rich-no-child-feeding` removes both and equals rules 213 (its hunger shares match the rules-213 control to three decimals). Contract
tests `tests/child_feeding.test.ts` (5, each with the rules-213 contrast). Immutable pin `tests/v214_continuation.*` (Normal gen-2,
arrivals on; a carer who remembers feeding a child by tick 100; then 120 ticks after a save and load), recorded from a clean checkout of
`13b42986`. In 256 related test files 59 failures, every one already in the rules-208 full-suite list; no new failure.

Lab: clean checkout of `13b42986` (`dirty` false), 12 seeds, Normal, fork 0, 25 days, arrivals on; control, two nudges, both parts
removed and each removed alone, 72 arms in 18 minutes 48 seconds. Compared with the rules-213 lab already recorded. Evidence:
`review_evidence/childhood-20261111/r214/`, `versions-213-214.txt`, `run214.txt`.

| measure, a settlement in 25 days | 212 | 213 | 214 | verdict, 213 against 214 |
|---|---|---|---|---|
| share of waking time hungry, everyone | 0.57 | 0.67 | 0.62 | larger than chance (lower in 10 of 12) |
| the same, little ones | 0.48 | 0.70 | 0.57 | larger than chance (lower in 12 of 12) |
| the same, children of 7 to 11 | 0.40 | 0.66 | 0.58 | larger than chance (lower in 12 of 12) |
| the same, twelve and over | 0.62 | 0.66 | 0.65 | not distinguishable from chance |
| food gathering finished by everyone twelve and over | 988.7 | 1,085.3 | 1,159.5 | larger than chance |
| hours they spent gathering | | 2,096 | 2,299 | larger than chance |
| meals eaten from a pack / from a store | | 900.6 / 249.4 | 956.9 / 202.2 | larger than chance, both |
| farm plots | | 25.8 | 21.3 | larger than chance (lower in 11 of 12) |
| tools in hand / projects done | 54.6 / 68.3 | 45.1 / 59.4 | 38.9 / 54.6 | systematic, within the noise floor |
| deaths (from exposure) | 2.3 | 2.9 (0.6) | 4.4 (1.6) | systematic, within the noise floor |
| deaths from hunger | 0.4 | 1.1 | 1.4 | not distinguishable from chance |
| people at day 25 | 30.4 | 28.0 | 27.6 | not distinguishable from chance |
| child play | 102.7 | 123.7 | 139.2 | systematic, within the noise floor (higher in 12 of 12) |
| family time | | 81.7 | 90.3 | systematic, within the noise floor |
| visits | 14.7 | 32.7 | 22.5 | systematic, within the noise floor |

Per part, within the rules-214 run (hungry share, little ones / children; grown people's food gathering):

| arm | little ones | children | gathering, twelve and over |
|---|---|---|---|
| control (both on) | 0.57 | 0.58 | 1,156 |
| meals removed | 0.64 | 0.64 | 1,165 |
| provide removed | 0.60 | 0.56 | 1,109 |
| both removed (= 213) | 0.70 | 0.66 | 1,083 |

What that supports:

- **Children are fed more.** The hungry share falls for little ones (0.70 to 0.57) and children (0.66 to 0.58) in every seed, and for
  the whole settlement (0.67 to 0.62). That recovers a little over half of what rules 213 cost a little one and about a third of what it
  cost a child; neither is back at the rules-212 level.
- **Which part does what.** `meals` carries most of it for the children (without it their share stays at 0.64) and half of it for
  little ones; `provide` carries most of the grown people's extra gathering (without it 1,109 against 1,156) and a smaller share of the
  little ones' gain (without it 0.60), and without it children of seven to eleven are no hungrier (0.56).
- **What it costs.** Grown people gather a tenth more again and eat more from their packs and less from stores, beyond chance; fewer
  farm plots are worked (25.8 to 21.3, beyond chance), and tools, projects and visits lean down, inside the noise floor. Deaths lean up
  (2.9 to 4.4, ten of twelve seeds), most of it exposure (0.6 to 1.6), inside the noise floor; hunger deaths do not move beyond chance.
- **No benefit to survival is claimed.** The rule does what it was for, feeding the children, and the settlement pays for it in farm
  work. Whether to keep it, tune the meal gap or the pull, or look at the exposure deaths first is the owner's decision.

**Owner decision, 12 November 2026: kept as it is** ("I think we can leave it for now"). Watch item: if deaths (exposure most of all)
or farm plots move the wrong way in a later lab, check rules 214 first, with the arms `rich-no-child-feeding`, `rich-no-feeding-meals`
and `rich-no-feeding-provide` against the control.
