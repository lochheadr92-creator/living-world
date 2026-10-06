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
