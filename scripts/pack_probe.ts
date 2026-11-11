// What is in a pack: a measurement for the carrying rules, not a rule; nothing in the simulation reads it. One ordinary Normal world
// (arrivals on, current rules) is stepped for the given days. Every 50 ticks each living person of twelve and over is read: the weight
// they carry by kind against their capacity, how much of their wood and stone no plan of theirs has spoken for, how far their home is,
// and, from their options generated in observer mode (which leaves the world as it was), whether a pickup of wood or stone is refused
// for want of room and whether a trip that would empty the pack (food home, a delivery to a site, the communal store) is on offer then.
//   node node_modules/vite-node/dist/cli.mjs scripts/pack_probe.ts -- <seed> [days=12] [out.json]
//   node node_modules/vite-node/dist/cli.mjs scripts/pack_probe.ts -- report <dir with the out.json files> [report.txt]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGE_CHILD, DAY, TOOLS, WEIGHT } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { freeOf } from '../src/sim/intent';
import { ageYears, carryCap } from '../src/sim/people';
import { currentWorldSettings } from '../src/sim/profiles';
import type { ItemKind, Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';

const KINDS = ['food', 'water', 'wood', 'stone', 'other material', 'tools', 'other'] as const;
type Kind = typeof KINDS[number];
const FOODS = new Set<string>(['grain', 'fish', 'fruit', 'berries', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat', 'bread', 'meat', 'cooked_meat', 'flour']);
const RAW = new Set<string>(['clay', 'ore', 'planks', 'bricks', 'iron', 'fibre', 'bast', 'handles']);
const TOOLSET = new Set<string>(TOOLS as string[]);
const kindOf = (k: string): Kind => (FOODS.has(k) ? 'food' : k === 'water' ? 'water' : k === 'wood' ? 'wood' : k === 'stone' ? 'stone' : RAW.has(k) ? 'other material' : TOOLSET.has(k) ? 'tools' : 'other');
interface Tally { n: number; cap: number; weight: Record<Kind, number>; foodUnits: number; waterUnits: number; freeWood: number; freeStone: number; full90: number; foodOver1: number; foodOver3: number; foodHomeOffered: number; haulOffered: number; communalOffered: number; noneOffered: number; homeless: number; homeDist: number; homeKnown: number }
const blank = (): Tally => ({ n: 0, cap: 0, weight: Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>, foodUnits: 0, waterUnits: 0, freeWood: 0, freeStone: 0, full90: 0, foodOver1: 0, foodOver3: 0, foodHomeOffered: 0, haulOffered: 0, communalOffered: 0, noneOffered: 0, homeless: 0, homeDist: 0, homeKnown: 0 });
interface Result { seed: string; days: number; rules: number; every: number; all: Tally; refusedStone: Tally; refusedWood: Tally }

function run(seed: string, days: number): Result {
  const w: World = createWorld(currentWorldSettings('normal', seed, { immigration: true }));
  const all = blank(), refusedStone = blank(), refusedWood = blank();
  const read = (t: Tally, p: Person, offered: { foodHome: boolean; haul: boolean; communal: boolean }): void => {
    t.n++;
    const cap = carryCap(w, p);
    t.cap += cap;
    let total = 0;
    for (const [k, n] of Object.entries(p.inv)) {
      const wt = (n ?? 0) * (WEIGHT[k as ItemKind] ?? 0);
      if (wt <= 0) continue;
      t.weight[kindOf(k)] += wt;
      total += wt;
    }
    const food = foodUnits(p.inv);
    t.foodUnits += food;
    t.waterUnits += p.inv.water ?? 0;
    t.freeWood += freeOf(p, 'wood');
    t.freeStone += freeOf(p, 'stone');
    if (total >= cap * 0.9) t.full90++;
    if (food > 1) t.foodOver1++;
    if (food > 3) t.foodOver3++;
    if (offered.foodHome) t.foodHomeOffered++;
    if (offered.haul) t.haulOffered++;
    if (offered.communal) t.communalOffered++;
    if (!offered.foodHome && !offered.haul && !offered.communal) t.noneOffered++;
    const hh = w.households.find((h) => h.id === p.hhId);
    const home = hh?.homeId ? w.byId.get(hh.homeId) : undefined;
    if (home && home.ent === 'building') { t.homeKnown++; t.homeDist += Math.hypot(home.x - p.x, home.y - p.y); } else t.homeless++;
  };
  const end = days * DAY;
  while (w.tick < end) {
    stepWorld(w);
    if (w.tick % 50 !== 0) continue;
    for (const p of w.persons) {
      if (!p.alive || ageYears(w, p) < AGE_CHILD || p.pose === 'sleep') continue;
      const ctx = generateOptions(w, p, true, true);
      const offered = {
        foodHome: ctx.options.some((o) => o.kind === 'deposit' && /^deposit:\d+:food$/.test(o.key)),
        haul: ctx.options.some((o) => o.kind === 'haul'),
        communal: ctx.options.some((o) => o.key.startsWith('communal_stock:') || o.key.startsWith('leave:')),
      };
      read(all, p, offered);
      if (ctx.blocked.some((b) => b.blocked === 'no room in my pack for one stone')) read(refusedStone, p, offered);
      if (ctx.blocked.some((b) => b.blocked === 'no room in my pack for one wood')) read(refusedWood, p, offered);
    }
  }
  return { seed, days, rules: w.settings.rulesVersion ?? 0, every: 50, all, refusedStone, refusedWood };
}

function report(dir: string): string {
  const runs: Result[] = readdirSync(dir).filter((f) => f.startsWith('pack-') && f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  if (!runs.length) throw Error(`no pack-*.json in ${dir}`);
  const L: string[] = [`Pack probe: ${runs.length} seeds (${runs.map((r) => r.seed).join(', ')}), Normal, arrivals on, rules ${runs[0].rules}, ${runs[0].days} days, every ${runs[0].every} ticks, awake people of twelve and over.`];
  const sum = (pick: (r: Result) => Tally): Tally => {
    const t = blank();
    for (const r of runs) {
      const s = pick(r);
      for (const k of Object.keys(t) as (keyof Tally)[]) {
        if (k === 'weight') for (const c of KINDS) t.weight[c] += s.weight[c];
        else (t[k] as number) += s[k] as number;
      }
    }
    return t;
  };
  const show = (name: string, t: Tally, of?: Tally): void => {
    if (!t.n) { L.push('', `${name}: no samples`); return; }
    const pct = (x: number): string => ((x / t.n) * 100).toFixed(0) + '%';
    const total = KINDS.reduce((s, k) => s + t.weight[k], 0);
    L.push('', `${name}: ${t.n} samples${of ? ` (${((t.n / of.n) * 100).toFixed(1)}% of all)` : ''}; capacity ${(t.cap / t.n).toFixed(1)}, carried ${(total / t.n).toFixed(1)} (${((total / t.cap) * 100).toFixed(0)}% full); nine tenths full or more in ${pct(t.full90)}`);
    L.push('  weight carried by kind: ' + KINDS.map((k) => `${k} ${(t.weight[k] / t.n).toFixed(1)} (${total ? ((t.weight[k] / total) * 100).toFixed(0) : 0}%)`).join(', '));
    L.push(`  food portions ${(t.foodUnits / t.n).toFixed(1)} (more than one in ${pct(t.foodOver1)}, more than three in ${pct(t.foodOver3)}); water ${(t.waterUnits / t.n).toFixed(2)}; wood no plan has spoken for ${(t.freeWood / t.n).toFixed(1)}, stone ${(t.freeStone / t.n).toFixed(1)}`);
    L.push(`  a trip that would empty the pack on offer: food home ${pct(t.foodHomeOffered)}, a delivery to a site ${pct(t.haulOffered)}, the communal store or leaving a left-over ${pct(t.communalOffered)}, none of them ${pct(t.noneOffered)}`);
    L.push(`  household has a home in ${pct(t.homeKnown)}; mean distance to it ${t.homeKnown ? (t.homeDist / t.homeKnown).toFixed(1) : '-'} tiles`);
  };
  const a = sum((r) => r.all);
  show('All samples', a);
  show('A stone pickup refused for want of room', sum((r) => r.refusedStone), a);
  show('A wood pickup refused for want of room', sum((r) => r.refusedWood), a);
  return L.join('\n') + '\n';
}

const args = process.argv.slice(2).filter((x) => x !== '--');
if (args[0] === 'report') {
  const text = report(args[1] ?? '.');
  if (args[2]) writeFileSync(args[2], text);
  console.log(text);
} else {
  const seed = args[0] ?? 'meadow';
  const days = Number(args[1] ?? 12);
  const result = run(seed, days);
  if (args[2]) writeFileSync(args[2], JSON.stringify(result));
  console.log(`${seed}: rules ${result.rules}, ${days} days, ${result.all.n} samples, stone refusals ${result.refusedStone.n}, wood refusals ${result.refusedWood.n}`);
}
