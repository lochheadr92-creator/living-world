# What fixed worlds did before and after the work on them

This is a record of particular runs, not a claim about how the settlement behaves in general. It exists so the effect of the
changes can be seen against something fixed, and so anyone can repeat it. Two rounds of work are recorded: the one that added
workshops, tools, carts and kept promises (`before` → `after`), and the survival and legibility fixes that followed it
(`after` → `fixes`).

## How it was recorded

`scripts/baseline.ts` creates the world from the **default settings** for a seed (28 people, arrivals on, not harsh), steps it
for 72,000 ticks (30 simulated days) and writes, for every day, the population (children, elders, households, homeless),
the buildings, the stock of every item, food per head, the mean hunger/thirst/warmth, how many people were below critical,
the deaths and whether the ledger balanced — plus feed-event counters over the whole run, how many activities of each kind
started, and the state hash at the end.

```
npx vite-node scripts/baseline.ts <seed> [harsh] --out docs/baseline-<name>.json
npx vite-node scripts/compare_baseline.ts        # prints the tables below
```

* **Before** — `baseline-before.json` (meadow), `baseline-before-river.json`, `baseline-before-fern.json` — were recorded
  from the unmodified application before any change was made.
* **After** — `baseline-after.json`, `baseline-after-river.json`, `baseline-after-fern.json` — were recorded from the finished
  work, with the same seeds and settings. The hashes differ, as they must: the world is not the same world any more.
* Harsh-mode runs (`baseline-after-harsh-<seed>.json`) were recorded after the work only. A harsh baseline was not recorded
  beforehand, so there is nothing recorded to compare them with (see the note under "Harsh worlds").
* **Fixes** — `baseline-fixes.json`, `baseline-fixes-river.json`, `baseline-fixes-fern.json` and
  `baseline-fixes-harsh-{meadow,river}.json` — the same runs on the code after the survival and legibility fixes, compared with
  the `after` files in the next section.

## Survival and legibility fixes (`after` → `fixes`)

A later round of work, compared against the end of the one above. Its starting point is the `after` record: the code at the
start of this round reproduces those five runs to the hash (`1418981b`, `281ce8d6`, `92f9ebc6`, and harsh `c5d219fe`,
`6e7c4c9f`). `fixes` (`baseline-fixes*.json`) is the same five runs on the code as it now stands.

```
npx vite-node scripts/compare_baseline.ts after fixes meadow,river,fern,harsh-meadow,harsh-river   # the full tables
npx vite-node scripts/sweep.ts                                                                    # sixteen seeds
```

What changed in the simulation (the rules are in [`ECONOMY.md`](ECONOMY.md), "Eating and carrying"):

1. Eating at a store needs no room in the pack; a promised pickup makes room first; failure texts say what stopped someone.

| 30 days | meadow | river | fern | harsh meadow | harsh river |
|---|---|---|---|---|---|
| population, day 30 | 48 → 54 | 49 → 53 | 50 → 49 | 48 → 50 | 51 → 40 |
| deaths | 0 → 0 | 0 → 0 | 0 → 0 | 1 (thirst) → 0 | 0 → 0 |
| most below critical at once | 0 → 0 | 0 → 0 | 1 → 0 | 8 → 2 | 19 → 19 |
| lowest daily mean hunger / thirst | 53 / 50 → 64 / 65 | 53 / 56 → 62 / 65 | 63 / 66 → 62 / 59 | 49 / 44 → 56 / 44 | 47 / 47 → 47 / 47 |
| mean hunger / thirst over the month | 70 / 73 → 72 / 75 | 70 / 75 → 72 / 76 | 71 / 75 → 73 / 75 | 65 / 68 → 68 / 72 | 63 / 67 → 66 / 72 |
| food stored, day 30 | 1074 → 927 | 1167 → 1072 | 1077 → 1062 | 534 → 513 | 738 → 523 |
| promises kept / broken | 5 / 1 → 5 / 1 | 6 / 2 → 10 / 1 | 15 / 0 → 8 / 0 | 2 / 0 → 4 / 1 | 6 / 0 → 2 / 0 |
| arrivals / births | 11 / 4 → 10 / 6 | 10 / 6 → 10 / 6 | 10 / 4 → 11 / 2 | 11 / 3 → 10 / 2 | 11 / 0 → 9 / 1 |
| ledger balanced every day | yes → yes | yes → yes | yes → yes | yes → yes | yes → yes |
| final state hash | `1418981b` → `54044123` | `281ce8d6` → `298ecfe7` | `92f9ebc6` → `9c6cbdba` | `c5d219fe` → `b09d9864` | `6e7c4c9f` → `782a8fc1` |

### Measured directly

**Eating from a store**, every attempt over the same 30 days, before → after:

| 30 days | attempts | ended "no food there" with no room in the pack and food in the store | hunger then (median) | eaten straight from the store |
|---|---|---|---|---|
| meadow | 619 → 416 | 357 (58%) → 0 | 50 | 0 → 238 |
| river | 595 → 478 | 390 (66%) → 0 | 50 | 0 → 287 |
| fern | 597 → 326 | 325 (54%) → 0 | 46 | 0 → 95 |
| birch | 868 → 427 | 590 (68%) → 0 | 48 | 0 → 208 |

There are fewer attempts afterwards because an attempt no longer fails and is repeated: before, each failure wrote the store
off for 400 ticks and the person came back to fail again.

**Promises to bring water**, how they ended: meadow 1 interrupted, 1 broken → 2 kept; river 2 kept, 2 broken, 1 expired →
3 kept; fern 7 kept, 1 failed, 1 expired → 3 kept, 1 failed, 1 expired; birch 2 broken → 1 failed. Both broken ones in `birch`
had been made by people whose packs were full (an adult carrying five stones, a child carrying two pieces of wood), who walked
to the water and back about ten times each and were then judged to have done nothing. Afterwards the one that failed was kept
as far as it could be: the promiser put two pieces of wood down at home, fetched the water, and could not hand it over because
the asker's own pack was full, which is what the record says.

**Replays.** In harsh `ash` a child, Viktor, died of hunger on day 29.7 carrying a brick and a piece of wood (5 of 5), after 64
attempts to eat at stores that ended "there is no food there"; the nearest held 9 food, 2.1 tiles away. An elder, Quinn, died
the same way on day 39.8 carrying eight seeds and three wood (8 of 8), ten food 5.2 tiles away. The world was saved a few
days before each death under the old code (2.2 days before Viktor's; 4.8 and 3.2 days before Quinn's) and carried on under
the new: both were alive past the tick they had died at (Viktor ate 24 times straight from a store; Quinn 4 and 7 times from
the two saves), and the ledger balanced. The old code, carried on from the same save, reproduces Viktor's death to the tick.

**Sixteen seeds** (`scripts/sweep.ts`, 30 days each): before, two deaths: in `cedar` Una died of thirst on day 14.1, sealed in by
the quarry she had just marked out (a later change in this round is about that), and in `linden` one person died of old age. After, none,
and nobody sealed in; the population on day 30 averaged 49.1 before and 49.3 after. That `cedar` no longer loses Una is
chance: the world goes differently from the first days, and she never marks out that quarry.

### Reading the numbers

**Deaths.** None in the three ordinary worlds before or after, and none in sixteen ordinary seeds after (two before). In harsh
worlds people still die, as they did: across the sixteen seeds run harsh for 30 days, 8 people died before (3 of thirst, 3 to
wolves, 1 of exposure, and Viktor, below, of hunger) and 7 after (2 of thirst, 3 to wolves, 1 of injuries, 1 of exposure), none
of hunger, and the day-30 population averaged 45.6 before and 45.5 after. Every one of the new code's harsh deaths that was
traced (Sven and Tariq in `heath`, Theo and Tessa in `cedar`) is the same story as Faye's below: a thirsty person reaches the
water, a wolf comes, they run, come back, are driven off again, and die of thirst, cold or the wolf. None of their last
eighteen actions (about half a day) was eating from a store or making room for a promise. Which harsh run loses whom changes from version
to version because the whole world goes differently; I read the difference in counts as that churn rather than as an effect of
these changes, but sixteen runs cannot rule out a small effect either way.

**Hunger and thirst.** Averaged over the month, both rose in all five runs (hunger by 1.4 to 2.7 points, thirst by 0.4 to
5.7). The lowest single day's mean rose in `meadow` and `river`, and for hunger in harsh `meadow`; in `fern` it fell (hunger
63 → 62, thirst 66 → 59, on the last day only, with nobody below critical), and in harsh `river` it barely moved.

**Food in store** is lower on day 30 in every run (by 1% to 29%): food that had sat in stores next to people who could not take
it out is now eaten.

**Population.** Higher on day 30 in `meadow` (+6), `river` (+4) and harsh `meadow` (+2), lower in `fern` (−1) and harsh `river`
(−11). Nobody died in any of these five runs after; harsh `river` had fewer and smaller groups of arrivals (9 against 11), and
arrivals depend on food per head at the moment of a random draw. Over sixteen seeds the day-30 population is unchanged: 49.1
and 49.3 in ordinary worlds, 45.6 and 45.5 in harsh ones.

**Promises.** Broken promises of every kind, in the four worlds measured: 5 before, 2 after.

## The ordinary worlds, before and after

### meadow — 30 days, default settings

| | before | after |
|---|---|---|
| population, day 0 | 28 | 28 |
| population, day 10 | 33 | 32 |
| population, day 20 | 39 | 41 |
| population, day 30 | 48 | 48 |
| children / elders, day 30 | 13 / 2 | 15 / 2 |
| households / homeless, day 30 | 21 / 1 | 22 / 0 |
| deaths | 0 | 0 |
| most people ever below critical at once | 1 | 0 |
| lowest food per head | 16.7 | 16.7 |
| lowest mean hunger / thirst (100 = fine) | 58 / 59 | 53 / 50 |
| ledger balanced on every recorded day | true | true |
| buildings, day 30 | 1 fire, 14 hut, 20 lean to, 1 storehouse | 1 bakery, 1 fire, 1 granary, 1 hall, 3 house, 9 hut, 1 kiln, 22 lean to, 2 quarry, 1 smithy, 1 storehouse, 1 timber yard |
| final state hash | `f711531f` | `1418981b` |

| feed events counted over the run | before | after |
|---|---|---|
| abandoned | 1 | 0 |
| agreedToHelp | 27 | 9 |
| argued | 8 | 7 |
| arrivals | 11 | 11 |
| born | 2 | 4 |
| collapsed | 0 | 0 |
| couples | 1 | 0 |
| expecting | 4 | 5 |
| finished | 28 | 36 |
| gifts | 25 | 30 |
| madePeace | 6 | 1 |
| madeTool | 30 | 14 |
| markedOut | 29 | 41 |
| promiseBroken | 13 | 1 |
| promiseKept | 0 | 5 |
| promised | 5 | 21 |
| refused | 0 | 0 |
| repaired | 21 | 8 |
| swapped | 11 | 6 |
| warned | 36 | 51 |

### river — 30 days, default settings

| | before | after |
|---|---|---|
| population, day 0 | 28 | 28 |
| population, day 10 | 32 | 33 |
| population, day 20 | 39 | 40 |
| population, day 30 | 47 | 49 |
| children / elders, day 30 | 13 / 2 | 14 / 2 |
| households / homeless, day 30 | 21 / 0 | 20 / 1 |
| deaths | 0 | 0 |
| most people ever below critical at once | 0 | 0 |
| lowest food per head | 16.4 | 16.5 |
| lowest mean hunger / thirst (100 = fine) | 62 / 57 | 53 / 56 |
| ledger balanced on every recorded day | true | true |
| buildings, day 30 | 1 fire, 11 hut, 21 lean to, 1 storehouse | 1 bakery, 1 fire, 1 granary, 1 hall, 3 house, 10 hut, 1 kiln, 19 lean to, 1 quarry, 1 smithy, 1 storehouse, 1 timber yard |
| final state hash | `9b8e61d0` | `281ce8d6` |

| feed events counted over the run | before | after |
|---|---|---|
| abandoned | 1 | 0 |
| agreedToHelp | 16 | 13 |
| argued | 9 | 7 |
| arrivals | 9 | 10 |
| born | 4 | 6 |
| collapsed | 0 | 1 |
| couples | 0 | 2 |
| expecting | 5 | 7 |
| finished | 26 | 34 |
| gifts | 22 | 23 |
| madePeace | 11 | 5 |
| madeTool | 34 | 21 |
| markedOut | 28 | 41 |
| promiseBroken | 12 | 2 |
| promiseKept | 1 | 6 |
| promised | 5 | 18 |
| refused | 0 | 0 |
| repaired | 17 | 16 |
| swapped | 17 | 3 |
| warned | 47 | 37 |

### fern — 30 days, default settings

| | before | after |
|---|---|---|
| population, day 0 | 28 | 28 |
| population, day 10 | 31 | 30 |
| population, day 20 | 38 | 39 |
| population, day 30 | 45 | 50 |
| children / elders, day 30 | 10 / 2 | 13 / 2 |
| households / homeless, day 30 | 21 / 0 | 22 / 1 |
| deaths | 0 | 0 |
| most people ever below critical at once | 0 | 1 |
| lowest food per head | 16.6 | 17.0 |
| lowest mean hunger / thirst (100 = fine) | 66 / 65 | 63 / 67 |
| ledger balanced on every recorded day | true | true |
| buildings, day 30 | 1 fire, 10 hut, 22 lean to, 1 storehouse | 1 bakery, 1 fire, 1 granary, 1 hall, 2 house, 10 hut, 1 kiln, 22 lean to, 1 quarry, 1 smithy, 1 storehouse, 1 timber yard |
| final state hash | `30150a48` | `92f9ebc6` |

| feed events counted over the run | before | after |
|---|---|---|
| abandoned | 1 | 0 |
| agreedToHelp | 15 | 13 |
| argued | 7 | 20 |
| arrivals | 10 | 10 |
| born | 3 | 4 |
| collapsed | 0 | 0 |
| couples | 2 | 1 |
| expecting | 4 | 4 |
| finished | 25 | 34 |
| gifts | 32 | 39 |
| madePeace | 7 | 7 |
| madeTool | 30 | 24 |
| markedOut | 28 | 40 |
| promiseBroken | 7 | 0 |
| promiseKept | 0 | 15 |
| promised | 5 | 16 |
| refused | 0 | 0 |
| repaired | 19 | 10 |
| swapped | 15 | 9 |
| warned | 56 | 58 |

## Reading the numbers

**Population and deaths.** Nobody died in any of the three ordinary worlds, before or after. Population on day 30 is within
five people either way (48/48, 47/49, 45/50), with a few more children after. On one recorded day one person was below a
critical need — in `meadow` before, and in `fern` after — and in no other run; nobody died of it.

**Food in store.** Food per head on day 30 is roughly a third lower after (about 22–24 against 31–34). That is the grain,
flour and bread now spoiling in ordinary stores and heaps (they did not before; the granary exists to slow it) and a few
more mouths at shared meals — an intended rule change, not a loss of supply. Mean hunger and thirst are no worse over the
month: the lowest daily means dipped a few points in `meadow` and `river` (53 and 50, 53 and 56, against 58 and 59, 62 and 57),
each a single day, and the every-third-day trajectories look alike.

**Promises.** Before, promises were made (5 in 30 days) and almost none were kept (0–1 kept, 7–13 broken). The causes were
traced rather than guessed: deadlines too short for the walk (1200–1400 ticks, no allowance for sleeping or seeing to
survival), a promise to bring materials to a site that was delivered to the *person* (whose pack was full) instead of the
site, promises made for stock the promiser could not obtain, no cap on helpers per site, and no way for a promise to end
other than "kept" or "broken". After: 16–21 made, 5–15 kept, 0–2 broken, the rest ending in their own recorded ways.

**Quarrels and peace.** Quarrels are about as frequent in `meadow` and `river` and more so in `fern` (7 → 20: more people
after the same scarce thing in a busier settlement). A separate check of the three worlds found that no pair quarrelled twice in
the 30 days and none quarrelled within 0.6 day of making up. "made peace" counts apologies only; most quarrels now end by
fading with time or a gift, and the feed says so ("are on good terms again") — an event that did not exist before.

**Help, swaps, repairs, tools.** `agreedToHelp` (15–27 → 9–13) fell because people are no longer recruited to a site that has no
use for another pair of hands; `swapped` (11–17 → 3–9) because a swap is declined, not attempted, when either pack cannot
take what it would be given; `madeTool` (30–34 → 14–24) because tools now wear, break and are mended, and a person
wants one of each kind and not more; `repaired` (17–21 → 8–16) because the same hands have more to do. These are my reading of
the causes, not measurements of them.

**Buildings.** Day-30 settlements before: a fire, huts, lean-tos, a storehouse. After: also a timber yard, a quarry or two,
a kiln, a granary, a bakery, a hall, a smithy, and two or three huts already rebuilt as houses. None was guaranteed; each was
laid out by somebody who knew the ingredients (`docs/ECONOMY.md`, "What drives work").

## Harsh worlds (after only)

`Harsh` makes food scarcer, the weather colder, wolves more numerous and births fewer.

| seed | population day 0 → 10 → 20 → 30 | deaths | most below critical on one day | lowest food per head | ledger balanced every day | hash |
|---|---|---|---|---|---|---|
| meadow | 28 → 32 → 39 → 48 | Faye (thirst, day 9) | 8 | 10.8 | yes | `c5d219fe` |
| river | 28 → 34 → 41 → 51 | none | 19 | 10.8 | yes | `6e7c4c9f` |
| fern | 28 → 31 → 35 → 41 | none | 10 | 10.9 | yes | `1c6d4c15` |
| aspen | 28 → 30 → 36 → 42 | none | 7 | 11.9 | yes | `02418286` |

**The one death, traced.** Faye (harsh `meadow`, thirst, day 9) set out at 13:12 to look for timber with her thirst at 66 —
the survival check passes work that leaves water within reach — and reached the east shore. At 17:12 a wolf found her. She ran
from it, tried to drink several times, was driven off each time, ran on through the night (thirst at 0 from about 02:00, and
energy and warmth gone too), and died at 06:47 on her way back to the water. Her death is the wolf's, the dark's and the distance's; nothing in
the new rules sent her there. The old build also lost someone in this same harsh world to a wolf (from notes made during
development; the earlier harsh runs were not recorded as files, so that is a recollection and not a record). It is a reason to
think harsh mode should stay harsh.

## Longer runs (not part of the baseline)

These were run on the final code to see whether anything changes beyond the first month. They are single runs.

| seed | length | deaths | population at the end | notes |
|---|---|---|---|---|
| meadow | 100 days | 0 | — | `scripts/death.ts` |
| river | 100 days | 0 | — | `scripts/death.ts` |
| fern | 100 days | 0 | — | `scripts/death.ts` |
| meadow | 120 days | 0 | 65 | smithy built, no iron forged; no cart built |
| river | 120 days | 0 | 63 | first iron axe by day 50, two by day 120; no cart built |

`scripts/invariants.ts` also audited 25–40-day runs of `meadow`, `river`, `fern` and `aspen` — and 25 days of harsh `meadow` and
`river` — checking the books, tool records, claims, promises, carts and meal tables every 300 ticks. Nothing was violated.

## What changed on purpose

See "Rule changes made on purpose" in [`ECONOMY.md`](ECONOMY.md). The ones that show up above: grain, flour and bread spoil;
promise deadlines are longer and exclude sleep and survival time, with six distinct endings; trades and recruiting are
declined when pointless; work is held back when it would strand someone from water; tools wear; there are workplaces to
build and chains to run.

## What this does not show

* That the settlement is stable over the long term. Three seeds for 30 days, and a handful of longer runs, are what was run.
* That the changes did not shift the odds of a death in worlds that were not run. Harsh worlds in particular lose a person
  now and then, before and after.
* That any given workplace or tool will appear in a given world: which of them do, and when, varies from seed to seed.
