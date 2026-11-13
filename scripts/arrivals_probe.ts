// Why some worlds get no newcomers. Read-only measurement: one ordinary world; just before each of the world's own checks for
// travellers (lifecycle.ts immigrationTick, every 400 ticks) the gates are read in order and the first that stops the check is
// counted. Every so often the last gate, the way in, is read on a copy of the world: each point along the map's four edges is
// tried as the world would try it (walkable, no animal within 14, a path to the settlement, no animal's first place within 12 of
// the path), and again counting only the wolves.
//
//   npx vite-node scripts/arrivals_probe.ts -- --seed birch --days 72 [--ways 2] [--rules N] [--out arrivals.json]
//   (or --load <save point> in place of --seed: see scripts/world_args.ts)
import { worldFromArgs } from './world_args';
import { writeFileSync } from 'node:fs';
import { DAY, isHomeType } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { findPath } from '../src/sim/pathfinding';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { isFreeLand, isWalkable } from '../src/sim/registry';
import { rulesOf } from '../src/sim/rules';
import { nearestHub } from '../src/sim/settlements';
import { T } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
let seed = opt('seed', 'birch');
const days = Number(opt('days', '72'));
const waysEvery = Number(opt('ways', '2')); // days between readings of the way in
const out = opt('out', '');
const { w }: { w: World } = worldFromArgs(opt, seed);
seed = w.settings.seed;

const GATES = ['too many or too few people', 'the first two days', 'a group came lately (spacing)', 'less than 3.2 food a head in the whole settlement', 'too few roofs for the people here', 'all gates passed (then a 35 in 100 chance, then a way in)'];
const gates: Record<string, number> = {};
const bump = (o: Record<string, number>, k: string, n = 1): void => { o[k] = (o[k] ?? 0) + n; };
const hyp = Math.hypot;
let checks = 0, arrived = 0;
const known = new Set<number>(w.persons.map((p) => p.id));
const foodSeen: number[] = [], roofsShort: number[] = [];
/** each edge point as the world would try it; what share give a way in, and what stops the rest */
function waysIn(src: World): { points: number; open: number; openWolvesOnly: number; why: Record<string, number> } {
  const c = deserializeWorld(serializeWorld(src));
  const why: Record<string, number> = {};
  let points = 0, open = 0, openWolvesOnly = 0;
  const kinds = (near: typeof c.animals): string => [...new Set(near.map((a) => a.type))].sort().join(' and ');
  for (let edge = 0; edge < 4; edge++) {
    const len = edge % 2 === 0 ? c.W : c.H;
    for (let t = 6; t < len - 6; t += 3) {
      const x = edge === 0 ? t : edge === 1 ? c.W - 4 : edge === 2 ? t : 3;
      const y = edge === 0 ? 3 : edge === 1 ? t : edge === 2 ? c.H - 4 : t;
      points++;
      if (!isWalkable(c, Math.floor(x), Math.floor(y)) || c.terrain[Math.floor(y) * c.W + Math.floor(x)] === T.SHALLOW) { bump(why, 'the edge there is not open ground'); continue; }
      const nearEdge = c.animals.filter((a) => hyp(a.x - x, a.y - y) < 14);
      const hub = nearestHub(c, x, y), gx = hub.x, gy = hub.y + 3;
      const path = findPath(c, x, y, gx, gy, { maxNodes: 9000, caller: 'arrival', goalFn: (tx, ty) => hyp(tx + 0.5 - gx, ty + 0.5 - gy) <= 3.2 && isFreeLand(c, tx, ty) });
      if (!path || path.length < 2) { bump(why, 'no path found to the settlement within 9,000 nodes'); continue; }
      // the world counts every animal here, deer and sheep with the wolves, and where each began as a den
      const byPath = c.animals.filter((a) => { for (let k = 0; k < path.length; k += 2) if (hyp(a.denX - path[k], a.denY - path[k + 1]) < 12) return true; return false; });
      if (!nearEdge.some((a) => a.type === 'wolf') && !byPath.some((a) => a.type === 'wolf')) openWolvesOnly++;
      if (nearEdge.length) { bump(why, `an animal within 14 tiles of the edge point (${kinds(nearEdge)})`); continue; }
      if (byPath.length) { bump(why, `the path passes within 12 tiles of where an animal began (${kinds(byPath)})`); continue; }
      open++;
    }
  }
  return { points, open, openWolvesOnly, why };
}
const ways: { day: number; points: number; open: number; openWolvesOnly: number; why: Record<string, number> }[] = [];
for (let i = w.tick + 1; i <= days * DAY; i++) {
  stepWorld(w);
  for (const p of w.persons) if (!known.has(p.id)) { known.add(p.id); if (w.tick - p.birthTick > DAY) arrived++; }
  if (w.tick % 400 === 210) {
    checks++;
    const alive = w.persons.filter((q) => q.alive);
    const pop = alive.length, rules = rulesOf(w);
    let food = 0;
    for (const q of w.persons) food += foodUnits(q.inv);
    for (const b of w.buildings) if (b.store.cap > 0) food += foodUnits(b.store.items);
    const perHead = food / Math.max(1, pop);
    const roofs = w.buildings.filter((b) => isHomeType(b.type)).length, need = Math.ceil(pop / 3.2) - 1;
    const gate = pop >= rules.immigrationCap || pop < 4 ? 0 : w.tick < 4800 ? 1 : w.tick + 1 - (w.stats.lastArrival ?? -99999) < rules.arrivalSpacing ? 2 : perHead < 3.2 ? 3 : roofs < need ? 4 : 5;
    bump(gates, GATES[gate]);
    if (gate >= 3) { foodSeen.push(Math.round(perHead * 10) / 10); roofsShort.push(need - roofs); }
  }
  if (i % (waysEvery * DAY) === 0) { const r = waysIn(w); ways.push({ day: i / DAY, ...r }); }
}
const alive = w.persons.filter((p) => p.alive).length;
const mean = (a: number[]): number => (a.length ? Math.round((10 * a.reduce((x, y) => x + y, 0)) / a.length) / 10 : 0);
const openShare = ways.map((r) => Math.round((100 * r.open) / Math.max(1, r.points)));
const whyAll: Record<string, number> = {};
for (const r of ways) for (const [k, n] of Object.entries(r.why)) bump(whyAll, k, n);
const kindsNow: Record<string, number> = {};
for (const a of w.animals) bump(kindsNow, a.type);
const result = { seed, days, rulesVersion: w.settings.rulesVersion, alive, arrived, animals: kindsNow, map: [w.W, w.H], checks, gates, meanFoodAHead: mean(foodSeen), meanRoofsShort: mean(roofsShort), ways, openShare, whyAll };
if (out) writeFileSync(out, JSON.stringify(result));
const pct = (n: number, d: number): string => (d ? Math.round((100 * n) / d) : 0) + '%';
console.log(`${seed}: ${days} days, rules ${result.rulesVersion}; ${alive} alive, ${arrived} arrived; animals ${JSON.stringify(kindsNow)}; map ${w.W} by ${w.H}`);
console.log(`  ${checks} checks for travellers; where each stopped:`);
for (const k of GATES) if (gates[k]) console.log(`    ${String(gates[k]).padStart(6)} ${pct(gates[k], checks).padStart(4)}  ${k}`);
console.log(`  at the checks past the spacing: food a head ${result.meanFoodAHead} on average (3.2 asked), roofs short by ${result.meanRoofsShort} on average (0 or less passes)`);
const totalPoints = ways.reduce((n, r) => n + r.points, 0), totalOpen = ways.reduce((n, r) => n + r.open, 0), totalWolves = ways.reduce((n, r) => n + r.openWolvesOnly, 0);
console.log(`  were only wolves counted, ${pct(totalWolves, totalPoints)} of edge points would give a way in`);
console.log(`  the way in, read every ${waysEvery} days: ${pct(totalOpen, totalPoints)} of edge points give a way in (lowest reading ${Math.min(...openShare)}%, highest ${Math.max(...openShare)}%); readings with none at all: ${openShare.filter((s) => s === 0).length} of ${openShare.length}`);
for (const [k, n] of Object.entries(whyAll).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(6)} ${pct(n, totalPoints).padStart(4)}  ${k}`);
