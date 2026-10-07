// The novel-need test: when a scarcity strikes that the planners were not written for, what does the world do?
//
//   npx vite-node scripts/novelneed.ts -- --seed meadow [--profile large] [--fork 6] [--days 10] > /tmp/nn_meadow.jsonl
//   npx vite-node scripts/novelneed_report.ts -- /tmp          (aggregates every nn_*.jsonl in a directory)
//
// For one seed the world is run to day `fork`, saved, and loaded back four times (the save round trip is exact, tests/save.test.ts):
//   control   nothing changes
//   no-wood   every tree within 22 tiles of any settlement is gone
//   no-food   every wild food source (berries, fruit, grain, fish) within 35 tiles of any settlement is gone: only farming is left
//   no-clay   every clay pit and ore vein is gone: bricks, jars and iron are impossible
// Each is then run for `days` more days. Because the control is the same world, any difference is the perturbation's.
//
// What is recorded: deaths, population, buildings and farmland gained, the farthest a building was raised from every original
// settlement (relocation), whether a new settlement appeared (a home more than 30 tiles from all of them), and every (activity kind,
// target type) pair started after the fork, so that a pair that appears only under pressure can be seen. The set of things the world
// can build, make or do is closed and authored (building types, recipes, activity kinds), so "something new" can only mean a new
// arrangement or use of these, never a new kind of thing; the report says which.
import { createWorld } from '../src/sim/factory';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { unregisterSource } from '../src/sim/registry';
import type { SourceType, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'meadow');
const profile = opt('profile', 'large') as ProfileName;
const forkDay = Number(opt('fork', '6'));
const days = Number(opt('days', '10'));

const hubsOf = (w: World) => [w.camp, ...(w.extraSettlements ?? [])];
const nearHub = (w: World, x: number, y: number, r: number) => hubsOf(w).some((h) => Math.hypot(h.x - x, h.y - y) <= r);

function remove(w: World, types: SourceType[], r: number): number {
  let n = 0;
  for (const s of w.sources.slice()) {
    if (types.includes(s.type) && nearHub(w, s.x, s.y, r)) {
      unregisterSource(w, s);
      n++;
    }
  }
  return n;
}

const SCENARIOS: Record<string, (w: World) => number> = {
  control: () => 0,
  'no-wood': (w) => remove(w, ['tree'], 22),
  'no-food': (w) => remove(w, ['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot'], 35),
  'no-clay': (w) => remove(w, ['clay_pit', 'ore_vein'], 1e9),
};

const world = createWorld(settingsForProfile(profile, seed, { immigration: false }));
while (world.tick < forkDay * DAY) stepWorld(world);
const saved = serializeWorld(world);
const hubs = hubsOf(world).map((h) => ({ x: h.x, y: h.y }));

for (const [name, apply] of Object.entries(SCENARIOS)) {
  const w = deserializeWorld(saved);
  const removed = apply(w);
  const idAtFork = w.nextId;
  const before = { buildings: w.buildings.length, plots: w.plots.length, deaths: w.deceased.length };
  const pairs: Record<string, number> = {};
  const started: Record<string, number> = {};
  w.hooks = {
    onActivityStart: (_p, a) => {
      const k = `${a.kind}:${a.targetType || '-'}`;
      pairs[k] = (pairs[k] ?? 0) + 1;
      started[a.kind] = (started[a.kind] ?? 0) + 1;
    },
  };
  for (let i = 0; i < days * DAY; i++) stepWorld(w);
  const fresh = w.buildings.filter((b) => b.id >= idAtFork);
  const far = (b: { x: number; y: number }) => Math.min(...hubs.map((h) => Math.hypot(h.x - b.x, h.y - b.y)));
  const types: Record<string, number> = {};
  for (const b of fresh) types[b.type] = (types[b.type] ?? 0) + 1;
  const alive = w.persons.filter((p) => p.alive);
  console.log(
    JSON.stringify({
      seed,
      scenario: name,
      removed,
      deaths: w.deceased.length - before.deaths,
      deathCauses: w.deceased.slice(before.deaths).reduce((m: Record<string, number>, d) => ((m[d.cause] = (m[d.cause] ?? 0) + 1), m), {}),
      pop: alive.length,
      newBuildings: fresh.length,
      newBuildingTypes: types,
      newPlots: w.plots.length - before.plots,
      farthestNewBuilding: fresh.length ? Math.round(Math.max(...fresh.map(far))) : 0,
      newSettlement: fresh.some((b) => (b.type === 'hut' || b.type === 'lean_to' || b.type === 'house') && far(b) > 30),
      explores: started.explore ?? 0,
      cartHauls: started.cart_haul ?? 0,
      pairs,
    }),
  );
}
