# What a fixed ordinary world did before and after this work

This is a record of particular runs, not a claim about how the settlement behaves in general. It exists so the effect of the
changes can be seen against something fixed, and so anyone can repeat it.

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

## Runs after this record

Everything above was recorded from the first version of this work. The additions made since — workshop goods held for the site
they were ordered for, a fishing rod and a smokehouse, a well, a fix to making tools, and a spear — change every world after its
first few days (the state hashes differ), and the files above were **not** re-recorded. What each addition did, measured on the
same seeds with the same tools, is in "Rule changes made on purpose" in [`ECONOMY.md`](ECONOMY.md); to compare a world now with
these records, record it again with `scripts/baseline.ts`. What follows compares the original code with the code as it now
stands. Every run is a single run of its seed.

### Sixteen ordinary worlds, 30 days

`scripts/baseline.ts <seed>` and `scripts/wolfwatch.ts <seed> 30` on sixteen seeds (the four named ones and twelve others),
original against everything above:

| per world, mean | original | now |
|---|---:|---:|
| people at day 30 | 49.6 | 48.1 |
| houses | 2.0 | 2.9 |
| buildings of every kind | 42.5 | 45.6 |
| building projects finished | 35.3 | 38.1 |
| tools made | 20.9 | 34.2 |
| promises kept | 6.8 | 12.7 |
| wolf bites | 7.3 | 4.8 |
| runs away from a wolf (flee activities begun) | 258 | 294 |
| children born | 4.7 | 3.6 |
| deaths | 0 in 16 worlds | 1 in 16 worlds (a wolf attack, day 12, `k6`) |

The books balanced at every daily sample of all thirty-two runs. A well was standing in every one of the sixteen worlds by day
7–23 and a smokehouse by day 9–18. The paired differences that are larger than their noise (ten or more of sixteen seeds moving
the same way): more buildings (13 of 16; the well and the smokehouse are two of them), more projects finished (11 of 13 that
changed), more runs from wolves (13 of 16, t ≈ 2.0). Wolf bites were lower in 8 of 16 worlds and higher in 5 (116 in all, then
77; t ≈ −1.5): not a measured effect. The fall in births (9 of 16 worlds lower, 4.7 to 3.6 a world, t ≈ −2.3) has no cause I
could find: couples formed at the same rate (12 and 11 in all) and arrivals are not affected. Nine differences were looked at,
so one of that size is not surprising by chance.

### Ten harsh worlds, 40 days

`scripts/wolfwatch.ts <seed> 40 harsh` for ten seeds on the original code, after the first addition (workshop claims), after the
second (rod and smokehouse), and on the code as it now stands. Each cell is the number of wolf bites in the run, with the cause
of any death that was not old age in brackets.

| seed | original | + claims | + rod, smokehouse | now |
|---|---:|---:|---:|---:|
| meadow | 17 (thirst) | 15 | 19 (thirst) | 8 |
| river | 7 | 16 | 29 (thirst, thirst) | 24 (exposure) |
| fern | 12 | 11 | 23 | 17 |
| aspen | 21 | 19 | 19 (wolf) | 15 |
| x1 | 27 | 45 (wolf) | 50 (wolf, exposure) | 16 |
| x2 | 20 | 18 | 44 | 9 |
| x3 | 17 | 26 (wolf) | 31 (wolf) | 12 |
| s4 | 7 | 12 | 21 (wolf) | 6 |
| h1 | 15 | 19 | 20 | 11 |
| h2 | 32 | 29 (exposure) | 19 (injuries) | 15 |
| **mean** | **17.5** | **21.0** | **27.5** | **13.3** |
| runs with a death that was not old age | 1 | 3 | 7 | 1 |

These are single runs, and small changes move every trajectory in a harsh world (the original alone ranges from 7 to 32 bites
between seeds), so the means are not precise. The table shows a pattern, not a cause. The two intermediate trees did worse than
the original on both counts: the second had more bites in 8 of the 10 seeds (mean +10.0, standard error 3.8) and a death that
was not old age in seven of the ten runs (thirst three times, wolves four, exposure, injuries). The code as it now stands had
fewer bites than the second in all ten seeds (mean −14.2) and than the original in eight (mean −4.2, standard error 3.0), and
one such death.

The well accounts for much of that. The same code in a copy where nobody ever wants a well had 19.1 bites a run, more than with
the well in 9 of 10 seeds (mean +5.8, standard error 2.4), and a death that was not old age in six of the ten runs (hunger
twice, wolves twice, exposure, thirst). So in harsh worlds this branch is as safe as the original because of the well, and I did
not find what made the intermediate trees less safe. It was not the time people spent far from the camp (similar in the two
seeds measured). With the rod left out of the second tree, the two seeds tried had 16 and 17 bites, and with the smokehouse left
out 31 and 20, against 29 and 44 with both and 7 and 20 in the original; two seeds say little. In the code as it now stands,
with rods never wanted at all, the ten seeds had 17.4 bites a run (more than with rods in 6 of 10 seeds; mean +4.1, standard
error 4.2) and two runs with a death that was not old age, so the rod is not what makes the difference there. Every bite in
these runs happens while somebody is running from a wolf, more than nine tiles from the camp, mostly in the evening and at
night. Anyone bisecting this branch in harsh mode will land on commits that are worse than the original. A harsh world is not
the default one.

### Saves

Three saves made by the original code (ordinary `meadow` on day 7, ordinary `river` on day 12, harsh `fern` on day 15) were
loaded by the code as it now stands and played on for eight more days each. They load, people carry on (30 to 38, 35 to 41, 32
to 36), the books and the tool records balance, a well was built in each, and a smokehouse in two.

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
