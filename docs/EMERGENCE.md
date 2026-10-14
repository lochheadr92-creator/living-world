# Toward a richer world: plan, gates and first audit

The goal is an autonomous village in the spirit of RimWorld and Dwarf Fortress: individuals who differ, consequences that last, and small
events that cascade into stories, readable in the inspector and testable in the lab. It is not strict open-ended invention (see the
novel-need result in `SCALING.md`: the action space is closed and authored, and no unauthored behaviour appeared in 24 seeds).

Decisions: seeded randomness stays (replay, inspection, the lab); the golden fingerprints no longer constrain a change that is meant to alter
behaviour (re-record `tests/golden.expected.json` in the commit that changes rules, or retire it); the ensemble gates below are the
acceptance test for such a change; the current rules stay selectable so a new version can be compared against them.

## Stages

| # | Stage | Measure | Stop if |
|---|---|---|---|
| 0 | Ensemble gates replace byte-identity | gates pass on today's world, fail on a damaged one | – |
| 1 | Cascade tracer and coupling audit | how much one thing leads to another | the systems prove almost uncoupled (then stage 2 is bigger) |
| 2 | Coupling and individuality: lasting consequences, stakes, differences between people | story density up, no collapse | chains stay shallow |
| 3 | Learning: each person's own estimates of what pays | specialisation, differing between seeds | no more than random choice |
| 4 | Social transmission of knowledge | camps end with different knowledge | all camps identical |
| 5 | Composable actions (properties of items and sources) | the novel-need test shows new behaviour | the solution space is enumerable, or identical in every seed |

## Stage 0: the gates

`node scripts/lab.mjs --out gate_run --seeds 8 --fork 0 --days 12 --branches none`, then `npx vite-node scripts/gates.ts -- gate_run`
(exit code 1 on failure; `--record` writes `docs/gates.json`). A metric passes when the run's mean is within 3 standard errors of the
recorded mean (standard error from both samples, with a floor of 0.5 on the spread), and every seed keeps at least 50 people.

VERIFIED: recorded from 8 seeds (Large, day 0 to 12). The same code on 4 of those seeds passes (not independent: same seeds, and
the runs are deterministic). A deliberately damaged world, random choice from day 0 on 4 seeds, fails 5 of 9 gates (workplaces 6.8
against 17.8, solid homes 16.8 against 31.1, buildings 65.8 against 94.8, plots, homeless) and still passes people and deaths, so a gate
is a smoke alarm for building and settlement, not for survival. LIKELY: the bands will need re-recording whenever a stage intentionally
moves these numbers.

## Stage 1: what the tracer and the audit found

`scripts/cascade.ts` (tracer: `scripts/cascade/trace.ts`) and `scripts/coupling.ts` (static audit). Four seeds, Large, 12 days, about 100 people.

**The tracer's own limit.** A "link" means the same person, soon after; it is not causation. Connected sets of links ("cascades") are
inflated by busy people (in one seed the three largest held 46, 56 and 83 happenings among 16 to 23 people, and read as timelines of village life, not chains of cause).
Do not read cascade size or chain length as story depth. Real causal tracing needs the simulation to record a cause when it makes
a consequence; that belongs in stage 2.

What it does show reliably (VERIFIED on these four runs):
* **Hardship is nearly absent.** About 630 happenings per world in 12 days, and across the four worlds only 3 people went critically
  hungry or thirsty and 2 were badly hurt. There are no stakes for a cascade to run on.
* **Social cascades are closed loops.** Commonest links: social→social, work→work, social→build, sore→social 129, conflict→sore 45. The
  sampled stories show the loop promise → broken promise or contested resource → sore → "on good terms again (it faded with time)" within
  hours to a day, with nothing material downstream.
* **A grievance changes what a person does in one way.** After a quarrel or soreness, people are 3.7 to 4.6 times as likely to start
  gathering in the next ~2 hours (n = 10 to 20 per seed). No other effect of a grievance on choices is visible. LIKELY: they go off alone
  (not checked). After being hurt: drink ×8.7 and rest ×17.9 (rare, n = 65 to 100 over two seeds).

**The coupling audit (static text search; LIKELY, not measured).** Read by the decision layer: hunger, thirst, energy, beliefs, skills,
traits (five of them: generosity, sociability, caution, diligence, curiosity), household, inventory, weather, time of day, grievance,
trust, avoidUntil. Barely read (a few lines): health (3), the social need (3), familiarity, failures, last result. Not read by any choice:
the safety need, debts, and the person's memory log. There is no mood: no state that sums a person's recent experiences and changes
what they will do. Health slows work and bars some jobs, but there are no lasting injuries or roles that change.

## What this means for stage 2

The systems that exist are thin, not missing: events, grievances, relations and a log are all recorded; very few change what anyone
does for long. Candidate first moves, each to be tested in the lab against the gates: a mood that stacks recent experience and changes
choices; grievances that change who works or shares with whom for days; injuries that last and change what a person can do; stakes
(scarcity, danger) strong enough that hardship happens in some seeds and not others; cause links recorded by the simulation.

## Stage 2, first piece: mood and lean seasons (built, switched off by default)

`settings.dynamics = 'rich'` (absent means as before; the golden fingerprints and the ordinary world are unchanged with it off, VERIFIED by
the existing suite). `src/sim/mood.ts`, `src/sim/hardship.ts`, `tests/rich.test.ts`; lab intervention `rich`, `lab.mjs --dynamics rich`.

* **Mood.** Each person has thoughts: things weighing on or lifting them, each fading to nothing over its duration (bitten by a wolf, argued,
  went hungry or thirsty, is cold, is frightened, is hurt, was given something, shared a meal, a birth, a death in the family, a lean season).
  Mood is a base from how well their needs are met plus the fresh thoughts, -100 to 100. It changes two things: what they pick (a low mood
  pulls people from each other and from effortful work toward rest and idling; survival options are never weighted) and whether a contested
  resource turns into a row (0.3 to 1.7 times as likely).
* **Lean seasons.** One chance in five per day, after day 2: for three to six days wild food returns at a tenth of its pace and crops grow at
  a quarter. Announced, weighs on everyone's mood, ends. The constants were set after looking at four seeds, not tuned to a target.

**Result (VERIFIED on the runs below; the conclusion is the plain one: the stakes are still too weak for the coupling to show).**
* Rich vs authored, 8 seeds, Large, day 0 to 12, paired by seed (first version of the lean season: one chance in ten, 2 to 5 days, regrowth
  at 30%, crops at half): no outcome moved beyond what a one-draw nudge moves it (workplaces -2.5, people -1.0, deaths -0.3; all intervals
  include 0). Mean mood sits near 0 and about 0.4 people per world were below -25.
* Four seeds with the harsher season above (14 days): hunger and thirst thoughts rise (one seed had 26 people go critically hungry or
  thirsty, the others 5 to 7; before, 1 to 3 in all four), mean mood -2.5 to -4, under 1.5% of person-checks below -25, nobody starved. The
  village's stores and farms absorb a lean season, so most people never feel it.
* The tracer shows no new effect of mood on what people go on to do (the only lifts are the old ones: quarrel or soreness then gathering).
  The only thoughts that fire often are being cold (up to 1,253 renewals in one world) and being frightened (90 to 450).

What it does and does not establish: the machinery works, is deterministic, and saves and loads exactly; it does not yet make anything
happen, because almost nobody gets far enough from comfortable for mood to change a choice. Not done: the mood is not shown in the inspector
(`thoughtsOf` returns it), work speed does not depend on mood, and there is no break (a person at the bottom just idles more).

Next candidates, to be tested the same way: make want reach more people (a store that spoils, wolves that hunt near the houses, a harder
first winter); lasting injuries; give grievances a longer reach (who works with whom); show mood and its thoughts in the inspector.

### Stakes that reach people: winter, spoilage, bolder wolves (rich dynamics)

Added to `settings.dynamics = 'rich'` (`hardship.ts`; all neutral in other worlds, VERIFIED by the golden, determinism and save tests): a winter in the
last 4 days of every 12-day year (up to 12 degrees colder, wild food and crops slower; the first winter is hard because the village is not
ready, not because it is harsher), stored food spoils 3 times and left-out food 2 times as fast, and wolves notice people from farther,
go for them more often, prowl to within 11 tiles of the houses (17 before) and are kept off by a fire from 4 tiles (6 before). The inspector
shows mood and "On their mind" in rich worlds; the world menu has a "Rich dynamics" switch.

Result, 8 seeds, Large, day 0 to 15, paired by seed (VERIFIED), against the mean of the control and the nudge (not the control alone):
* **More farmland: plots 90.1 → 102.6 (+12.6, higher in 8 of 8; the noise floor is about ±8).** The only outcome that moved beyond chance.
  LIKELY, not checked: the existing rule that wants plots when food runs low is answering the spoilage, lean seasons and winter.
* Workplaces -2.2, buildings -2.5, people +0.4, deaths +0.4 (0.3 to 0.8 a world), hunger -1.7, mean mood -1.3: all within chance. Nobody is
  pushed to starvation in 15 days.
* Four seeds with the tracer (15 days): people going critically hungry or thirsty 34 to 113 a world (3 before the stakes), mean mood -5 to
  -8, 4 to 8% of checks below -25, and new links appear (hungry → conflict, hungry → soreness, hungry → hurt; a person looking in on a
  hungry neighbour and bringing grain). Still no mood effect on choices visible in the activity lifts, and no deaths to speak of.

A correction to the lab: a branch was compared with one control, and the control happens to be a lucky draw in some seeds (workplaces 20.4
against 17.8 over eight seeds in the baseline). It made random-looking "effects" (workplaces -4, buildings -4.5, the same for a one-draw
nudge). The report now compares each branch with the mean of the control and the nudge branches (excluding itself); on this run that removes the
workplaces and buildings effects and leaves only plots. Results quoted earlier in this file used the control alone; the large ones
(random choice, no wild food) are far outside the noise either way.

**24 seeds (Large, day 0 to 15; run on the 24-core machine; report made with the control-only reference, so read the control-referenced
differences with the correction above in mind).** Against the control: plots 91.1 → 102.9 (+11.8, higher in 22 of 24), workplaces 19.2 →
15.2 (-4.0, lower in 21), buildings 97.3 → 92.4 (-4.9, lower in 22), first hall 9.1 → 12.0 days (+2.9, later in 19), people below -25 mood
0 → 0.8 (+0.8, higher in 8 and lower in none); people 104.0 → 104.0, deaths 0.4 → 0.6 (interval includes 0), mean mood -1.2 (includes 0). The
one-draw nudge in the same run is itself 1.5 below the control on workplaces and buildings, so the control is high by about that much;
re-referenced to the mean of control and nudge (approximate, intervals not recomputed) the changes are about workplaces -3.3, buildings -4.1,
plots +12.4, hall +2.7 days. The direction and consistency of those four hold; their size is a little smaller than quoted against the control.

**Where the effort goes (VERIFIED, 4 seeds x 15 days, activity starts, authored against rich).** gather +29%, rest +39%, warm +23%, flee +78%,
till +31%; build -27%, plan a site -45%, craft -46%, operate a workshop -45%, tend -36%, plant -39%, harvest -55% (less ripe), withdraw
from a store -69%, deposit -39%, wander -36%; give, eat and socialise unchanged. Plots (419 against 374) and buildings (357 against 387) summed
over the four seeds agree with the 24-seed direction. LIKELY, not separated: that the pressure of want and danger draws labour from building
to food, warmth and safety, so development comes later while survival is intact; the mood weights and the stakes both act in this run and
the experiment that tells them apart (stakes without the mood effects, and the reverse) has not been done.

### Stakes against mood (24 seeds, Large, day 0 to 15, each branch against the mean of control and nudges)

| | workplaces | solidHomes | buildings | plots | deaths | belowCritical | firstHall (days) | meanMood | lowMood |
|---|---|---|---|---|---|---|---|---|---|
| rich (both) | -3.8 | -2.3 | -7.1 | +10.3 | +0.7 | +0.7 | +2.5 | -2.3 | +2.0 |
| rich-stakes-only | -3.9 | -1.1 | -5.0 | +11.8 | +0.4 | +0.4 | +3.0 | -1.5 | +1.2 |
| rich-mood-only | +0.3 (ns) | -0.3 (ns) | -0.1 (ns) | +0.3 (ns) | +0.1 (ns) | +0.1 (ns) | -0.1 (ns) | +0.6 (ns) | +0.3 |

* **The shift in development comes from the stakes (VERIFIED).** Stakes without mood effects reproduce the full result: more plots (+11.8,
  higher in 23 of 24), fewer workplaces and buildings, a later hall (+3.0 days, later in 21). Mood alone moves none of these.
* **Mood without stakes does nothing (VERIFIED for this window).** Mean mood sits near 0 (+0.6) and only 0.3 more people per world fall
  below -25. Nobody is far enough from comfortable for the mood weights to change a choice. This confirms the earlier reading.
* **Mood on top of stakes: unresolved (UNKNOWN).** With both on, every harm measure is a little worse than with stakes alone (solidHomes
  -2.3 against -1.1, buildings -7.1 against -5.0, homeless 0.8 against 0.2, deaths 1.0 against 0.7, lowMood 2.0 against 1.2), all in the
  same direction, but the intervals overlap and `rich` minus `rich-stakes-only` was not computed paired by seed. LIKELY, not shown: an
  interaction, where stakes push people low and the mood weights then pull them from building to rest. It is also compatible with chance.
  A paired contrast (the report has no `--compare` option yet) or more seeds would settle it.
* Limits: 15 days contains one winter (days 8 to 11 of the first year); the mood result may not hold over several years.

## Measured: a town of a hundred dies of the stakes, not of the crowd (24 seeds, town, rich, 12 days)

The `town` profile (`src/sim/profiles.ts`: the Large population in one camp on the ordinary 80x80 map, the camp's recipe at 3.6
times) run rich for 12 days, `rich-stakes-only` and `rich-mood-only` against the mean of the control and a nudge. The authored
town, run once by hand for 10 days, never had a hungry person and grew to 105; the rich town is another matter.

| | reference (rich, all on) | stakes only | mood only (no stakes) |
|---|---:|---:|---:|
| people at day 12 | 90.0 | 89.5 | 101.8 (+12.2, higher in 22 of 24) |
| deaths | 11.3 | 12.0 | 0.3 (−11.6, lower in 18 of 24) |
| below a critical need | 9.5 | 7.8 | 0.6 (−8.0) |
| mean hunger | 52.4 | 53.2 | 69.8 (+17.4) |
| mean mood / in low mood | −19.4 / 20.2 | −18.5 / 19.5 | 0.2 / 0.7 (24 of 24 up) |
| buildings / solid homes | 68.0 / 19.6 | 67.0 / 19.4 | 78.6 / 28.3 (+10.7 / +8.4) |
| workplaces | 3.0 | 2.2 | 3.8 |
| tools | 87.8 | 86.3 | 128.5 (+41.4, higher in 23 of 24) |
| projects adopted / done | 338.6 / 90.8 | 337.9 / 88.6 | 386.5 / 125.8 (both 22+ of 24 up) |
| top gathering kind's share | 0.7 | 0.7 | 0.5 (lower in 24 of 24) |

* **The stakes are the whole of the harm (VERIFIED).** Stakes without mood effects reproduce the full rich town to within the noise
  on every metric: twelve dead of a hundred in twelve days, a tenth of the village at a critical need, mood at −19. Mood effects on
  top of the stakes add nothing measurable here.
* **Without the stakes the town thrives (VERIFIED).** Moods on, lean seasons, winter, spoilage and bolder wolves off: 102 people,
  a third of a death, mean hunger 70, more homes, more buildings, half again as many tools, fifty more projects taken on. Two seeds
  of 24 go the other way on people and three on deaths; the rest are one-sided.
* **Density is what makes the stakes lethal (LIKELY, not shown by this run).** The same stakes on four camps of 25 (the Large rich
  baseline, `docs/gates-rich.json`) cost half a person in twelve days. The same hundred in one camp lose twelve. The per-person
  recipe is identical, so the difference is in how a single camp uses it: a hundred people's nearest sources overlap and are
  stripped together while far ones stand, crowding penalties push the walk out, one storehouse where four camps have four
  (the scaled rules allow one workplace of a kind per settlement), and eleven wolf dens on one map. Which of these matters is not
  separated here; the single-seed run saw the deaths come by hunger and thirst, among children, from day 8.
* **Under the stakes everyone gathers the same thing.** The top gathering kind's share is 0.7 with the stakes and 0.5 without, lower
  in 24 of 24 seeds: a food scramble, not specialisation. That is what the Stage 3 metric will read in a starving village.

What this is not: a verdict on the stakes in the village or the Large world, where they were accepted as making hardship happen in
some seeds and not others. It is a finding about scale: the stakes as written do not survive a hundred people on one map, and a
density experiment answers with a death rate. Before any tuning, the next run should separate the stakes (the lab has no branch for
spoilage, the lean season or the wolves on their own) and record what people die of.

## Stage 3, first piece: what has paid (built, rich only, not yet measured)

Each person keeps their own running estimate of what each kind of gathering has paid *them* (`src/sim/learning.ts`), learned from
nothing but their own finished activities, and lets it tilt their next choice by a bounded amount. When a gathering option is chosen
it says how many units it is for and how long it should take (walking plus the nominal work); when the activity ends, for whatever
reason, what was got in the time spent is compared with that. 1 means as planned; below 1 the trip paid worse (the source ran out,
the pack filled, a wolf, hunger cut it short); above 1 better, and skill is in the ratio on purpose: someone quick at a thing finds
that it pays, does more of it, and gets quicker still, which is the loop by which people come to differ. One exponential running mean
per kind (berries, fish, wood, stone, clay, ore; the skill the source trains), saved with the person, shown on the card under
*Traits & skills* as "What has paid them".

The tilt is at most ±6 either way, grown in over the first three outings, comparable to the existing "good at it" term and smaller
than any need, so hunger, thirst, cold and a wolf still win. The estimate is a preference, never an override; the engine still
generates every option and ranks them. An authored world records nothing and is tilted by nothing (the golden fingerprints: compact
hashes unchanged by this commit; the deep ones moved because an empty estimate table is now part of the hashed state).

**Measure, decided before the run.** The lab tallies, from the activity-start hook, who set off to gather what: `specialisation` is
the mean over everyone who set off at least four times of how concentrated their gathering was on one kind (a Herfindahl index: 1 =
always the same kind, 1/kinds = spread evenly), and `topKindShare` the share of all gathering in the village's single most-used kind,
to tell a village of specialists from a village that all does one thing. `rich-no-learning` removes only the estimates. The stage's
own stop rule is "no more than random choice", so `random-choice` runs beside it as the floor. On the 24-core machine, about 30
minutes:

```
node scripts/lab.mjs --out learn_out --seeds 24 --fork 0 --days 12 --profile large --dynamics rich --branches nudge:1,nudge:2,rich-no-learning,random-choice
```

What would count: `specialisation` higher with learning than without by more than the nudge spread, with an interval that excludes
zero, and the kinds people settle on differing between seeds (read off the per-seed rows, not the means). What would stop the stage:
learning no further from random choice than the nudges are from the control. A null result stands; nothing about the tilt is to be
tuned to make the ensemble come out positive.

## Stage 3, second piece: a trade (built, rich only, measured on one seed)

The first piece (`learning.ts`, "what has paid") asks *what has paid ME*, and the measured answer was the same for everybody: the
whole village learns that one kind of gathering pays and goes and does it (`topKindShare` 0.66-0.7 on the town ensemble). That is
learning without division of labour. A trade (`src/sim/trade.ts`) is the other half of the question - not *what pays* but *what
pays me more than it pays the people around me*, which is comparative advantage.

What a person uses to settle on one, and nothing else:

* **their own skills, measured against their own average** across the eleven skills, so somebody able at everything does not claim
  every trade: what counts is the thing they are comparatively best at;
* **what they can see other people doing** - `SeenEntity.work`, filled in perception.ts for rich worlds only, which says what kind
  of work a watcher can plainly see somebody is at (chopping at a tree is wood, standing at the kiln is the kiln, hoeing is
  farming). A trade that every single person in sight is already at costs 45 points, which is about the whole spread of starting
  skills, so crowding can genuinely move somebody off something they are better at;
* **their own estimate of what that work has paid them** (`p.payoff`, the first piece), which is how a trade that turns out badly
  is given up.

It is reconsidered at most every half day and is sticky (a different trade has to look 6 points better before anybody changes). It
tilts the matching work options by `TRADE_NUDGE` = 6 - the same bound as a private plan's step and the payoff estimate - applied
where the ranking is made (`decision.ts`), never in an option's own utility, so hunger, thirst, cold and a wolf still win every
time and the engine still generates and ranks everything. The person card says it in one line under *Traits & skills*, and the
decision record names it ("woodcutting is my trade") when it was part of why.

**Measured, one headless run, Large, seed meadow, rich, 12 days** (103 people alive):

| | |
|---|---|
| people with a trade | 70 of 103 (68%) |
| trades in use | baking 11, carpentry 9, building 8, handiwork 8, smithing 7, stonework 6, farming 6, the kiln 5, woodcutting 4, fishing 3, foraging 3 |
| changes of trade | 18 |
| why, in their own words | "quicker at it than at anything else" x33, "nobody else here does it" x21, "...was not paying" x16 |

So a village of a hundred comes out with eleven trades rather than one, a fifth of them chosen *because nobody else there was
doing it*, and a sixth of them given up because they stopped paying. An authored world has none of it (0 of 29 after 12 days), and
`rich-no-trades` removes it and nothing else.

Not yet measured: whether a village with trades is better off (`workplaces`, `tools`, `meanCondition`) or only more differentiated,
and whether the trades a seed settles on differ between seeds. The ensemble is the test, and nothing about the tilt is to be tuned
to make it come out positive:

```
node scripts/lab.mjs --out trade_out --seeds 24 --fork 0 --days 12 --profile large --dynamics rich --branches nudge:1,nudge:2,rich-no-trades,rich-no-learning
```

## A town of a hundred: what killed it, and what did not (`scripts/famine.ts`)

The `town` profile is a hundred people in ONE camp on the ordinary 80x80 map: the Large population with nowhere to spread, a density
experiment rather than a bigger village. Under rich dynamics it died. 24 seeds, 12 days, no arrivals: **11.3 deaths of 100 on average**,
and bimodally so - 12 seeds lost 3 or fewer, 8 lost 18 or more (gen-3 50, nov-9 45, fern 44, cedar 29). Four camps of 25 under the same
stakes lose about half a person.

`scripts/famine.ts` is the instrument: one headless run, nothing switched on or off, one line a day of food gathered, food spoiled, food
eaten, food standing in stores and in packs, how many different people were critically hungry, the wood harvest, the trees standing, the
baskets, the fires, and every death with what it was of. Read against the same run of `large` and of the ordinary village it says this:

* **Per head, a town gathers and eats about what a village does in good weather.** Good days: 4.7 units of food gathered per person,
  3.9 eaten, 0.65 spoiled - a surplus of about 5 units a day for a hundred people, which is nothing.
* **The lean season is where they part.** Wild food comes back at a tenth of its pace for 3-6 days. The town's harvest falls to 2.0-2.5
  per head, the four camps' to 2.6-2.9, and the town enters the lean season with 337 units of food (stores plus packs) where the four
  camps have 466. The town is empty by the third lean day and then dies in a cascade: on seed `fern`, 80 of 100 people critically hungry
  on day 11, and 23 deaths, 15 of them of hunger.
* **The town spends MORE of its time gathering and brings back LESS**: 19-24% of all sampled activity against the four camps' 16-17%, for
  a fifth less food. A hundred people share one camp's walking distance, so every bush is visited three and a half times as often and is
  three and a half times as thin when they get there. That is the density itself, not a rule.
* **Two rules, though, were simply wrong at that scale, and both have been fixed** (see `docs/SCALING.md`):
  1. one workplace of each kind per settlement, which gave a hundred people one storehouse where four camps of 25 had four;
  2. wolves scaled by people alone, which put eleven dens inside one village's walking distance (the Large profile's twelve dens are
     spread over four times the land).
  Measured with the instrument, before and after, 12 days each: gen-3 50 deaths -> 8, nov-9 45 -> 11, fern 44 -> 23, aspen 18 -> 11,
  cedar 29 -> 2, meadow 1 -> 0; the mean over those six seeds falls from 31.2 to 9.2. On seed `meadow` the worst day goes from 16 people
  critically hungry to 11, and nobody dies.
* **A third candidate was tested and refuted.** A town has a quarter of the trees per head that a village or the Large profile has (8.4
  against 28.7 and 35.2), because the forest is drawn over the map before any camp is placed and so is the one per-camp quantity that
  never scaled. Scaling it by the crowding made everything far worse - gen-3 8 deaths -> 50, fern 23 -> 81 - because trees occupy the
  ground the food clusters are placed on (food per head fell from 3.08 to 2.00 sources) and a denser forest blocks the way to water
  (thirst deaths appeared, 12 on one seed). Wood is not what the town is short of; walkable ground with food on it is. The change was
  reverted and is not in the branch.

What remains is the density effect itself, which is what the profile exists to show. Closing the last of it would mean changing something
that is not a mis-scaled rule - the spoilage multiplier (`SPOIL_STORE`, which eats the whole surplus of good days) or where a camp's food
clusters are laid - both of which change every rich world, including the ensembles already measured.

## The counterfactual lab (`scripts/lab*.ts`, `scripts/lab/`)

Fork a saved world, change one thing, run it forward, compare with the control and with a "nudge" (one extra random draw) that measures
what chance alone does. 24 seeds, Large, fork day 4, 8 days (run on a 24-core Windows machine):

| branch | main result (24 seeds) |
|---|---|
| nudge (1 draw) | parts from the control in 24/24 within 0.05 days; per-seed spread: workplaces ±3.1, buildings ±4.0, hunger ±5.4 |
| wolf search memory off | identical to the control in 24/24 (the optimisation is exact; the fork is exact) |
| random choice | workplaces 16.8 → 8.1, buildings −14.0, first hall +3.0 days, homeless 0.1 → 1.0; lower in 24/24 |
| no wood near settlements | buildings −4.1 (lower in 20/24), first hall +1.4 days; mostly absorbed |
| no wild food near settlements | people 102 → 57, deaths +45, workplaces −9.2, in 24/24 |
| no clay or ore | workplaces −2.1, buildings −1.9: within the noise floor |

Known weaknesses: (1) with one control per seed, small discrete metrics (people, deaths) are flagged "systematic" by the bootstrap too often
(3 of 22 nudge cells), and no-wood shares the identical people/deaths flags with nudge:1, which is the control's own luck; only
"larger than chance" verdicts are reliable. Fix: compare with the mean of the control and the nudge branches. (2) UNRESOLVED: the two-draw
nudge ends identical to the control in 5 of 24 seeds. In a direct test the shared random state of a two-draw-shifted world is equal to
the control's again within 60 ticks, so something returns the generator to the same state; it was not found (no `setState` or
reassignment in `src/sim`). It affects how the noise floor is read, not the other results.
