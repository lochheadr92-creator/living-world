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

Two things are deliberately not changed. The rule that a household has one site open at a time stays: it limits a household, not a
settlement. And workplaces are still *sited* around the single `world.camp` (`production.ts`, `options_work.ts`); the locality of the rules
uses each person's home as the anchor, which is the same settlement until a world has more than one. Several settlements need the generator
and the siting rules to know about them — the next step, not this one.

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

### A finding the runs surfaced: weather makes everyone who is rested restart the same activity every tick

In a 9-day, 100-founder run the benchmark showed decisions and path searches jumping from about 1 per tick to 14 per tick around day 7, with
nothing else going wrong (no deaths, no ledger or tool-record failures). It is not a product of the scaled rules: the ordinary run shows the
same thing, milder, because its weather at that moment was rain and not a storm.

Cause (reproduced on one staged person): "Shelter at the hut" is a `rest` activity (`options_survival.ts`) with a 260-tick duration, but the
`rest` handler ends as soon as `energy >= 98` (`act_misc.ts`), because it is also the handler for ordinary resting. A well-rested person
sheltering from rain or a storm therefore finishes after one tick and decides again, and again. With energy 100 in a storm she started
"Sheltering" 382 times in 400 ticks; with energy 60 she started it twice and kept it for about 277 ticks. In the 100-founder scaled run that
was 8,837 starts in 900 ticks; each is a decision, usually a path search, and an id.

It costs time in proportion to the number of rested people while it is raining or storming, and ids (see above) in the same proportion. It
has not been fixed here because fixing it changes how the ordinary world behaves.

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
* `src/sim/worldgen.ts` — three clay pits, two outcrops and two ore veins per map, finite; three wolves (five when harsh), placed only at
  generation; resource clusters, wolf dens and water placed at fixed distances from one camp; one fire.
* `src/sim/needs.ts` — `shelterAt` and `fireWarmth` scan all buildings for each person each tick.
* `src/sim/wildlife.ts` `moveWolf` — a wolf whose path search returns null searches again on the next tick.
* `src/sim/meals.ts` — the meal list is trimmed to 60 by dropping the oldest, whether or not it is still active.
* `src/sim/optutil.ts` `foodCount` does not count bread.
* `src/render/camera.ts` and `src/ui/minimap.ts` use `MAP_W` / `MAP_H` instead of the world's own size.

Reported by code review but not independently re-read: per-person `explored` arrays of `W×H` bytes; relations created for every pair of
founders; beliefs that are never forgotten; `friendlyTo` / `repairStake` scanning every person per known foreign home; a single `world.camp`
read in about 25 places; terrain redrawn every frame; the tick clock capped by count rather than by time; localStorage saves that would
exceed the browser quota at scale.

None of these has been changed. Whether and how to change each is a decision about the rules of the world, not about measurement.
