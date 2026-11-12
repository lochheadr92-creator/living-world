# Lean years: rules 220

Predecessor rules 216 is pinned by `tests/v216_continuation.expected.json`. Stream: seasons (`docs/RULES_RANGES.md`, 220 to 224; 217 to 219 were
claimed by the childhood stream and stay unused). Origin: the owner's instruction of 12 November 2026, after reading the 60-day runs and the aspen
trace below: "change it so it's kind of like our La Nina and El Nino seasons, like one every 2 or 3 years, so it can happen but it's not a regular
occurrence".

## What was wrong (measured at rules 216)

Read in source: a year is 12 days and its last 4 are winter (`constants.ts DAYS_PER_YEAR`, `hardship.ts WINTER_LENGTH`). A lean season could begin
on any day with one chance in five when no hardship was under way, lasted three to six days and cut wild regrowth to a tenth; winter cuts regrowth
again, to as little as 0.4, so 0.04 together. The roll is a hash of the seed and the day, not the world's random stream, so every branch of a seed
has the same calendar.

- **Calendar** (`scripts/hardship_calendar.ts --rules 216`, `review_evidence/seasons-20261112/calendars.txt`): in 60 days the twelve lab seeds had
  four to seven lean seasons each, 20 to 34 lean days, and a lean season running in most winters.
- **Two 60-day labs at rules 216** (12 seeds, Normal, fork 0; `review_evidence/seasons-20261112/r216-60d`, `r216-60d-noarrivals`): the mean
  settlement ended below its 28 founders (25.3 with arrivals, 24.3 without), deaths ran at about 0.14 a day to day 25 and 0.28 a day after, and
  all three aspen branches with arrivals grew to 39 to 43 people and starved between days 56 and 60.
- **The aspen trace** (`scripts/hardship_trace.ts`, 72 days; it reproduces the lab control exactly, day-60 hash `986ac60c`;
  `review_evidence/seasons-20261112/aspen-trace/`): lean seasons on days 52 to 54, 56 to 58 and 60 to 62 across the fifth winter; the whole map
  holds at most 598 units of wild food and 39 people eat 100 to 117 a day; wild food fell from 358 to 30 and stores from 177 to 31 in a week, and
  30 people died in five days. Without arrivals the same famine came three days later (29 to 21 people). With lean and dry seasons cleared as
  they were declared, the same world lost nobody in 72 days, with or without arrivals; with every stake off it grew to 59.

## The rule (rules 220, rich worlds)

`src/sim/lean_years.ts`, read by `hardship.ts updateHardship`. One switched part, `rare`.

- A world has **lean years**, fixed by its seed. The first is the world's second or third year; each one after comes two or three years later
  (`isLeanYear`, a walk from the start with a gap of `LEAN_GAP_MIN` to `LEAN_GAP_MAX` years drawn from the seed's hash).
- In a lean year **one lean season begins**, on one of the eight days of the year before winter sets in (`leanStartDay`), and runs its three to six
  days as before. One that begins late in the year therefore still runs into the winter.
- **No dry spell begins in a lean year.** In every other year no lean season begins, and a dry spell may, as before.
- A hardship that ends on the very morning a lean season is due no longer swallows it.

Not changed: what a lean season does once begun (regrowth at a tenth, crops at a quarter, the thought, the feed line), its length, dry spells in
other years, winter, spoilage, wolves. Nothing new is saved; a loaded world reaches the same calendar. Rules 216 and earlier, authored worlds and
`setLeanYears(false)` keep the daily roll.

The calendar at rules 220 (`calendars.txt`): one or two lean seasons in 60 days in every lab seed, 4 to 11 lean days; over 720 days 22 to 25 lean
seasons a seed, one every two and a half years, and the land lean on about one day in six instead of four to six in ten. Dry spells come a little
more often than before (4.8 dry days in 60 against 2.9), because a lean season no longer happens to be under way when a dry spell could begin.

Lab: `rich-no-lean-years` (the daily roll back, equal to rules 216), `rich-no-lean-seasons` (a diagnostic, not a rules version: no lean season
ever begins, at any version; `setLeanSeasons`), counters `leanDays` and `dryDays`.

## Checks

- Contract tests `tests/lean_years.test.ts` (12), each with the rules-216 contrast where there is one: the calendar's gaps and start days for all
  twelve lab seeds; one season in each lean year on its day and nowhere else; no dry spell in a lean year; the season itself unchanged; the
  switches; authored and unversioned worlds untouched; save and load.
- Ordinary contrast: Normal aspen on the morning of day 3 is in a lean season at rules 216 and in none at rules 220.
- Immutable pin `tests/v220_continuation.*` (Normal aspen, arrivals on, tick 7,300, then 120 after a save and load), recorded from a clean
  checkout of `6211164d`.
- In 274 related test files, 57 failures, all already in the rules-208 full-suite list; the pins of rules 200 to 216 pass unchanged. Typecheck
  passes. The full suite has not been run (not since the rules-208 head).

## Measured (12 seeds, Normal, fork 0, 60 days, arrivals on)

Lab from a clean checkout of `6211164d`, 60 arms in 50 minutes; `review_evidence/seasons-20261112/r220-60d/report.txt`. The reference is rules 220
(the control and two one-draw nudges); each arm is compared with it, paired by seed.

| | daily roll (as rules 216) | **rules 220** | no lean season at all |
|---|---|---|---|
| lean days in 60 | 25.7 | **7.4** | 0 |
| people at day 60 (28 founders) | 26.0 | **34.5** | 41.9 |
| deaths | 13.5 | **7.7** | 1.0 |
| of hunger / exposure | 4.9 / 3.8 | **2.0 / 2.7** | 0 / 0.3 |
| family time | 170 | **224** | 285 |
| child play | 244 | **320** | 409 |
| evenings by the fire / stories told | 82 / 21 | **112 / 38** | 130 / 47 |
| meals eaten from a store | 496 | **655** | 797 |
| first timber yard (day) | 15.5 | **11.3** | 12.1 |
| wolf bites | 52 | **36** | 28 |

Against the daily roll, larger than chance: people (+8.5, interval 4.3 to 13.3, 10 of 12 seeds), deaths (-5.8, 1.4 to 10.6, 11 of 12), the first
yard four days sooner, family time, evenings by the fire, stories, meals from a store, wolf bites, and the share of waking time hungry (lower in 11
of 12). Systematic inside the noise floor: buildings, solid homes, plots, projects done, child play, hunger deaths. Not distinguishable: mood,
tools, chats, workplace jobs. The mean settlement now grows through the run (28 founders, 32 by day 20, 35 by day 55) where it used to shrink.

The lean season still costs lives when it comes: against no lean season at all, rules 220 has 6.7 more deaths and 7.4 fewer people, both larger
than chance. Aspen at rules 220 (trace, 72 days): 43 people and one death; in its second lean season the stores emptied and 25 of 38 were
critically hungry on day 54, and nobody died.

## What is left

- **A lean season that runs into winter is where the remaining losses are.** Of the twelve seeds, seven have a lean season running into a winter
  inside 60 days (birch, cedar, fern, gen-1, gen-5, meadow, river) and five do not. Over the control and nudges the first group averages 11.5
  deaths a run and the second 2.3; nine of the ten falls of eight or more people in three days are in the first group, most of them by exposure
  as well as hunger. This is a comparison between seeds, not an arm. Keeping a lean season clear of winter would be a further rules version; it
  is the owner's decision.
- One meadow run (nudge:2) lost 32 people to thirst from day 28, with no hardship under way; not looked into.
- No run builds a hall inside 60 days (two of 36 reach one at rules 220, none before); carts, exchange between households and apprentices are
  still absent.
- Only the Normal profile and 60 days were measured here; no Large run. A generation (240 days, both with and without arrivals) was run
  afterwards: `docs/GENERATION_RUN.md`.
