// How often does a trip to collect goods from a workplace come back with "nothing to take", and why?
// usage: npx vite-node scripts/withdraws.ts [seed] [days]
// Each failed trip is put in one of four boxes: the shelf was empty when they got there, the goods were being held for somebody
// else, the person had no right to take them, or something else. (This is how the cost of goods held for other people was measured.)
import { DAY } from '../src/sim/constants';
import { accessLevel, usableUnits } from '../src/sim/facilities';
import type { ItemKind, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { defaultSettings, generateNatural } from '../src/sim/worldgen';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 20);
const world: World = generateNatural(defaultSettings(seed));
const pending = new Map<number, { targetId: number; items: Record<string, number>; tick: number }>();
const lastSeenResult = new Map<number, number>();
world.hooks = {
  onActivityStart: (p, a) => {
    if (a.kind === 'withdraw') pending.set(p.id, { targetId: a.targetId, items: { ...(a.data.items ?? {}) }, tick: world.tick });
  },
};
const why: Record<string, number> = {};
let trips = 0;
let ok = 0;
let failed = 0;
for (let t = 0; t < days * DAY; t++) {
  stepWorld(world);
  for (const p of world.persons) {
    const r = p.lastResult;
    if (!r || lastSeenResult.get(p.id) === r.tick) continue;
    lastSeenResult.set(p.id, r.tick);
    const pend = pending.get(p.id);
    if (!pend || pend.tick > r.tick || !/Collecting|Taking|Took|nothing to take/.test(r.label + ' ' + r.detail)) continue;
    trips++;
    if (r.outcome === 'success') {
      ok++;
      continue;
    }
    if (!/nothing to take/.test(r.detail)) continue;
    failed++;
    const e = world.byId.get(pend.targetId);
    if (!e || e.ent !== 'building') continue;
    const item = Object.keys(pend.items)[0] as ItemKind;
    const marks = (e.ops?.earmarks ?? []).filter((m) => m.item === item && m.until > world.tick && m.n > 0);
    let cause: string;
    if ((e.store.items[item] ?? 0) < 1) cause = 'the shelf was empty on arrival (an old belief, or somebody got there first)';
    else if (usableUnits(world, e, p, item) >= 1) cause = 'goods were free for them yet it failed (a race)';
    else if (marks.some((m) => m.owner !== p.id)) cause = 'the goods were held for somebody else';
    else cause = `no right to take them (access level ${accessLevel(world, p, e)})`;
    why[cause] = (why[cause] ?? 0) + 1;
  }
}
console.log(`== ${seed} ${days}d: collection trips ${trips}, ok ${ok}, came back with nothing ${failed}`);
for (const [k, v] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);
