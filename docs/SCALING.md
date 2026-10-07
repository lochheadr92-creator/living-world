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
belief, every relation, ids — minus the save-format version.

* A mismatch means the ordinary world is no longer what it was. If that was the intent, regenerate with
  `npx vite-node scripts/golden.ts --write` and say why in the commit. If it was not the intent, the mismatch is the finding.
* `npx vite-node scripts/golden.ts` (no flag) prints the same comparison outside the test runner.
* The fingerprints depend on the JavaScript engine's floating-point behaviour (`Math.hypot`, `Math.sin`, …). They were recorded on Node 22;
  a different engine may legitimately differ.

### Work counters

`src/sim/probe.ts` holds plain integer counters that the simulation increments and never reads: path searches, tiles expanded, searches that
returned null and how many of those ran out of node budget, option generations, options generated, decisions, reviews, perceive calls and what
they saw. They are off by default (one boolean test each), are not part of the world, a save or the state hash, use no randomness and read no
clock. `tests/probe.test.ts` holds that: a run with them on has the same fingerprint as a run with them off.

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

Use a quiet machine. The ledger pass is O(world); raise `--check` for very large worlds. Run each world size in its own process (the path-finder
reallocates its buffers when the map size changes).

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
camp. Run it: `npx vite-node scripts/bench.ts -- --profile huge --days 3`. They are not offered in the world menu yet: the camera and the
minimap still assume an 80×80 map (`MAP_W` / `MAP_H`).

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

* `src/sim/lifecycle.ts` — immigration stops at 54 people; conception stops above 64 (the variable named `adultsAlive` counts everyone).
* `src/sim/act_build.ts` `siteConflict` — one of each workshop, hall, granary and storehouse in the *whole world*; `src/sim/options_work.ts`
  `optPlanBuild` — at most four open sites in the world and one per household.
* `src/sim/worldgen.ts` — in the ordinary world, three clay pits, two outcrops and two ore veins per map, finite; three wolves (five when
  harsh), placed only at generation; resource clusters, wolf dens and water placed at fixed distances from one camp. The larger worlds repeat
  this per camp, scaled to its founders; deposits are still finite and wolves are still never replaced.
* `src/sim/needs.ts` — `shelterAt` and `fireWarmth` scan all buildings for each person each tick.
* `src/sim/wildlife.ts` `moveWolf` — a wolf whose path search returns null searches again on the next tick.
* `src/sim/meals.ts` — the meal list is trimmed to 60 by dropping the oldest, whether or not it is still active.
* `src/sim/optutil.ts` `foodCount` does not count bread.
* `src/render/camera.ts` and `src/ui/minimap.ts` use `MAP_W` / `MAP_H` instead of the world's own size.

Reported by code review but not independently re-read: per-person `explored` arrays of `W×H` bytes; relations created for every pair of
founders; beliefs that are never forgotten; `friendlyTo` / `repairStake` scanning every person per known foreign home; terrain redrawn every frame; the tick clock capped by count rather than by time; localStorage saves that would
exceed the browser quota at scale.

The limits on settlement size (first group above) are now a rule set, the use of `world.camp` is now a list of settlements (both described
above), and the weather-shelter bug is fixed. None of the rest has been changed: whether and how to change each is a decision about the rules of
the world, not about measurement.
