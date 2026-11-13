// Why little bread is baked. Read-only measurement: one ordinary world; from the day a bakery stands, every 300 ticks each
// grown person awake is asked (as an observer, which changes nothing) what they want and what they are offered: whether the
// household wants bread, what is offered that has to do with grain, flour, bread, the mill, the bakery or the bins, how each
// ranks against their first choice, and what is refused and why.
//
//   npx vite-node scripts/bake_probe.ts -- --seed meadow --days 40 [--rules N]
//   (or --load <save point> in place of --seed: see scripts/world_args.ts)
import { DAY } from '../src/sim/constants';
import { worldFromArgs } from './world_args';
import { generateOptions } from '../src/sim/decision';
import { createWorld } from '../src/sim/factory';
import { stageOf } from '../src/sim/people';
import { demandsOf } from '../src/sim/production';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
let seed = opt('seed', 'meadow');
const days = Number(opt('days', '40'));
// a world read from --load (a save point written by a long run) or made fresh (scripts/world_args.ts)
const { w } = worldFromArgs(opt, seed);
seed = w.settings.seed;

const bump = (o: Record<string, number>, k: string): void => { o[k] = (o[k] ?? 0) + 1; };
const ABOUT = /bread|flour|mill|bak|granary|bins/i;
const offered: Record<string, number> = {}, rankOf: Record<string, number[]> = {}, first: Record<string, number> = {}, refused: Record<string, number> = {}, doing: Record<string, number> = {};
let looks = 0, wantsBread = 0, knowsBakery = 0, fourGrain = 0, firstBakery = 0, firstGranary = 0, baking = 0;
for (let i = w.tick + 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (!firstBakery && w.buildings.some((b) => b.type === 'bakery')) firstBakery = w.tick;
  if (!firstGranary && w.buildings.some((b) => b.type === 'granary')) firstGranary = w.tick;
  if (!firstBakery || i % 300 !== 0) continue;
  const g = w.buildings.find((b) => b.type === 'granary');
  for (const p of w.persons) {
    if (!p.alive || stageOf(w, p) === 'child' || p.pose === 'sleep') continue;
    looks++;
    const a = p.activity;
    if (a && ABOUT.test(a.label + ' ' + a.goal)) { baking++; bump(doing, `${a.kind}: ${a.label.replace(/[0-9]+/g, 'N')}`); }
    const ctx = generateOptions(w, p, true, true);
    if (demandsOf(ctx).some((x) => x.item === 'bread')) wantsBread++;
    if (Object.values(p.beliefs).some((b) => b.kind === 'building' && b.btype === 'bakery')) knowsBakery++;
    if ((g?.ops?.shares[p.hhId]?.grain ?? 0) + (p.inv.grain ?? 0) >= 4) fourGrain++;
    const ranked = [...ctx.options].sort((x, y) => y.util - x.util);
    for (const o of ctx.options) {
      if (!ABOUT.test(o.label + ' ' + o.goal)) continue;
      const key = `${o.kind}: ${o.label.replace(/[0-9]+/g, 'N')} [${o.goal.replace(/[0-9]+/g, 'N').slice(0, 50)}]`;
      bump(offered, key);
      (rankOf[key] ??= []).push(ranked.indexOf(o) + 1, Math.round(o.util), Math.round(ranked[0].util));
      if (ranked[0] === o) bump(first, key);
    }
    for (const b of ctx.blocked) { const text = JSON.stringify(b); if (ABOUT.test(text)) { const m = /"blocked":"([^"]*)"/.exec(text); bump(refused, `${(b as { kind?: string }).kind}: ${((b as { label?: string }).label ?? '').replace(/[0-9]+/g, 'N')} -> ${(m ? m[1] : text.slice(0, 80)).replace(/[0-9]+/g, 'N').slice(0, 110)}`); } }
  }
}
const top = (o: Record<string, number>, n: number): string[] => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v}x ${k}`);
const gran = w.buildings.find((b) => b.type === 'granary'), bak = w.buildings.filter((b) => b.type === 'bakery');
console.log(`${seed}: ${days} days, rules ${w.settings.rulesVersion}; first granary day ${(firstGranary / DAY).toFixed(1)}, first bakery day ${(firstBakery / DAY).toFixed(1)}; ${w.persons.filter((p) => p.alive).length} alive`);
console.log(`  looks at a grown person awake since the bakery stood: ${looks}; knows a bakery ${knowsBakery}; four grain in pack or share ${fourGrain}; household wants bread ${wantsBread}; busy with grain, flour or bread ${baking}`);
console.log(`  granary holds ${JSON.stringify(gran?.store.items)}; bakeries hold ${bak.map((b) => JSON.stringify(b.store.items)).join(' ')}; bakery jobs ${bak.map((b) => JSON.stringify(b.ops?.job ? { recipe: b.ops.job.recipe, phase: b.ops.job.phase } : null)).join(' ')}; batches ${bak.map((b) => b.ops?.batches).join(' ')}`);
console.log('  what they were doing about it:\n    ' + top(doing, 10).join('\n    '));
console.log('  offered (times; mean rank, mean worth, mean worth of the first choice):');
for (const line of top(offered, 16)) { const key = line.slice(line.indexOf('x ') + 2); const r = rankOf[key]; const n = r.length / 3; const mean = (k: number) => (r.filter((_, j) => j % 3 === k).reduce((x, y) => x + y, 0) / n).toFixed(0); console.log(`    ${line}  (rank ${mean(0)}, worth ${mean(1)}, first choice ${mean(2)}; chosen first ${first[key] ?? 0} times)`); }
console.log('  refused:\n    ' + top(refused, 16).join('\n    '));
