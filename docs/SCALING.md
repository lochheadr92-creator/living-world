# Scaling: how to measure it, and what is known so far

The ordinary world is small on purpose (80×80 tiles, 28 founders, roughly 60 people at most). This document is for finding out what
happens beyond that — where the real simulation slows down, runs out of room, or stops behaving sensibly — without guessing.
It records the tools, the measurements taken so far, and the places where the current rules assume a small settlement.

Nothing here changes how the simulation behaves.

## Tools

### Golden fingerprints — "did the ordinary world change?"

`tests/golden.test.ts` compares the ordinary world with fingerprints recorded in `tests/golden.expected.json`: generation only for twelve
seeds, and stepped runs (up to 12,000 ticks) for default, harsh, larger-population and staged-scene worlds. Two fingerprints are taken at each
checkpoint: `hashWorld` (the compact state hash used elsewhere) and a *deep* hash of everything the game would save — terrain, every
belief, every relation, ids. The deep hash is taken of the text that save format 3 wrote, produced by the test helper itself
(`tests/helpers/golden.ts`), not by `src/app/save.ts`: the fingerprints are of the world's content, so improving how a save is stored
does not move them (format 4 did not; `tests/save.test.ts` holds the save itself).

* A mismatch means the ordinary world is no longer what it was. If that was the intent, regenerate with
  `npx vite-node scripts/golden.ts --write` and say why in the commit. If it was not the intent, the mismatch is the finding.
* `npx vite-node scripts/golden.ts` (no flag) prints the same comparison outside the test runner.
* The fingerprints depend on the JavaScript engine's floating-point behaviour (`Math.sin`, `Math.sqrt`, …). They were recorded on Node 22;
  a different engine may legitimately differ. (The simulation's distances use `hyp()` in `util.ts`, a bit-identical copy of V8's two-argument
  `Math.hypot` that does not allocate; `tests/hypot.test.ts` compares the two over 3.2 million inputs.)

### Work counters

`src/sim/probe.ts` holds plain integer counters that the simulation increments and never reads: path searches, tiles expanded, searches that
returned null — split into **unreachable** (the open set emptied: nothing the walker can reach satisfies the goal) and **out of budget** (it
gave up after 7,000 tiles with tiles still to try) — option generations, options generated, decisions, reviews, perceive calls and what they
saw. Beside them, tables keyed by **who asked** (an activity kind, or `wolf`, `cart_haul`, `arrival`) and by the straight-line **distance** to
the target (under 20, 20–40, 40–80, over 80 tiles), and a count of **why each `wander` was chosen**. They are off by default (one boolean test
each), are not part of the world, a save or the state hash, use no randomness and read no clock. `tests/probe.test.ts` holds that: a run with
them on has the same fingerprint as a run with them off.

`probe.verify` (bench `--verify`) repeats every search that ran out of budget with no practical budget, discards the answer, and counts it as
*reachable after all* or *unreachable*: "out of budget" alone cannot tell a far goal from one that cannot be reached at all.

Wall-clock time is never measured inside the simulation. It is measured around it, by the runner below, or by a profiler.

### Benchmark runner

```
npx vite-node scripts/bench.ts -- --days 10 --seed meadow
npx vite-node scripts/bench.ts -- --days 3 --pop 100 --arrivals off --out /tmp/pop100.json
node --cpu-prof --cpu-prof-dir=/tmp/prof node_modules/vite-node/dist/cli.mjs scripts/bench.ts -- --days 10     # function-level profile
```

It runs the real simulation and, every `--sample` ticks (default 240, a tenth of a day), records: milliseconds per tick (mean, 95th percentile,
worst), population, children, elders, households, homeless people, buildings by type, sites, plots, tools, carts, sources, busy people,
conversations, requests (and how many are still pending), reservations, events, meals, `nextId`, deaths, food per head, mean hunger and thirst,
people below a critical need, beliefs (total and largest), relations, remembered whereabouts, heap size, and the work counters per tick.
Every `--check` ticks (default 2400) it verifies the item ledger, the tool records, and that `nextId` is still below the range reserved for
water-belief ids; any failure is printed, listed in the summary, and makes the exit code 1. The summary also lists the tick at which each type
of building first existed (to the sample resolution) and how many activities of each kind were started.

Further switches: `--verify` (above); `--slow MS` lists every tick over MS with its place in the day, the process's *CPU* time during it
(`process.cpuUsage`: a tick that used far less CPU than wall time was waiting for a core, not computing), the change in the work counters, and
the gaps between slow ticks. **Arrivals are on by default** (`--arrivals off` for the figures in this document, which were taken with them off).

Use a quiet machine. The ledger pass is O(world); raise `--check` for very large worlds. Run each world size in its own process (the path-finder
reallocates its buffers when the map size changes). **A shared machine ruins wall-clock figures**: on this one the same Huge seed ran at 22 and
37 ms a tick in two runs, and a loaded run showed 149 "slow" ticks of which 117 were the process waiting for a core. Claims here rest on
counters (searches, tiles, bytes allocated, collections) or on alternating runs with the spread reported.

### Other tools

| script | what it answers |
|---|---|
| `scripts/savesize.ts` | where the bytes of a save go, by field, in the current format and the one before |
| `scripts/slowtick.ts` | replays a seed to just before one tick and runs that tick under the CPU profiler |
| `scripts/allocs.ts` | where the garbage comes from: bytes allocated by function over a stretch of ticks (V8's sampling heap profiler) |
| `scripts/campclock.ts` | when each camp first gets each workplace; what each has; how many adults want the next one; the hut-to-house gates |
| `scripts/growth.ts` | births, deaths and arrivals per day, and the first condition that keeps each woman from being with child |
| `scripts/contact.ts` | whether the camps of a larger world ever meet: how far people go, what they know of other camps, cross-camp relations and talks |
| `scripts/regions.ts` | a larger world camp by camp at tick 0 |

## Rule sets — the limits on settlement size

Several limits are written for a village: immigration stops at 54 people, conception above 64, only four building sites may be open at
once, and there is one timber yard, kiln, smithy, bakery, granary, hall and storehouse in the whole world. `src/sim/rules.ts` gathers them.

* **ordinary** (the default; `settings.ruleSet` absent) — the original numbers, to the digit. The ordinary world, saves made before the
  setting existed, and every staged scene use these. `tests/golden.test.ts` holds that nothing about the ordinary world moved.
* **scaled** (`settings.ruleSet: 'scaled'`, or `--rules scaled` in the benchmark runner) — the same limits as ratios of the founding
  population, never below the ordinary value:
  * *population limits* (immigration, conception, the size of arriving groups, the population at which a third project is allowed) scale with
    all the founders: at 100 founders 193 / 229 / 200 / 196, at 250 founders 482 / 571 / 500 / 491;
  * *building limits* (open home/fire/storehouse sites, open sites in total, improvement projects) scale with one settlement's founders:
    at 100, 14 / 14 / 7 (11 once large); at 250, 36 / 36 / 18 (27 once large);
  * *locality* — one of each workplace, and the count of open sites, apply **within 40 tiles** of where the new one would stand. A
    workplace on the far side of the map does not block a new one, and is not counted as a means the planner can build on.
  Scaled rules at 28 founders are the ordinary limits made local.

One thing is deliberately not changed: a household still has one site open at a time, because that limits a household, not a settlement.

## Settlements

The ordinary world has one camp, `world.camp`, and much of the code is written in terms of "the camp". `src/sim/settlements.ts` makes each
of those mean *the settlement nearest to where this is happening*. The camp stays settlement 0; further settlements, if a world has any, are
in the optional `world.extraSettlements`, which an ordinary world does not have (so its saves, state hash and behaviour are exactly as before:
every lookup returns `world.camp` itself, and `tests/golden.test.ts` holds that).

What follows the nearest settlement:

* where workshops, the granary, the hall and the storehouse are laid out (around the planner's own settlement; a quarry at the outcrop nearest to it);
* where a person with no home puts their base, their first field, their exploring and their idle wandering;
* where travellers head when they arrive (the settlement nearest the edge they come in at, and the camp fire nearest it), and the shore they are told about;
* which way wolves prowl at night (toward the settlement nearest their den);
* what "near camp" and "a long way north of camp" mean when people tell each other where things are, and which news counts as far away;
* where new saplings may not seed (near any settlement).

What still uses the original camp only: the position of weather events in the feed, the camera's "home" key and starting position, the
decorative critters, and the staged scenes. The generator makes more than one settlement for the larger worlds below.

## Larger worlds: `large` and `huge`

`settings.profile` (built by `settingsForProfile` in `src/sim/profiles.ts`) makes a bigger map founded in several places at once. They
start from scratch like the ordinary world — people, a fire, a few lean-tos, a little food, a handful of tools — and nothing is built or
made for them. Each camp is laid out by the ordinary camp's own recipe (its lake and ponds, berries, fruit, grain, rock, fish, clay, ore and
outcrops, wolves, fire, founders and tools), scaled to the number of people in it; founders know their own camp and its people and nothing
of the others.

| | map | founders | camps | camp spacing |
|---|---|---|---|---|
| `large` | 160×160 | 100 | 4 of 25 | about 44 tiles: one region whose camps can meet in the first days |
| `huge` | 256×256 | 250 | 6 of about 42 | about 80 tiles: separate communities |

* Both run under the scaled rule set with one camp's founders as the size of a settlement (`settlementFounders`): at 42, six open home
  sites, three projects, and one of each workplace per settlement. Population limits follow all the founders (at 250: immigration to 482,
  conception to 571).
* `--pop N` splits N founders among the camps, so a world can be run smaller or larger on the same map.
* A camp of about 28 people has one fire; a larger camp has one for about every 28.
* Per-camp quantities (food, rock, fish, clay, ore, outcrops, wolves, tools, the mix of ages) scale with the camp's founders against the
  ordinary 28. The ordinary world is exactly one camp of scale 1, which is why it generates exactly as before (`tests/golden.test.ts`).
* Nothing forces the camps to meet, trade or merge, and nothing prevents it. The camps are connected on foot for the seeds checked.

Look at one before running it: `npx vite-node scripts/regions.ts -- --profile huge --seed meadow` prints, for each camp, its people, roofs,
fires, what lies within reach, the nearest shore and wolf den, the walking route to every other camp, and a check that nobody knows another
camp. Run it: `npx vite-node scripts/bench.ts -- --profile huge --days 3`.

To watch one in the app, open the world menu (the seed chip) and pick a size under *World size*: **Village** (the ordinary world),
**Large** or **Huge**. The choice applies to the next *New world* (and to the *Natural world* scene button), is remembered in the browser's
preferences, and the menu says which size the current world is. The other staged scenes are small hand-built tests and always use the
ordinary rules. A Huge world takes a moment to build, so the button shows "Building the world…" first.

**Saving a Huge world.** The first version kept a save in `localStorage` (about 5 million characters, shared with the preferences), and a Huge
world's save outgrew that by about day 4–5. Measured on seed `meadow`, 250 people, no arrivals; "stored" is gzip then base64, counted in
characters (`scripts/savesize.ts`, which prints the breakdown by field):

| stored MB | day 0 | day 1 | day 3 | day 5 | day 10 |
|---|---|---|---|---|---|
| format 3 (the first version) | 2.49 | 3.93 | 4.93 | 5.46 | 6.33 |
| format 4 (compact), as base64 | 1.03 | 1.97 | 2.55 | 3.01 | 3.65 |
| format 4, as the bytes IndexedDB holds | | 1.48 | 1.91 | 2.26 | 2.74 |

Where the bytes went (measured, not guessed): the per-person `explored` masks are 64% of the *JSON* at the start (21.9 of 34.2 MB) but only
about 4% of the *stored* size, because they compress to almost nothing. What fills a save as the world runs is `persons.beliefs` (35% of the
stored size at day 3: 68,000 beliefs, none ever forgotten), then `relations`, `whereabouts` and the event `log`. The second cause was gzip
itself: it only looks 32 KB back, so a save written person by person never puts two people's similar records in one window.

What format 4 changed (version 3 saves are still read): masks as run lengths; people written field by field (all beliefs together, all
relations together), which alone took day 3 from 4.63 to 3.31 MB; beliefs as `[shape, values…]` rows with the key names kept once. A save is
now a single IndexedDB record (the settings and the gzip bytes), with `localStorage` kept for a short description (so the menu can say what is
saved without waiting), as a fallback where IndexedDB is missing or refuses the write, and as the home of every save made before. The target of
"under 3 MB stored at day 5" was reached only to within a hair (3.01 MB, as base64): growth continues (beliefs are never forgotten), so the
compact format is not what makes a long Huge world saveable; IndexedDB is. At day 10 the raw bytes are 2.74 MB against a browser quota of
hundreds of MB. `tests/save.test.ts` holds the round trips (hash and deep hash, then 100 further ticks, for ordinary, Large and Huge, and
from a version-3 text); `tests/save_storage.test.ts` holds the storage rules.

The same worlds can be started from the browser console (the app's game is `__game`):

```js
__game.restart({ population: 250, profile: 'huge', ruleSet: 'scaled', settlementFounders: 42 })    // 6 camps, 256×256
__game.restart({ population: 100, profile: 'large', ruleSet: 'scaled', settlementFounders: 25 })   // 4 camps, 160×160
__game.restart({ population: 28, profile: undefined, ruleSet: undefined, settlementFounders: undefined })   // the ordinary world again
```

The camera and the minimap follow the size of the world being shown. The camera stays over the map whatever its size. The minimap draws
the whole map (a 256×256 map is under one pixel per tile on a 168-pixel minimap, so buildings are drawn smaller and the terrain sampled
more finely); clicking it moves the camera to that place, checked on every camp of a `huge` world. The widest view is limited: the
ordinary world may zoom out to 0.3, which shows all of it; a larger world may zoom out only until the window shows no more ground than the
ordinary world's widest view does (about 6,400 tiles: zoom 0.445 in a 1440×900 window), so that a frame never draws many times what the
ordinary world's does. The minimap is how you see the rest. Measured in headless Chromium (software rendering, so slower than a graphics
card): a `huge` world costs 7–8 ms a frame at normal zoom and 16 ms at its widest view, the same as the ordinary world's 16 ms at its
widest in that run. Before the limit its view could be 0.3, and a frame cost about 100 ms (10 frames a second): 43% of it was `sack` in
`render/buildings.ts`, the small bag drawn by every home's door with a new radial gradient each frame, which shows up when several camps'
homes are in view. That is a rendering cost worth fixing on its own; the limit only keeps it from showing.

### What the scaled rules change (measured)

Same ordinary 80×80 map, same seed (`meadow`), arrivals off, three simulated days, state read from `scripts/bench.ts` (`--pop N --rules …`).
One seed and three days only: this shows which wall moves first, not how a settlement develops.

| founders | rules | buildings, day 3 | homeless, day 3 | open sites (day 1 / 2 / 3) |
|---|---|---|---|---|
| 100 | ordinary | 36 | 13 of 100 | 3 / 4 / 4 |
| 100 | scaled | 47 | 0 of 100 | 6 / 14 / 11 |
| 250 | ordinary | 44 | 140 of 250 | 4 / 4 / 3 |
| 250 | scaled | 90 | 34 of 250 | 35 / 23 / 12 |

Housing is the first limit to move: at 250 founders the ordinary rules leave most people without a roof after three days because only four
sites can be open at once. No workshops exist by day 3 under either rule set (they are not planned before day 5 and need huts first), so
the workplace rule is not exercised by these runs. No deaths, no ledger or tool-record failures in any of them.

### A finding the runs surfaced, and fixed: weather made everyone who was rested restart the same activity every tick

In a 9-day, 100-founder run the benchmark showed decisions and path searches jumping from about 1 per tick to 14 per tick around day 7, with
nothing else going wrong (no deaths, no ledger or tool-record failures). It is not a product of the scaled rules: the ordinary run shows the
same thing, milder, because its weather at that moment was rain and not a storm.

Cause (reproduced on one staged person): "Shelter at the hut" is a `rest` activity (`options_survival.ts`) with a 260-tick duration, but the
`rest` handler ends as soon as `energy >= 98` (`act_misc.ts`), because it is also the handler for ordinary resting. A well-rested person
sheltering from rain or a storm therefore finishes after one tick and decides again, and again. With energy 100 in a storm she started
"Sheltering" 382 times in 400 ticks; with energy 60 she started it twice and kept it for about 277 ticks. In the 100-founder scaled run that
was 8,837 starts in 900 ticks; each is a decision, usually a path search, and an id.

It cost time in proportion to the number of rested people while it was raining or storming, and ids (see above) in the same proportion.

**Fixed:** the energy early-exit in the `rest` handler now applies only to resting for energy; sheltering from the weather (need `warmth`)
runs for its duration and is reconsidered at the usual reviews, like any other activity (`tests/shelter.test.ts`). This changes the ordinary
world's behaviour from the first rain or storm on, so the golden fingerprints for `meadow` (after 2,400 ticks) and `aspen-harsh` were
re-recorded; generation and everything before the first weather are unchanged.

### First observations of the larger worlds (12 simulated days, seed `meadow`, arrivals off) — and what a second pass found

One seed, one run each, in a shared container: shapes, not benchmarks. No deaths and no ledger, tool-record or id-range failures in either.

| | `large` (4 camps, 100 founders) | `huge` (6 camps, 250 founders) |
|---|---|---|
| people at day 12 | 103 (33 children, 7 elders) | 255 (74 children, 18 elders) |
| homeless | 0 | 0 |
| huts / houses | 30 / 1 | 77 / 0 |
| storehouses, timber yards | 4, 4 | 6, 6 |
| kilns, granaries, halls | 3, 3, 2 | 6, 6, 4 |
| quarries, bakeries | 1, 1 | 5, 5 |
| first timber yard / kiln / granary / hall (day) | 5.4 / 6.2 / 8.2 / 7.0 | 5.2 / 5.4 / 6.4 / 7.2 |
| cost per tick | 15 ms on day 1, about 7–9 ms by day 12 | 46 ms on day 1, about 30 ms by day 12; worst single tick 931 ms |
| heap | 101 MB | 268 MB |

The questions that table left open were taken up in a second pass. Each answer below says how it was found and how sure it is
(**verified** = run and observed; **likely** = evidence, not proof).

#### 1. The failing path searches were never "far": they were unreachable goals — verified

A fifth of searches failed (Large 17.9%, Huge 21.3%, against 4.2% in the ordinary 100-person village), and 68% / 92% of those ran out of
the 7,000-tile budget, which was read as "the target is far". `bench --verify` repeats each such search without a budget:

| 12 days, arrivals on | Large | Huge |
|---|---|---|
| searches | 34,169 | 93,498 |
| failed | 4,807 (14.1%) | 22,389 (23.9%) |
| … open set emptied (genuinely unreachable) | 53 | 2,411 |
| … out of budget | 4,754 | 19,978 |
| … of those, reachable with an unlimited search | **0** | **0** |
| failures for a target under 20 tiles away | 96.6% | 99.7% |
| by caller | wolf 4,219 · socialize 329 · give 135 · till 68 · visit 54 | wolf 19,607 · socialize 1,558 · give 634 · till 339 · visit 210 · gather 33 |

Two causes, both of the form "flood the whole connected area, find nothing":
* **Wolves** (88% of failures in Huge). A roaming wolf's goal is only checked to be a walkable tile, not a reachable one, and a failed
  search left its path empty, so it searched again on the next tick (2,600 tiles each time) until stuck-detection gave it a new goal.
* **People** whose target is a person standing on a tile nothing can enter (inside a home, on a rock): a search for that one tile can
  never succeed. Checked on a 4-day Large run: every such failure (socialize 79, give 24, visit 15, till 8) had an impassable goal tile;
  the caller then falls back to ground beside the person (up to five more searches), which succeeds.

What was done (step 3), both **exact** — the same answer, so the same world, with the searches not made:

* A search for one particular tile that nothing can step onto returns at once (`pathfinding.ts`). Tested against the full search on 800 random
  pairs on an ordinary and a Large map.
* A wolf remembers its last search that found nothing — from this tile, to this goal tile, with the world's solid tiles as they were — and does
  not ask the same question again (`wildlife.ts`; a per-world count of changes to the solid tiles, `registry.solidEpoch`, ends the memory). It
  takes the one step toward its goal that the failed search would have made it take. Kept beside the world, not in it. Tested on whole worlds
  with the memory on and off (ordinary 3,000 ticks, Large 1,200: identical hash and deep hash, fewer searches).

Neither needs a rule and both apply to the ordinary world too. **A first version used two scaled-rule heuristics instead** — a 30-tick
back-off for wolves and a 600-tick wait for a person's failed option — and it changed what scaled worlds do. Huge workplaces at day 12
(quarry + kiln + granary + hall + bakery), base → both heuristics, three seeds: `meadow` 26 → 16, `river` 28 → 25, `fern` 28 → 29 (mean 27.3 →
23.3); with the back-off alone `meadow` gave 20, with the wait alone 25. Four seeds on Large had shown no difference, so whether that was
chaos or a real effect at Huge density is not settled, and it no longer matters: the wait saved no measurable work once the impassable-goal
shortcut existed (tiles per search 22–38 with an 80-tick wait, 18–44 with 600), and the memory does what the back-off did without altering
anything. (The first back-off also had a bug of mine: a wolf stood still while it waited; found by this comparison, fixed, then dropped.)

The decisive check is the last two rows: with the search skipped and nothing else changed, **every one of these worlds ends in exactly the state
it ended in without the change**. (The failures that remain are one search per wolf per tile it stands on, and the budget-limited floods
for the few person-targets that are not impassable tiles.)

| 12 days, arrivals off, `meadow` | Large before → after | Huge before → after | ordinary 100, ordinary rules |
|---|---|---|---|
| searches failing | 17.9% → 2.8% | 21.3% → 5.5% (`river`: 12.4% → 4.6%) | 4.2% → 4.2% |
| tiles expanded per search | 392 → 33 | 643 → 57 (`river`: 413 → 30) | 227 → 10 |
| final state hash, before = after | `2566beef` = `2566beef` | `9936814a` = `9936814a` (`river`: `3631bb3d` = `3631bb3d`) | `696e3978` = `696e3978` |
| wander starts, before = after | 4,474 = 4,474 | 7,754 = 7,754 | 1,739 = 1,739 |

#### 2. Why people "wander" — verified for the counts, unknown for the rest

`wander` is the fallback every person always has. When it is chosen the simulation records why (`probe.ts`). In Large, 12 days: **80% of the
starts are children** (children may not build, haul, farm and so on: 41% "everything usable was off-limits to a child", 20% "nothing at all to
do"), 21% adults (mostly "gather outscored it", "deposit outscored it"). The ordinary village has the same mix.

The "about 4× ordinary" came from comparing one seed's Large with one seed's village. Per child-day the ordinary 28-person village gives
5.8 (`meadow`), 12.4 (`river`), 5.1 (`fern`), 9.8 (`aspen`), 5.8 (`birch`), and per adult-day 0.5 to 1.5; Large on `meadow` gives 9.7 and 1.1.
That is inside the ordinary world's own range from seed to seed. Neither the scaled rules (ordinary map, 100 founders, scaled: 5.0 / 0.55
against 4.1 / 0.48 under ordinary rules) nor camp size explains it, and the rate is flat from day 2 to day 12. **No fix was made.** What the
data cannot say is why `river` children idle twice as much as `fern` children: that is a property of a seed's geography.

#### 3. Camps progress like camps — verified over two seeds; no rule changed

`scripts/campclock.ts`, Huge, 12 days, arrivals off. First day each camp gets a ... (earliest / median / latest of the six; in brackets how many
of the six had one by day 12):

| | storehouse | timber yard | quarry | kiln | granary | bakery | hall | smithy |
|---|---|---|---|---|---|---|---|---|
| Huge `meadow` | 2.3 / 3.2 / 7.2 | 5.2 / 5.3 / 6.2 | 5.1 / 6.4 / 7.0 (3) | 6.0 / 6.3 / 7.9 | 8.0 / 9.0 / 10.4 (5) | 10.2 / 10.8 / 12 (4) | 7.5 / 9.2 / 9.3 (3) | none |
| Huge `river` | 2.3 / 3.4 / 11 | 5.2 / 5.3 / 5.4 | 5.2 / 5.3 / 6.3 | 6.0 / 6.3 / 9.3 | 6.4 / 9.0 / 9.3 | 9.5 / 10 / 10 (2) | 6.4 / 9.1 / 9.2 (3) | 12 (1) |
| one village, `meadow` | 3.5 | 5.3 | 6.3 | 8.3 | 10.2 | none | 12.5 | none |

The six camps are on the village's timeline or ahead of it, not behind. What is behind the gaps, from the same runs:

* **Timber yard**: the planner's hard gate, `world.tick < DAY * 5` (`production.ts`): the first yards appear at 5.2.
* **Wanting** is not what holds the rest back. On day 6 in `meadow`, 15, 27 and 16 adults in three camps wanted a quarry; on day 8, 17 adults
  in one camp wanted a hall. A camp that wants none builds none: on `meadow` camp 0 had one adult who wanted a quarry on days 6 and 8
  and none on day 10; it has none by day 12.
* **Projects against the limit** (3 per camp of 42; the village's is 2 of 28): at the limit in one camp on day 6 and three on day 8, and the
  open projects are waiting for **materials**: planks and bricks in a camp stand at 0–7 through day 12 in both seeds (stone is more plentiful,
  up to 21 in `river`).
* A hall wanted by 11–17 adults for two days (`meadow` camp 3 on days 8 and 10; `river` camps 1 and 5 on days 8–12) was still not started.
  The planner's lottery (a person acts on a want in a given 500-tick window with probability 0.25 + 0.4 × initiative) and the project limit
  are the candidates; at most 4 of those adults had failed to find a place. **Not separated: unknown.**
* **Smithy**: a person wants one only when a tool has worn to 25 or there is no axe and pick, or from day 14 (`production.ts`); one or two adults
  did on days 8–12, and one camp in `river` had one on day 12. Not a gate.
* **House**: on day 12, in every camp, 3–10 adults who live in a hut pass every gate of the upgrade planner (wish, food, yard and kiln known,
  no site of their own); houses need planks and bricks that the camp does not yet have. The village has none by day 14 either.

Nothing in `scaledRules` was changed: the tables show no binding rule that makes a Huge camp slower than the village, so there was nothing to
change it for. Raising the project limit would put more projects on the same few planks.

#### 4. The worst tick — cause stated; mostly measurement noise, then the garbage collector

* **Wall-clock slow ticks are mostly not the simulation.** In a 4-day Huge run on a loaded machine, 149 of 9,600 ticks took over 100 ms;
  117 of them used under 60% of their time as CPU (`process.cpuUsage`): the process was waiting for a core. The first tick is the largest of
  all (540–590 ms): everyone decides at once, and the code is cold. Neither is periodic work: the slow ticks are spread evenly over
  `tick % 30, 60, 90, 120, 240, 300, 400, 2400`.
* **The ticks that were computing coincide with major garbage collections** (23 of 23 listed; a Mark-Compact falls in under 1% of all
  ticks). The world allocated **9.5 MB per tick** (`scripts/allocs.ts`), 29% of it `Math.hypot` (the builtin allocates an array and a boxed
  number per call) and 30% belief snapshots.
* **Cut**: `hyp()` in `util.ts`, a bit-identical two-argument `Math.hypot` that does not allocate, in the 124 places the simulation used it
  (tested bit for bit over 3.2 million inputs; golden unchanged). 5.0 MB per tick afterwards. Three alternating 2-day Huge runs, before →
  after: scavenges 2,236 → 1,130 (−49%), total scavenge pause 13.1–14.7 s → 9.2–11.7 s, total major-collection pause 684–897 ms →
  339–630 ms (their number, 30, did not change), mean ms/tick 19.4–22.2 → 17.1–18.1, worst tick 599–654 ms → 542–554 ms (the first tick). The worst tick after
  the first, by CPU time, fell from a median of 204 ms to 165 ms but the two ranges overlap, so that is not claimed.
* **Quiet machine, everything in this pass together** (base commit of PR #6 against this branch, alternating, three runs each, arrivals off,
  both ending in the same state hash): Large, 12 days, mean ms/tick 5.39–5.61 → 4.72–4.89 (−15%; worst tick 108–149 → 136–155 ms: not
  distinguishable); Huge, 3 days, 17.15–17.32 → 14.80–15.23 (−13%), worst tick 269–367 → 249–265 ms, lower in each of the three pairs.
* **Left**: belief snapshots (57% of what is now allocated) — replacing a belief in place instead of making a new one would change object
  identity, and beliefs are copied around by hearsay; not attempted.

#### 5. The requests = 260 cap is a trim of history — verified

`social.ts` `createRequest`: when the list passes 260, the oldest request that is no longer pending or promised is dropped. It is not a limit on
asking: live (pending + promised) requests peaked at 12 in Huge. It costs only the history of settled requests, which only the inspector reads.
In Huge it is reached on day 2 (about 250 asks a day); in the village at about day 7.

#### 6. Growth — verified; one limit was binding and was changed (scaled rules only)

30 days, seed `meadow`, arrivals on (`scripts/growth.ts`):

| | founders | born | died | arrived | people at day 30 |
|---|---|---|---|---|---|
| ordinary village | 28 | 5 | 0 | 15 | 48 |
| Large | 100 | 15 | 0 | 17 | 132 |
| Huge | 250 | 38 | 1 | 14 | 302 |

Nothing in the caps was binding (Huge 302 against 482 for arrivals and 571 for conceptions; at most one woman at a time without a home).
Births follow the number of partnered women, the spacing between children and age. **Arrivals** were limited by a rule written for one
village: `immigrationTick` lets one group of travellers come per **6,000 ticks for the whole world** (`lastArrival`), so Large and Huge got what
the village got (14–17 people in 30 days). `rules.arrivalSpacing` scales that by one settlement's share of the founders in the scaled rules
(Large 1,500, Huge 1,008, never below 400); the ordinary rules keep 6,000. Large, same 30 days: 47 arrived instead of 17, 100 → 160 people,
no deaths; Huge: 36 born, 0 died, 55 arrived, 250 → 341 people (against 38 / 1 / 14 and 302). Still far below the caps (482, 571) and
still roofed (a few households without a home at any time). These two 30-day runs were taken before the wolves' memory replaced the
back-off, which does not touch births or arrivals.

#### 7. Do the camps meet? — verified for one seed, 30 days

Huge, arrivals off (`scripts/contact.ts`): barely. The two nearest camps are 70 tiles apart; the farthest anyone went from their own camp was
63 tiles (one person over 50; 158 people were at some time over 30 tiles out, exploring). By day 30, 8 people knew a place that lies
beside another camp, 10 had a relation with someone from another camp, **nobody was talking to or in sight of anyone from another camp at the
moment of any day-end check**, and one of the thirty ordered pairs of camps knew a building of the other. Nothing was done to make them meet.

## Measured so far (ordinary 80×80 map)

Taken in a shared 4-core container, with other work running part of the time, so treat them as shapes, not benchmarks.

**Where the time goes** — CPU profile of a 30-day ordinary run (28 → 48 people), share of self time:

| area | share |
|---|---|
| perception, spatial-grid queries, belief snapshots, and the garbage they cause | about 35–40% |
| `updateNeeds` (including `shelterAt`, which scans every building for every person every tick) | about 8% |
| option generation in `options_work` / `optutil` | about 15% |
| path finding | about 2% |

**Cost against population** (only the founding population changed; same map, no arrivals; steady state after the first day):

| founders | ms per tick |
|---|---|
| 28 | about 2 |
| 100 | about 9–10 |
| 250 | about 32–67 (noisy) |

An ordinary world slows down as it develops even without a population jump: about 1.9 ms/tick at 28 people on day 1, about 5.5 ms/tick at
48 people on day 30. Beliefs per person were still rising at day 60 (about 490).

**Ids.** `world.nextId` is shared by entities, activities, events, requests, conversations, reservations and meals. It advanced by about 31
per person per simulated day. Ids at or above `WATER_ID_BASE` (1,000,000, `src/sim/knowledge.ts`) are read as water beliefs, so a world that
reaches that many ids will misread real entities. At that rate: roughly 500 days for an ordinary 60-person world, 150 days at 250 people, 50
days at 600 (a straight-line extrapolation).

**A 250-person start on the ordinary map** produced about 20 buildings at generation and about 35 after 4,000 ticks, with the number of open
construction sites pinned at 3–4 — see the rule limits below.

## Where the rules assume a small settlement

Read directly from the code (verified):

* `src/sim/lifecycle.ts` — immigration stops at 54 people; conception stops above 64 (the variable named `adultsAlive` counts everyone); one
  group of travellers per 6,000 ticks for the whole world (scaled by `rules.arrivalSpacing` in the larger worlds).
* `src/sim/act_build.ts` `siteConflict` — one of each workshop, hall, granary and storehouse in the *whole world*; `src/sim/options_work.ts`
  `optPlanBuild` — at most four open sites in the world and one per household.
* `src/sim/worldgen.ts` — in the ordinary world, three clay pits, two outcrops and two ore veins per map, finite; three wolves (five when
  harsh), placed only at generation; resource clusters, wolf dens and water placed at fixed distances from one camp. The larger worlds repeat
  this per camp, scaled to its founders; deposits are still finite and wolves are still never replaced.
* `src/sim/needs.ts` — `shelterAt` and `fireWarmth` scan all buildings for each person each tick.
* `src/sim/wildlife.ts` `moveWolf` — a wolf picks a roaming goal that is only checked to be a walkable tile, not a reachable one. (Its repeated
  failed searches are no longer made: see the notes on path failures.)
* `src/sim/meals.ts` — the meal list is trimmed to 60 by dropping the oldest, whether or not it is still active.
* `src/sim/optutil.ts` `foodCount` does not count bread.

Reported by code review but not independently re-read: per-person `explored` arrays of `W×H` bytes (16 MB in memory for 250 people; the save
stores them as runs); relations created for every pair of founders; beliefs that are never forgotten (68,000 at day 3 in Huge, and the largest
part of a save and of what the simulation allocates); `friendlyTo` / `repairStake` scanning every person per known foreign home; terrain
redrawn every frame; the tick clock capped by count rather than by time. (localStorage saves that would exceed the browser quota at scale:
measured and addressed, see the saving section.)

The limits on settlement size (first group above) are now a rule set, the use of `world.camp` is now a list of settlements (both described
above), the weather-shelter bug is fixed, a Huge world can be saved at any day, and the repeated failed searches are skipped. None of the rest has been changed: whether and how to change each is a decision about the rules of
the world, not about measurement.
