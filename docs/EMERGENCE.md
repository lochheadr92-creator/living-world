# Toward a richer world: plan, gates and first audit

> Current direction (2026-10-17): one evolving simulation, with the integrated rules on for new worlds. [DEVELOPMENT_POLICY.md](DEVELOPMENT_POLICY.md) supersedes earlier off-by-default/two-product-mode requirements below. Older measurements and mode descriptions remain historical evidence; this policy change does not revalidate their results. Explicit legacy save/replay and diagnostic contracts remain supported.

> Current product direction (2026-10-22): [PRODUCT_VISION.md](../PRODUCT_VISION.md) — an autonomous world game with few direct controls, supported by this simulation. The stage list below is a research backlog, not a commitment. Prefer completing one bounded, watchable situation end to end (a household recognises poor shelter → gathers materials → builds → occupies it, or meets an understandable reason it cannot; a recognised threat → preparation → response → lasting consequence; a relationship history → understandable choice → observable effect) over adding several disconnected mechanics from the table. Keep proposed behaviour marked as proposed: the stage headings below say which were built, which were only piloted and which are planned, and nothing here is rescheduled by this note.

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

`node scripts/lab.mjs --out gate_run --seeds 8 --fork 0 --days 12 --dynamics authored --branches none`, then `npx vite-node scripts/gates.ts -- gate_run`
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
shows mood and "On their mind" in rich worlds; the world menu originally had a "Rich dynamics" switch (retired when these rules became the product default).

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

## Stage 3, first piece: what has paid (built, rich only; retained 24-seed evidence audited, acceptance open)

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
the mean over everyone who set off to gather at least four times of how concentrated their gathering was on one kind (a Herfindahl
index, 1 = always the same kind, 1/kinds = spread evenly), and `topKindShare` the share of all gathering in the village's single
most-used kind, intended to help distinguish specialisation from village-wide concentration, but insufficient to establish differing
work kinds without the underlying counts; both group gathering by `SOURCE_SKILL`, not
per individual source species. The lab's `GatherTally` saves these metrics rounded to three decimals (`scripts/lab/lab.ts:320`
and `scripts/lab/lab.ts:333`). `rich-no-learning` removes only the estimates. The stage's own stop rule is "no more than random choice", so
`random-choice` runs beside it as the historical intended comparator, explicitly not an automatic lower bound. On the 24-core
machine, about 30 minutes:

```
node scripts/lab.mjs --out learn_out --seeds 24 --fork 0 --days 12 --profile large --dynamics rich --branches nudge:1,nudge:2,rich-no-learning,random-choice
```

What would count: `specialisation` higher with learning than without by more than the nudge spread, with an interval that excludes
zero, and the kinds people settle on differing between seeds (read off the per-seed rows, not the means). What would stop the stage:
learning no further from random choice than the nudges are from the control. Both are kept as the historical criteria: the
expectation that kinds could be read off the per-seed rows was not fulfilled, because the recorded schema stores no per-person or
per-kind counts and no dominant kinds, only the scalar metrics below. A null result stands; nothing about the tilt is to be tuned to
make the ensemble come out positive.

**Measured (`learn_out/`, 24 seeds, recomputed from the saved three-decimal per-seed metrics, without the report's additional
one-decimal display rounding).** The report (`scripts/lab_report.ts`) shows these metrics to one decimal, which is why it read as
"0.5 everywhere, [0, 0]"; the saved values carry three decimals, and the extra decimals on the aggregates below are arithmetic on
those saved values, not original measurement precision. The audit (a temporary script importing the existing `scripts/lab/stats.ts`
`paired()`, default 4000 resamples with a fixed internal RNG) found all 24 expected JSONLs, exactly five rows per seed (control,
nudge:1, nudge:2, rich-no-learning and random-choice, each once), a terminal `{seed, done: true}` row per seed, the
Large/rich/fork-0/12-day configuration on every row, 12 population samples per row and 240 finite concentration metrics in
[0, 1] on the 0.001 grid.

Branch means (saved per-seed metrics averaged over the 24 seeds; the reference row is the per-seed mean of control, nudge:1 and
nudge:2, averaged over seeds):

| branch | specialisation (mean) | topKindShare (mean) |
|---|---|---|
| control | 0.4755416667 | 0.5574166667 |
| nudge:1 | 0.4759166667 | 0.5602083333 |
| nudge:2 | 0.4767500000 | 0.5582916667 |
| rich-no-learning | 0.4658750000 | 0.5395416667 |
| random-choice | 0.5228333333 | 0.6580416667 |
| reference | 0.4760694444 | 0.5586388889 |

Paired effects, per seed, against that same reference; 95% intervals from `paired()` in `scripts/lab/stats.ts` (default 4000
resamples, fixed internal RNG), not the previous normal approximation:

| effect | metric | mean | 95% bootstrap lo, hi | seeds positive |
|---|---|---|---|---|
| reference − rich-no-learning (learning effect) | specialisation | +0.0101944444 | +0.0041805556, +0.0158055556 | 20/24 |
| reference − rich-no-learning (learning effect) | topKindShare | +0.0190972222 | +0.0090416667, +0.0287361111 | 18/24 |
| random-choice − reference | specialisation | +0.0467638889 | +0.0393055556, +0.0543055556 | 24/24 |
| random-choice − reference | topKindShare | +0.0994027778 | +0.0900833333, +0.1080972222 | 24/24 |

The specialisation nudge-noise SD is 0.0085452228, pooled over 48 values (each nudge minus the mean of the control and the other
nudge). Branch means and paired effects are different quantities: the first table averages saved per-seed metrics, the second
averages per-seed differences against the per-seed reference.

* **What the retained rows show.** Learning is a small concentration effect, about one nudge-noise SD per seed; that is not a stage
  accepted as complete, not evidence of useful learning, and not evidence of differentiated roles. `topKindShare` can rise because
  many people do the same work, and random-choice is more concentrated still, so higher concentration alone is insufficient.
* **The stop rule.** Read literally, the historical criterion is not triggered on specialisation: the distance is 0.0467638889
  against a nudge noise of 0.0085452228. That literal reading is not an adequate pass criterion either, because the differing
  work-kind identities the rule was meant to require are still unmet. No criterion was rewritten and nothing was tuned. The
  random-choice chooser hashes the option key per person per 32-tick window, after the eligibility filters (`decision.ts` line 90:
  `hashUnit(p.id, world.tick >> 5, hashKey(o.key) ^ constant)`); the causal explanation for random-choice's higher concentration is
  untested, not established.
* **Work-kind identities were not recorded.** The artifacts contain no per-person or per-kind counts and no dominant-kind
  identities, and they cannot be recovered from the scalar scores, hashes or milestones. The top-level fields are
  seed/profile/fork/days/dynamics/spec/summary/note/divergedAfterTicks/finalHash/outcome/milestones/popByDay; outcome contains scalar
  metrics, milestones contains building times and popByDay population counts. The only other file in `learn_out/` is `report.txt`. The smallest additional artifact for the missing evidence, for a separately authorized future
  run, is an export of the existing `GatherTally` per-person per-`SOURCE_SKILL` gathering-start counts keyed by seed, branch and
  person, with zeros and totals (so the four-or-more-start eligibility and any dominant-kind tie handling are derivable), together
  with a verified source revision, dirty-tree fingerprint and run configuration. Not implemented or run here.
* **Provenance.** The `learn_out` name was earlier associated with an incomplete run launched before rich-no-learning support; the
  retained contents are complete per the audit above, so the directory name alone is neither acceptance nor rejection. Completion
  markers, filenames, timestamps and final hashes do not independently establish a source revision. Arithmetic verified from the
  retained artifacts; generating source revision not established.

## Stage 3, second piece: a trade (built, rich only, measured on one seed)

The first piece (`learning.ts`, "what has paid") asks *what has paid ME*; the saved scalar concentration metrics
(`specialisation`, `topKindShare`) motivate a trade hypothesis, but they do not show that everyone chose the same kind, nor a
differentiated division of labour. A trade (`src/sim/trade.ts`) is the other half of the question - not *what pays* but *what
pays me more than it pays the people around me*, which is comparative advantage within a person's own skills and what they can
plainly see others doing.

What a person uses to settle on one, and nothing else:

* **their own skills, measured against their own average** across the eleven skills, so somebody able at everything does not claim
  every trade: what counts is the thing they are comparatively best at;
* **what they can see other people doing** - `SeenEntity.work`, filled in perception.ts for rich worlds only, which says what kind
  of work a watcher can plainly see somebody is at (chopping at a tree is wood, standing at the kiln is the kiln, hoeing is
  farming). A trade that every single person in sight is already at costs 45 points, which is about the whole spread of starting
  skills, so crowding can genuinely move somebody off something they are better at;
* **for gathering-aligned trades, their own estimate of gathering returns** (`p.payoff`): poor recorded returns can make them give up
  that trade after several outings. Non-gathering trades do not yet have a payoff estimate and can change through crowding or skill.

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

The table reports trade labels and recorded explanations on one seed; it is not proof that different people actually did
different kinds of work, nor that a payoff failure caused a change of trade. An authored world has none of it (0 of 29 after 12
days), and `rich-no-trades` removes it and nothing else: existing reported observations, not independently verified now.

Not yet measured: whether a village with trades is better off (`workplaces`, `tools`, `meanCondition`) or only more differentiated,
and whether the trades a seed settles on differ between seeds. The ensemble is the test, and nothing about the tilt is to be tuned
to make it come out positive:

```
node scripts/lab.mjs --out trade_out --seeds 24 --fork 0 --days 12 --profile large --dynamics rich --branches nudge:1,nudge:2,rich-no-trades,rich-no-learning
```

## Stage 4: social transmission of knowledge (observation built and piloted; nothing measured, nothing validated)

**Primary question.** Does existing person-to-person knowledge transmission cross camp boundaries, and what opportunities exist for
it to do so? "Camps end with different knowledge" is the separate differentiation objective; "all camps identical" is its historical
stop condition. No new contact mechanic (travel, trade, arrivals) is proposed by this measurement plan.

### What already exists (read from the code, not yet measured)

`tellBelief` (`src/sim/news.ts:66`) stamps the speaker's `S.told` attempt history even when it refuses, and accepts an incoming belief
only when the listener has no belief with that id, or the incoming one is fresher (`seen > old.seen + 200`). An accepted copy sets
`src: 'told'`, `from` to the immediate sender, `origin` to the preserved value or sender fallback, and increments `hops`. It writes
an accepted-transfer log and, for danger beliefs only, reduces the listener's safety need by 8 (floored at zero). `knowledge.observe` resets `origin` to self and `hops` to 0, and `learn` refreshes a belief at
`seen >= old.seen`, so retained provenance is not a movement history: `origin` is the current lineage's direct observer when
available, and a fallback sender does not prove the original observer (such provenance is reported as unknown). `pickNews` chooses
up to two beliefs by default, weighted by kind; `pickNews` itself rejects affinity below -10, not every `tellBelief` caller. Callers: an accepted meal invitation's
place, `hallGossip`, `ask_info`, warnings, recruiting and `phaseNews`; sharing a meal is not itself a news call. `ask_info`
(`social.ts`, line 1122) also calls `learn` directly even when `tellBelief` returned false (the freshness thresholds differ); the
diagnostics and the ablation below must account for this duplicate/bypass write. `shareConcerns` (`welfare.ts`) is a separate
concern channel and stays outside a belief-only ablation; do not claim all social information is removed.

### Measurement plan (conventions decided before any run; no simulation property is changed)

**Cohort.** A fixed measurement cohort by `Person.id`, built from initial homes. At day 0, take the ordered hubs
`[world.camp, ...extraSettlements]` (camp IDs 0, 1, ...), map every initially living person via `p.hhId -> household.homeId` to the
existing building center, and assign each to the nearest frozen hub (the `nearestHub` ordering, ties to the first). The map is
frozen: later moves, new households and destroyed homes never re-assign anybody. A person without a home at the snapshot is
`unknown` and stays unknown; there is no current-position fallback. Births take the mother's frozen cohort at birth, else `unknown`;
later entrants without an initial household home are a separate `unknown` stratum (the planned primary configuration is
`immigration = false`); an entrant with a valid home is assigned by the same first-entry rule and frozen. The mapping is retained
after death for origin lookup; only living people count at checkpoints. Unknown members are excluded from camp-specific denominators
but reported in totals. Settlements founded after day 0 are not silently new groups. This is a measurement convention, not a claim
about where anyone lives.

**Samples and overlap.** Samples at fixed days 0, 4, 8 and 12 (days since run start, fork 0); a first pilot may stop earlier, and
unreached days are reported as missing, not zero. Configuration: rich, Large, `immigration = false`. For camp C, `K_C` is the union
of all retained beliefs `(kind, id)` held by living known-cohort members. All belief kinds are included (water, danger and site
too); stale beliefs count, because they are retained knowledge and no world-truth refresh is assumed; a type transition is a
separate kind/id; values, ages and provenance are not compared by identity. Per-kind strata are retained, to diagnose water or
common places dominating. Pairwise overlap is exactly `Jaccard(A, B) = |K_A ∩ K_B| / |K_A ∪ K_B|` (abbreviated `J`). Empty camp pairs are not estimable; two
nonempty camps with both `K` empty give undefined, one empty gives 0. All unordered distinct camp pairs are used, with an unweighted
mean over valid pairs per seed and day; per-pair sets (or identities), intersections, unions, `J` and sizes/coverage are retained.
Do not pool all seeds as independent pairs. The ablation is compared on the common mask of valid pairs across control, nudge:1,
nudge:2 and the ablation at seed/day, with excluded pairs and seeds reported; missing is never coerced to 0. Across seeds, paired
bootstrap and nudge noise come with counts; the first pilot is descriptive and makes no ensemble claim.

**Contacts.** Operational contacts only, counted at the actual boundaries: a conversation that actually opens (one per conversation
id, per unordered people pair); `hallGossip` selecting a pair (per tick and hall, even with no news); a meal invitation being
answered (a channel of its own); each greeting actually emitted by `passingGreetings` (not every proximity check);
and a meal's actual diners (per meal id, from full `ate` membership), each unordered pair once per meal, the host included
only if they actually ate. One meal does not assert simultaneous presence or transfer. Pair-events are aggregated, tagged per time
window, and unique unordered people pairs separately; conversation and invitation overlap is deduplicated for the unique-pair count
(nested event channels), not for mechanism counts. Failed approaches are recorded separately, not as opened contacts. Windows
`[0,4]`, `(4,8]`, `(8,12]`, plus cumulative `[0,8]` and `[0,12]`; counts never come from the feed. Cross-camp contact fraction:
cross known-cohort pair-events / all known-cohort pair-events, per channel; unknown-cohort pairs are excluded from the denominator
and reported separately.

**Transmission attempts and accepted transfers.** An attempt is a logical sender-to-recipient offer of a belief at the actual
boundary, rejected offers included. One `ask_info` offer links both a `tellBelief` and the extra `learn` write; the duplicate is not
double counted. The incoming belief id/timestamp and the outcome are tracked per offer. Each offer's status is one of newly inserted
/ refreshed / redundant / rejected / suppressed, and an API `tellBelief` acceptance is distinguished from an actual new-or-fresher
bypass write. A strictly same-timestamp rewrite is a provenance-only write, tracked separately, never claimed as new/fresher. The
rate is accepted genuine new/fresher transfers / all attempted offers, also per channel; instrument the actual write, not the
`learn` boolean (`learn` returns false on a refresh). A later diagnostic may capture the write subevents separately.

**Immediate cross-camp transfers.** An immediate cross-camp accepted transfer is one whose sender cohort differs from the recipient
cohort at the time of the offer. Rates: sender-cohort != recipient-cohort accepted transfers / cross-camp attempts, and cross-camp
accepted / all accepted with both cohorts known. Do NOT compare `origin` to the recipient for the immediate count. The stable cohort
map at event time is used; sender and recipient ids, ticks and origin are recorded separately for the checkpoint measures.

**Retained foreign-origin beliefs and hops.** At each checkpoint, per (person, belief) told entries: foreign-origin entries /
retained told entries with both holder and origin cohort known; unknown origins, unknown cohorts and coverage are reported. The
origin-cohort lookup uses the fixed registry even if the observer has died. This is a snapshot of lineage, not a historical count:
direct observation overwrites `origin`, so zero foreign-origin beliefs at a checkpoint does not prove that nothing ever crossed a
boundary. `hops` mean and maximum are computed over retained told entries with finite hops; the number of entries is the denominator
and the missing count is reported. For every rate here, a zero denominator is undefined/not estimable, not a zero rate.

**Completeness and inertness.** The feed and personal logs cannot provide these counts: `events.ts` bounds events (`MAX_EVENTS` 500)
and logs (`MAX_LOG` 60); a finished-meal event keeps at most four participant ids (`slice(0, 4)`), and each diner log lists at most
three other diner names. Participants are omitted; refusals are often not logged. Counters and streaming belong to the runner: outside `World` and the saved
hashed state, following the existing conventions of `probe.ts`'s module-level diagnostics and the lab's optional GatherTally hooks.
Observation must consume no RNG and change no decisions, state, saving, hashing, UI, feed, logs or outputs (a separate diagnostic
artifact only); no bounded stream may drop events. All branches reset and tear down per run. Before use, enabled/disabled
equivalence of the diagnostics, including serialization (with hooks excluded as appropriate), must be verified.

**Built on 2026-10-17** to exactly this specification: `src/sim/transmission.ts` records, at the real boundaries, the contacts
(a conversation that opens, a hall pair drawn, an invitation answered, a greeting exchanged, the diners who actually ate), the
belief offers (the six `tellBelief` callers, with `ask_info`'s two writes counted as the one offer they are) and what each offer
actually did to the listener's own copy - inserted, refreshed, provenance-only, redundant or rejected - classified from the
listener's beliefs and from the write funnel (`knowledge.ts putBelief`), never from a return value. Cohorts, overlap and every
rate live in the runner (`scripts/stage4.ts`, `scripts/stage4/metrics.ts`), which also writes the records themselves -
`offers.jsonl`, `contacts.jsonl`, `cohort.json` and the per-pair belief identities in `run.json` - so that anything here can be
recounted without running the world again, and records the source by CONTENT (an FNV hash of `git diff HEAD` plus every
untracked file under `src/` and `scripts/`), because a list of changed filenames is not provenance. The diagnostics are off by default, module-level,
outside `World`, the save and the hash, and draw no randomness; the inertness contract is held by `tests/transmission.test.ts`
(a Large world run 600 ticks with them on and with them off serialises identically, generator state included), with the
measurement conventions held by `tests/stage4_metrics.test.ts`. The ablation (`rich-no-transmission`) is still unwritten.

### The proposed ablation: belief-only no-transmission

Planned branch `rich-no-transmission`: rich dynamics is the baseline configuration (not an extra `rich` branch), control + nudge:1 +
nudge:2 is the reference, and the branch itself is unsupported and unwritten now. On each `tellBelief` attempt, keep the `S.told`
attempted stamp (the current refusal already stamps, so the cooldown is not removed); suppress the listener's copy, the
danger-safety decrement and the accepted-transfer log; return false, with an explicit suppression reason available to callers rather than an already-known
or not-informed. In the same arm the `ask_info` direct `learn` fallback is suppressed as well: the blocked offer is not fulfilled;
the request is marked failed with reason "knowledge transfer suppressed by lab" (never the false "speaker did not know"); no
delivered-info relation bonus, delivery thanks or errand-clear is credited as success; `warnDelivered` is false with a suppression
reason, not "already knew"; and no delivery-dependent thanks, relation or warning-success event is fabricated. A neutral
attempted-contact response may remain. Direct observation, initial knowledge, ordinary non-informational conversations, meals,
recruit promises and the `welfare.ts` concern channel stay enabled, with their downstream consequences allowed. Normal, unablated and
authored semantics are unchanged; there is no general refactor. State plainly that these direct side effects are intentionally
suppressed and that downstream `phaseNews` relations, hall sparkle, and request or commitment outcomes and decisions may diverge; do
not claim "nothing else changes". An invitation promise stays non-informational, and later behavior from it is legitimate. Keeping
the attempted stamp does not claim the realized cooldown trajectory is the same across diverged arms. Random-choice is omitted from
the first pilot; it is at most a later robustness diagnostic for a utility-ranking effect, not a transmission isolator or a lower
bound, and need not be implemented.

### Reading the outcomes

Each outcome is read separately:
- no cross-camp contacts: the mechanism is unexercised within the window, not impossible; within-camp effects may remain;
- contacts but no accepted cross-camp transfer: check eligible offers, freshness thresholds and refusals;
- accepted transfers but little retained foreign-origin knowledge: turnover, direct observation or death can erase lineage while a
  history persists; no causal assertion;
- transmission changing overlap: the signed effect and its uncertainty are measured, and either direction is interpretable;
  transmission may increase overlap while camps still keep distinct knowledge;
- identical valid camp knowledge: a failure of the differentiation objective, not proof that no transfer occurred;
- a null or uncertain interval: inconclusive; nothing is tuned.

### First pilot (one seed, descriptive only)

```
npx vite-node scripts/stage4.ts -- --out stage4_pilot2_out --seed meadow --profile large --days 1
```
(`stage4_pilot2_out/`, run after the cohort and coverage corrections; the earlier `stage4_pilot_out/` is the first run and is
kept as it was. Both are one seed and one day.)

Large, seed `meadow`, rich, `immigration = false`, **one simulated day** (5.5 s). Day 0 is the only checkpoint reached; days 4, 8
and 12 are **missing, not zero**. This is one run of one seed: it is a check that the instrument works and a description of one
morning, and it supports no claim about transmission, effectiveness or any ablation.

| | |
|---|---|
| cohort (frozen at day 0) | camp0 18, camp1 13, camp2 15, camp3 16, **unknown 38** |
| known-cohort coverage | **62% of living people**; 37% of pair-events and 38% of offers had both camps known |
| contacts | 1338 pair-events over 776 unique pairs: greeting 1253, conversation 83, invitation 1, meal 1 |
| cross-camp contacts | **0** (within-camp 501; 837 pair-events had at least one unknown-cohort person) |
| belief offers | 335: news 322, warn 11, invite 1, recruit 1; `hall` and `ask_info` were never exercised |
| outcomes | inserted 79, refreshed 44, rejected 212; provenance-only 0, writes past an API refusal 0 |
| accepted (genuinely new or fresher) | 123 of 335 = 0.37 |
| cross-camp offers | 0 of 335, so the cross-accepted rate is **not estimable** |
| day-0 camp overlap | mean Jaccard 0.0208 over 6 of 6 valid pairs |
| retained told beliefs at day 0 | 0, so foreign-origin share and hops are **not estimable** |

Read with the plan's own rules: zero cross-camp contact in one day means the mechanism was **unexercised in that window**, not
that it cannot happen - the camps are about 44 tiles apart and nobody travelled on day 0. The two never-exercised channels
(`hall`, `ask_info`) are reported as no observations, not as zero rates.

**Every cross-camp figure above is qualified by its coverage, and the coverage is low.** Both camps were known for only 37% of
pair-events and 38% of offers, so "zero cross-camp contact" is a statement about that 37%, and the remaining 63% is not evidence
of anything either way. The runner prints the coverage beside each rate for exactly this reason.

**The cohort rule, and a limitation found by running it.** As implemented: at day 0 everyone is assigned to the camp their
household's home stands nearest to and frozen there. A person born later takes **their mother's** cohort - `parents[0]` by the
birth convention in `lifecycle.ts`, never the father's and never "whichever parent has a known one" - and an unknown mother
means an unknown child, with no fall back to the roof it was born under. A later entrant who is not a birth is assigned by the
same first-entry rule from its household's home, and frozen; an entrant with no such home is the separate `unknown` stratum.
`tests/stage4_metrics.test.ts` holds each of those cases, and the three that distinguish this rule from the looser one it
replaced fail against the looser one.

The limitation: that day-0 rule leaves **38 of 100 people unknown** in a Large world, because there are 38 households and only
22 lean-tos at day 0, so 16 households have no home yet. Those 38 appear in 837 of 1338 pair-events, which is most of the
contact data, and they are excluded from every camp-specific denominator.

**DECIDED (2026-10-22, option A):** each household is now assigned to the camp it was founded at, captured at the moment of
formation (`src/sim/cohortcapture.ts` — worldgen's initial households at the camp being laid out, later arrivals at the camp
they arrive at), and the day-0 cohort rule uses that founding camp first, falling back to the old nearest-home rule only for
a household that was never captured (a staged scene or a hand-built test world). The measurement still freezes the map at
day 0 and never re-assigns anybody; it still flags what it cannot know. Outputs are labelled **cohort v2**. The day-0
coverage in a Large world is now complete: all 100 founders are known, the 16 homeless households at their founding camp
rather than unknown, verified by `tests/stage4_cohort.test.ts` (which also holds the inertness contract: a world runs
identically with the capture on and off, to the last field).

The historical "all camps identical" rule is preserved. Its operational reading for this stage: every valid pair has `J = 1` at
terminal day 12 with complete coverage. Intermediate-day logs are not proof of the terminal state, and all-empty or unknown camps are
not identity. This operationalizes the measure; it does not rewrite the rule. Any replacement criterion would be a future proposal
only, and zero cross-camp transfers is not a new stop rule.

### Invariants and next milestone

Authored behavior is unconditionally unchanged; the diagnostics are inert; if built, the ablation is explicitly the intended rich
lab arm only. Golden, determinism and save contracts stay protected, with no re-record escape hatch for this stage. The next
milestone is separately authorized: instrumentation first, with focused inertness and delivery-coverage verification, then a small
contact-and-transfer pilot of existing behavior. No ensembles, code or runs are authorized here; a runtime estimate is deferred
until the run configuration and workload are fixed. No travel, trade or arrival feature is planned.

## Household food preparation: the mechanism works, the benefit is not shown (rules version 2, 24 seeds, normal, 2026-10-18)

The first behaviour added under a rules version. What it is and why it is built the way it is: `docs/RICH_WORLD.md`. What
follows is only the measurement.

**The question, the metrics and how a result would be read were fixed before either run** and are in `prep_out8/RUN.md`.
Two questions were kept apart: does the mechanism run on its own, and does it improve anything? Design: the same rules
(rich, rules version 2) on every arm, the same 24 seeds, profile `normal`, forked at day 0 - `control` (preparation on),
`rich-no-stock` (preparation off and nothing else), and `nudge:1`/`nudge:2` as the noise floor. Version 1 is deliberately
**not** an arm: an old-against-new comparison would attribute every difference between two generations to this one change.
Windows: 8 days, ending at the tick winter sets in (`prep_out8/`), and 12 days, through the whole of winter
(`prep_out12/`). Full-precision paired differences: `prep_out8/PAIRED.md` - the report rounds to one decimal and the hunger
numbers live below that.

| | control | no preparation | diff | 95% CI | of 24 seeds |
|---|---|---|---|---|---|
| preparations taken on (8 d) | 37.3 | 0 | -37.3 | [-39.6, -35.1] | 24 lower |
| of those, from the season / from hardship | 6.3 / 31.0 | 0 / 0 | | | |
| finished / given up (8 d) | 16.0 / 13.5 | 0 / 0 | | | |
| units of food really put into home stores (8 d) | 166.5 | 0 | -166.5 | [-183.2, -149.7] | 24 lower |
| **home-store food per person entering winter** | **1.62** | **0.83** | **-0.80** | **[-1.05, -0.54]** | **22 lower** |
| the same after winter (12 d) | 0.73 | 0.29 | -0.44 | [-0.66, -0.22] | 18 lower |
| hunger exposure (8 d) | 0.00303 | 0.00261 | -0.00043 | [-0.00156, +0.00071] | 8 lower, 8 higher |
| hunger exposure (12 d) | 0.00973 | 0.00882 | -0.00091 | [-0.00355, +0.00173] | 11 lower, 12 higher |
| person-days spent preparing (8 d / 12 d) | 8.1 / 12.4 | 0 / 0 | | | 24 lower |
| tool and repair projects STARTED (12 d) | 86.0 | 101.3 | +15.3 | [+12.2, +18.4] | 24 higher |
| projects finished, tools held, deaths, mean hunger, mood | | | | all straddle 0 | |

Every `diff` is **the arm minus `control`**, and `control` is the run WITH preparation enabled - so a negative
`homeFoodPerPerson` means the arm that has preparation removed ends with less food, and a positive `projectsAdopted`
means removing preparation raises project starts.

The nudge floor for `homeFoodPerPerson` is 0.04 to 0.16 with intervals of about +-0.3, and for `hungerExposure` 0.00024 to
0.00158 - so the food effect is far outside it and the hunger effect is exactly the size of it.

**What this establishes.** The mechanism runs without anybody being staged into it, by both cues, and it really moves food
into home stores: roughly double the food within a household's reach when winter arrives, in 22 of 24 seeds.

**What it does not establish, and this is the honest half.** No welfare benefit was measured. Hunger exposure,
critical-need counts, mean hunger, deaths and mood are all indistinguishable from chance in both windows. **Nothing here
says preparation prevents starvation**, and the reserve is about one day's eating against a four-day winter.

**And it does not establish WHY.** Reserve size, timing, access to the store at the moment of need, the work the
preparation displaces, low baseline hardship in these runs, and the resolution 24 seeds buy are all live explanations;
these runs separate none of them. Any of those could be tested by varying one thing with the rest held - the reserve
size alone, or the window alone - and no such test has been run. "No welfare benefit was demonstrated" is therefore the
whole of the claim; it is not "the feature does nothing", because it demonstrably moves food.

**What it costs.** About 3.6% of all person-time over eight days (3.8% over twelve), and 15.3 fewer tool and repair
projects started over 12 days, in every one of the 24 seeds. Projects finished and tools held did not move, so what the
time comes out of is the trying, not the finishing.

**The open question.** Whether a village that is actually short would benefit. The `town` profile (100 people in one camp,
which has a real famine in it) is where that could be answered; that run has not been made. The command is in `HANDOFF.md`.
A second null there would be consistent with every explanation listed above and would single out none of them.

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
  1. in rich dynamics, one workplace of each kind per ordinary camp's worth of founders, which gave a hundred people four storehouses
     where four camps of 25 had one each;
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

## Wolf defence with habitation (2026-10-20, branch evidence)

Version 4 integration: see docs/WOLF_DEFENCE.md and wolf_evidence/RUN.md. One 12-day Normal meadow
observation made two spears and began one rescue; the wolf left before an attempt. Separately, 40 staged
encounters produced 18 drive-offs and 22 failures. These establish an autonomous response and staged
resolution, not a village-wide survival benefit. No broad ensemble or acceptance baseline was replaced.
