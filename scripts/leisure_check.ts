// How is spare time spent? Runs the same seeds with varied spare time on (rules version 28) and off (`rich-no-leisure`) and counts
// where people go when they wander: how many different parts of the map each person uses, how often they leave the doorstep, and
// what happened to the population. A short mechanism check, not an ensemble: use scripts/lab.mjs for that.
//   npx vite-node scripts/leisure_check.ts -- [--seeds river,meadow,fern] [--days 8] [--profile normal] [--json out.json]
import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { dayFraction } from '../src/sim/environment';
import { createWorld } from '../src/sim/factory';
import { leisureOnSwitch, setLeisure } from '../src/sim/leisure';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { v1Point } from '../tests/helpers/v1ref';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seeds = opt('seeds', 'river,meadow,fern').split(',');
const days = Number(opt('days', '8'));
const profile = opt('profile', 'normal') as ProfileName;
const CELL = 6;

interface Arm {
  seed: string;
  leisure: boolean;
  wanders: number;
  awayFromHome: number;
  byHaunt: Record<string, number>;
  cellsPerPerson: number;
  peopleWhoWandered: number;
  evening: { wanders: number; atSquare: number };
  alive: number;
  deaths: number;
  starts: Record<string, number>;
  wanderShare: number;
  restShare: number;
  ripePlots: number;
  foodAtEnd: number;
}

function run(seed: string, on: boolean): Arm {
  const was = leisureOnSwitch();
  setLeisure(on);
  try {
    const w = createWorld(freshRunSettings(parseRunRules('rich'), profile, seed, { immigration: false }));
    const cells = new Map<number, Set<number>>();
    const byHaunt: Record<string, number> = {};
    const starts: Record<string, number> = {};
    let wanders = 0;
    let away = 0;
    let evening = 0;
    let eveningSquare = 0;
    w.hooks = {
      onActivityStart: (p, a) => {
        starts[a.kind] = (starts[a.kind] ?? 0) + 1;
        if (a.kind !== 'wander') return;
        wanders++;
        const x = a.spotX ?? p.x;
        const y = a.spotY ?? p.y;
        const set = cells.get(p.id) ?? new Set<number>();
        set.add(Math.floor(x / CELL) * 1000 + Math.floor(y / CELL));
        cells.set(p.id, set);
        const key = (a.data.haunt as string | undefined) ?? 'home';
        byHaunt[key] = (byHaunt[key] ?? 0) + 1;
        const home = w.buildings.find((b) => b.id === w.households.find((h) => h.id === p.hhId)?.homeId);
        const hx = home ? home.doorX : w.camp.x;
        const hy = home ? home.doorY : w.camp.y;
        if (Math.hypot(x - hx, y - hy) > 6) away++;
        const frac = dayFraction(w.tick);
        if (frac > 0.62 && frac < 0.78) {
          evening++;
          if (key === 'square') eveningSquare++;
        }
      },
    };
    let sampled = 0;
    let wandering = 0;
    let resting = 0;
    for (let i = 0; i < days * DAY; i++) {
      stepWorld(w);
      for (const p of w.persons) {
        if (!p.alive) continue;
        sampled++;
        if (p.activity?.kind === 'wander') wandering++;
        else if (p.activity?.kind === 'rest') resting++;
      }
    }
    const alive = w.persons.filter((p) => p.alive).length;
    const pt = v1Point(w);
    let total = 0;
    for (const s of cells.values()) total += s.size;
    return {
      seed,
      leisure: on,
      wanders,
      awayFromHome: away,
      byHaunt,
      cellsPerPerson: cells.size ? Math.round((total / cells.size) * 100) / 100 : 0,
      peopleWhoWandered: cells.size,
      evening: { wanders: evening, atSquare: eveningSquare },
      alive,
      deaths: w.persons.length - alive,
      starts,
      wanderShare: Math.round((wandering / Math.max(1, sampled)) * 1000) / 10,
      ripePlots: w.plots.filter((q) => q.state === 'ripe').length,
      foodAtEnd: pt.homeFood + pt.storedFood,
      restShare: Math.round((resting / Math.max(1, sampled)) * 1000) / 10,
    };
  } finally {
    setLeisure(was);
  }
}

const results: Arm[] = [];
for (const s of seeds) {
  for (const on of [true, false]) {
    const r = run(s, on);
    results.push(r);
    console.log(JSON.stringify(r));
  }
}
const mean = (xs: number[]): number => Math.round((xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)) * 100) / 100;
for (const on of [true, false]) {
  const rs = results.filter((r) => r.leisure === on);
  console.log(
    `${on ? 'varied spare time (v28)' : 'rich-no-leisure       '}  wanders ${mean(rs.map((r) => r.wanders))}  away-from-door ${mean(rs.map((r) => (r.awayFromHome / Math.max(1, r.wanders)) * 100))}%  map cells per wandering person ${mean(rs.map((r) => r.cellsPerPerson))}  evening at square ${mean(rs.map((r) => (r.evening.atSquare / Math.max(1, r.evening.wanders)) * 100))}%  alive ${mean(rs.map((r) => r.alive))}  time wandering ${mean(rs.map((r) => r.wanderShare))}%  time resting ${mean(rs.map((r) => r.restShare))}%  ripe plots waiting at end ${mean(rs.map((r) => r.ripePlots))}  food in homes and stores at end ${mean(rs.map((r) => r.foodAtEnd))}`,
  );
}
// what else changed: activity kinds whose starts moved by more than a fifth, summed over the seeds
const sum = (on: boolean): Record<string, number> => {
  const t: Record<string, number> = {};
  for (const r of results.filter((x) => x.leisure === on)) for (const [k, v] of Object.entries(r.starts)) t[k] = (t[k] ?? 0) + v;
  return t;
};
const A = sum(true);
const B = sum(false);
const moved = Object.keys({ ...A, ...B })
  .map((k) => ({ k, a: A[k] ?? 0, b: B[k] ?? 0 }))
  .filter((x) => Math.max(x.a, x.b) >= 20 && Math.abs(x.a - x.b) / Math.max(1, x.b) > 0.2)
  .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b));
console.log('activity kinds that moved by more than 20% (on vs off): ' + (moved.map((x) => `${x.k} ${x.a} vs ${x.b}`).join('; ') || 'none'));
if (opt('json', '')) writeFileSync(opt('json', ''), JSON.stringify(results));
