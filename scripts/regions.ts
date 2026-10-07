// What a larger world looks like at tick 0, camp by camp: is there water, food, stone and clay within reach of each camp, how many people
// start with a roof, can the camps reach each other on foot, do founders know only their own camp.
//   npx vite-node scripts/regions.ts -- --profile huge --seed meadow
//   npx vite-node scripts/regions.ts -- --profile large --seed river --pop 60
import { createWorld } from '../src/sim/factory';
import { findPath } from '../src/sim/pathfinding';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { nearestHub } from '../src/sim/settlements';
import type { SourceType } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const profile = opt('profile', 'huge') as ProfileName;
const seed = opt('seed', 'meadow');
const base = opt('pop', '') ? { population: Number(opt('pop', '')) } : {};

const t0 = Date.now();
const w = createWorld(settingsForProfile(profile, seed, base));
const ms = Date.now() - t0;
const hubs = [w.camp, ...(w.extraSettlements ?? [])];
const near = (h: { x: number; y: number }, r: number, types: SourceType[]) => w.sources.filter((s) => types.includes(s.type) && Math.hypot(s.x - h.x, s.y - h.y) <= r && s.amount > 0).length;
const sum = (r: Record<string, number>) => Object.entries(r).map(([k, v]) => `${k} ${v}`).join(', ');

console.log(`${profile} ${seed}: ${w.W}x${w.H}, generated in ${ms} ms; ${w.persons.length} people, ${w.households.length} households, ${w.sources.length} sources (${w.sources.filter((s) => s.type === 'tree').length} trees), ${w.animals.length} wolves`);
const byType: Record<string, number> = {};
for (const b of w.buildings) byType[b.type] = (byType[b.type] ?? 0) + 1;
console.log('buildings:', sum(byType));
const tools: Record<string, number> = {};
for (const t of w.tools) tools[t.kind] = (tools[t.kind] ?? 0) + 1;
console.log('tools:', sum(tools), '| rules:', w.settings.ruleSet, 'settlementFounders', w.settings.settlementFounders);
const dep: Record<string, number> = {};
for (const s of w.sources) if (s.type === 'clay_pit' || s.type === 'outcrop' || s.type === 'ore_vein') dep[s.type] = (dep[s.type] ?? 0) + 1;
console.log('deposits:', sum(dep));

console.log('\ncamp   at          founders hh  homeless  lean-tos fires | within 30: berries fruit grain fish rock | within 60: clay outcrop ore | nearest shore  nearest wolf den');
hubs.forEach((h, i) => {
  const mine = w.persons.filter((p) => nearestHub(w, p.x, p.y) === h);
  const hhs = new Set(mine.map((p) => p.hhId));
  const roofless = [...hhs].filter((id) => !w.households.find((x) => x.id === id)?.homeId).length;
  let shore = Infinity;
  for (let k = 0; k < w.accessCell.length; k++) {
    const t = w.accessCell[k];
    if (t >= 0) shore = Math.min(shore, Math.hypot((t % w.W) - h.x, Math.floor(t / w.W) - h.y));
  }
  const den = Math.min(...w.animals.map((a) => Math.hypot(a.denX - h.x, a.denY - h.y)));
  const homes = w.buildings.filter((b) => b.type === 'lean_to' && Math.hypot(b.x - h.x, b.y - h.y) < 20).length;
  const fires = w.buildings.filter((b) => b.type === 'fire' && Math.hypot(b.x - h.x, b.y - h.y) < 10).length;
  console.log(
    `${String(i).padEnd(6)} (${h.x.toFixed(0)},${h.y.toFixed(0)})`.padEnd(20) +
      `${String(mine.length).padEnd(9)}${String(hhs.size).padEnd(4)}${String(roofless).padEnd(10)}${String(homes).padEnd(9)}${String(fires).padEnd(6)}|  ` +
      `${String(near(h, 30, ['berry_bush'])).padEnd(8)} ${String(near(h, 30, ['fruit_tree'])).padEnd(5)} ${String(near(h, 30, ['wild_grain'])).padEnd(5)} ${String(near(h, 30, ['fish_spot'])).padEnd(4)} ${String(near(h, 30, ['rock'])).padEnd(5)}|  ` +
      `${String(near(h, 60, ['clay_pit'])).padEnd(4)} ${String(near(h, 60, ['outcrop'])).padEnd(7)} ${String(near(h, 60, ['ore_vein'])).padEnd(4)}|  ${shore.toFixed(0).padEnd(14)} ${den.toFixed(0)}`,
  );
});

// can the camps walk to each other?
if (hubs.length > 1) {
  console.log('\nland route between camps (A* with a large budget; -- means no way on foot):');
  const rows: string[] = [];
  for (let i = 0; i < hubs.length; i++) {
    const cells: string[] = [];
    for (let j = 0; j < hubs.length; j++) {
      if (j <= i) {
        cells.push('   .');
        continue;
      }
      // (the camp's own tile holds the fire, which cannot be walked onto: aim for anywhere within four tiles of it)
      const path = findPath(w, hubs[i].x, hubs[i].y, hubs[j].x, hubs[j].y, { maxNodes: 400000, goalFn: (x, y) => Math.hypot(x + 0.5 - hubs[j].x, y + 0.5 - hubs[j].y) <= 4 });
      const len = path ? path.length / 2 : -1;
      cells.push(len < 0 ? '  --' : String(len).padStart(4));
    }
    rows.push(`  camp ${i}: ${cells.join(' ')}`);
  }
  console.log(rows.join('\n'));
}

// do founders know only their own camp?
let crossRelations = 0;
let farBeliefs = 0;
let beliefs = 0;
for (const p of w.persons) {
  const mine = nearestHub(w, p.x, p.y);
  for (const k in p.relations) {
    const q = w.byId.get(Number(k));
    if (q && q.ent === 'person' && nearestHub(w, q.x, q.y) !== mine) crossRelations++;
  }
  for (const k in p.beliefs) {
    const b = p.beliefs[k as unknown as number];
    beliefs++;
    if (Math.hypot(b.x - mine.x, b.y - mine.y) > 60) farBeliefs++;
  }
}
console.log(`\nfounders' relations with people of another camp: ${crossRelations}; beliefs about places more than 60 tiles from their own camp: ${farBeliefs} of ${beliefs}`);
