// When does each camp get each workplace? Runs a world and records, per camp (the settlement a building stands nearest to), the day
// each type of building first stands there; and, at chosen days, what each camp has (solid homes, open sites, projects, deposits it knows).
//   npx vite-node scripts/campclock.ts -- --profile huge --seed meadow --days 12 [--arrivals off] [--pop N] [--at 5,6,8]
//   npx vite-node scripts/campclock.ts -- --profile normal --days 12            (the ordinary village, for comparison: one camp)
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { projectLimit, projectsUnderWay } from '../src/sim/act_build';
import { isSolidHome } from '../src/sim/constants';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { nearestHub } from '../src/sim/settlements';
import { makeCtx } from '../src/sim/optutil';
import { hhState } from '../src/sim/options_work';
import { facilityWants, knowsOfAny, upgradeWish } from '../src/sim/production';
import { stageOf } from '../src/sim/people';
import { BUILD_DEF } from '../src/sim/constants';
import { recentFailure } from '../src/sim/knowledge';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const profile = opt('profile', 'huge') as ProfileName;
const seed = opt('seed', 'meadow');
const days = Number(opt('days', '12'));
const popArg = opt('pop', '');
const at = opt('at', '').split(',').filter(Boolean).map(Number);
const w = createWorld(settingsForProfile(profile, seed, { immigration: opt('arrivals', 'off') !== 'off', ...(popArg ? { population: Number(popArg) } : {}) }));
const hubs = [w.camp, ...(w.extraSettlements ?? [])];
const campOf = (x: number, y: number): number => hubs.indexOf(nearestHub(w, x, y));
const TYPES = ['hut', 'house', 'storehouse', 'timber_yard', 'quarry', 'kiln', 'granary', 'bakery', 'hall', 'smithy'];
const first: Record<string, number>[] = hubs.map(() => ({}));
const seen = new Set<number>();
for (const b of w.buildings) seen.add(b.id);

/** for each camp and each workplace it does not yet have: how many of its adults want one right now (facilityWants, src/sim/production.ts) */
function wants(): void {
  const missing = ['timber_yard', 'quarry', 'kiln', 'granary', 'bakery', 'hall', 'smithy'];
  console.log('adults wanting a ...   (and, of those, how many failed to find a place for it in the last 900 ticks) (of the camp\'s adults; a want needs the person to know enough trees/rocks and the signal to pass; whether they then act is decided by the planner)');
  console.log('camp  adults  ' + missing.map((m) => m.padEnd(12)).join(''));
  hubs.forEach((h, i) => {
    const adults = w.persons.filter((p) => p.alive && stageOf(w, p) !== 'child' && campOf(p.x, p.y) === i);
    const count: Record<string, number> = {};
    const noSpot: Record<string, number> = {};
    for (const p of adults) {
      const ctx = makeCtx(w, p, false);
      for (const f of facilityWants(ctx)) {
        count[f.type] = (count[f.type] ?? 0) + 1;
        // the planner's own memory of having failed to find a place for it (production.ts: key -3000 - index of the type)
        if (recentFailure(w, p, -3000 - Object.keys(BUILD_DEF).indexOf(f.type), 900)) noSpot[f.type] = (noSpot[f.type] ?? 0) + 1;
      }
    }
    const has = (t: string) => first[i][t] !== undefined;
    console.log(String(i).padEnd(6) + String(adults.length).padEnd(8) + missing.map((m) => (has(m) ? 'built' : `${count[m] ?? 0}${noSpot[m] ? ` (${noSpot[m]} no spot)` : ''}`).padEnd(12)).join(''));
  });
}

/** the gates of optPlanUpgrade (production.ts), one after the other, for the adults of each camp who live in a hut */
function upgrades(): void {
  console.log('hut -> house: adults living in a hut that pass each gate in turn');
  console.log('camp  in a hut  wish>=.45  food ok  yard+kiln known  no site of their household   (houses built so far in the camp)');
  hubs.forEach((_, i) => {
    const adults = w.persons.filter((p) => p.alive && stageOf(w, p) !== 'child' && campOf(p.x, p.y) === i);
    let hut = 0;
    let wish = 0;
    let food = 0;
    let means = 0;
    let free = 0;
    for (const p of adults) {
      const ctx = makeCtx(w, p, false);
      if (!ctx.home || ctx.home.type !== 'hut') continue;
      hut++;
      if (upgradeWish(ctx) < 0.45) continue;
      wish++;
      if (hhState(ctx).shortage > 0.35) continue;
      food++;
      if (!knowsOfAny(ctx, 'timber_yard') || !knowsOfAny(ctx, 'kiln')) continue;
      means++;
      if (w.sites.some((s) => s.hhId === ctx.hh!.id)) continue;
      free++;
    }
    console.log(String(i).padEnd(6) + [hut, wish, food, means, free].map((v) => String(v).padEnd(10)).join('') + '   ' + w.buildings.filter((b) => b.type === 'house' && campOf(b.x, b.y) === i).length);
  });
}

function snapshot(day: number): void {
  console.log(`\n--- day ${day}: what each camp has ---`);
  wants();
  upgrades();
  console.log('camp  people  solid homes  open sites  projects(limit)  clay pits  outcrops  ore   stock: planks bricks stone wood');
  hubs.forEach((h, i) => {
    const people = w.persons.filter((p) => p.alive && campOf(p.x, p.y) === i).length;
    const homes = w.buildings.filter((b) => isSolidHome(b.type) && campOf(b.x, b.y) === i).length;
    const sites = w.sites.filter((s) => campOf(s.x, s.y) === i).length;
    const near = (type: string, r: number) => w.sources.filter((s) => s.type === type && s.amount > 0 && Math.hypot(s.x - h.x, s.y - h.y) <= r).length;
    const stock = (k: string) => w.buildings.filter((b) => campOf(b.x, b.y) === i).reduce((n, b) => n + ((b.store.items as Record<string, number>)[k] ?? 0), 0);
    console.log(
      [String(i), String(people), String(homes), String(sites), `${projectsUnderWay(w, false, h)}(${projectLimit(w)})`, String(near('clay_pit', 40)), String(near('outcrop', 40)), String(near('ore_vein', 40)), `${stock('planks')} ${stock('bricks')} ${stock('stone')} ${stock('wood')}`].map((v, k) => v.padEnd([6, 8, 13, 12, 17, 11, 10, 6, 0][k])).join(''),
    );
  });
}

for (let t = 1; t <= days * DAY; t++) {
  stepWorld(w);
  if (t % 30 === 0) {
    for (const b of w.buildings) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      const c = campOf(b.x, b.y);
      if (first[c][b.type] === undefined) first[c][b.type] = Math.round((w.tick / DAY) * 10) / 10;
    }
  }
  if (t % DAY === 0 && at.includes(t / DAY)) snapshot(t / DAY);
}
console.log(`\n${profile} ${seed}: first day each camp gets a ...   (blank = not within ${days} days)`);
console.log('camp  ' + TYPES.map((t) => t.padEnd(12)).join(''));
hubs.forEach((_, i) => console.log(String(i).padEnd(6) + TYPES.map((t) => String(first[i][t] ?? '').padEnd(12)).join('')));
const med = (t: string) => {
  const v = first.map((f) => f[t]).filter((x): x is number => x !== undefined).sort((a, b) => a - b);
  return v.length ? `${v[0]} / ${v[Math.floor(v.length / 2)]} / ${v[v.length - 1]} (${v.length} of ${hubs.length})` : 'none';
};
console.log('\nearliest / median / latest camp:');
for (const t of TYPES.slice(1)) console.log(' ', t.padEnd(12), med(t));
