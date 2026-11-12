// compare the rules 220 (finished), 225 and 226 (running) arrivals-on traces up to the last day every run has reached.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('../../generation-20261113/traces', import.meta.url));
const here = fileURLToPath(new URL('./traces', import.meta.url));
const seeds = ['aspen', 'birch', 'cedar', 'fern', 'gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', 'meadow', 'river'];
const load = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
const arms = {
  220: seeds.map((s) => load(join(base, `${s}-on.json`))),
  225: seeds.map((s) => load(join(here, `${s}-r225.json`))),
  226: seeds.map((s) => load(join(here, `${s}-r226.json`))),
};
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '-');
const pad = (s, n) => String(s).padStart(n);
const upto = Number(process.argv[2] ?? Math.min(...[225, 226].flatMap((a) => arms[a].map((r) => r.daysRun))));
const marks = [12, 36, 60, 84, 108, 120, 144, 168, 192, 216, 240].filter((d) => d <= upto);
console.log(`common day reached by every run: ${upto}; finished: 225 ${arms[225].filter((r) => r.done).length}/12, 226 ${arms[226].filter((r) => r.done).length}/12`);
for (const a of [220, 225, 226]) {
  const rs = arms[a];
  console.log(`\n=== rules ${a} ===  days run: ${rs.map((r) => r.daysRun).join(' ')}`);
  console.log(pad('seed', 8) + marks.map((d) => pad('d' + d, 6)).join('') + '   latest (day)   peak');
  for (const r of rs) console.log(pad(r.seed, 8) + marks.map((d) => pad(r.days[d - 1].alive, 6)).join('') + `   ${pad(r.days[r.days.length - 1].alive, 4)} (${r.daysRun})   ${Math.max(...r.days.map((d) => d.alive))}`);
  console.log(pad('mean', 8) + marks.map((d) => pad(f1(mean(rs.map((r) => r.days[d - 1].alive))), 6)).join(''));
  const span = (r) => r.days.slice(0, upto);
  const tot = (k) => f1(mean(rs.map((r) => span(r).reduce((n, d) => n + d[k], 0))));
  const causes = {};
  for (const r of rs) for (const d of span(r)) for (const [k, n] of Object.entries(d.causes)) causes[k] = (causes[k] ?? 0) + n;
  let falls = 0, fallSeeds = new Set();
  for (const r of rs) { const pop = [28, ...span(r).map((d) => d.alive)]; for (let d = 3; d < pop.length; d++) if (pop[d - 3] - pop[d] >= 8) { falls++; fallSeeds.add(r.seed); d += 3; } }
  console.log(`to day ${upto}, a settlement: born ${tot('born')}, came ${tot('came')}, died ${tot('died')}; falls of 8+ in three days: ${falls} in ${fallSeeds.size} of 12; deaths by cause (all 12): ${JSON.stringify(causes)}`);
  const y = (r) => r.years.filter((x) => x.day <= upto).pop();
  const ya = (get) => f1(mean(rs.map((r) => get(y(r)))));
  const types = ['hut', 'lean_to', 'house', 'hall', 'storehouse', 'timber_yard', 'kiln', 'quarry', 'mine', 'smithy', 'granary', 'mill', 'bakery', 'well', 'cellar'];
  console.log(`at the year's end on or before day ${upto}: ` + types.map((t) => `${t} ${ya((x) => x.buildings[t] ?? 0)}`).join(', '));
  console.log(`  settlements with a: ` + ['house', 'hall', 'smithy', 'granary', 'mill', 'bakery'].map((t) => `${t} ${rs.filter((r) => (y(r).buildings[t] ?? 0) > 0).length}`).join(', ') + `; with 2+ storehouses ${rs.filter((r) => (y(r).buildings.storehouse ?? 0) > 1).length}`);
  console.log(`  couples ${ya((x) => x.couples)}, households ${ya((x) => x.households)}, of one ${ya((x) => x.householdsOfOne)}, children ${ya((x) => x.stages.child ?? 0)}, plots ${ya((x) => x.plots)}, open sites ${ya((x) => Object.values(x.sites).reduce((n, v) => n + v, 0))}, mood ${ya((x) => x.meanMood)}, hungry share to date ${ya((x) => x.life.hungryShare * 100)}%, stone left ${ya((x) => x.stone)}, ore left ${ya((x) => x.ore)}, id counter max ${Math.max(...rs.map((r) => y(r).nextId))}`);
  console.log(`  sites abandoned to date ${ya((x) => x.life.sitesAbandoned)}, chats ${ya((x) => x.life.chats)}, family time ${ya((x) => x.life.familyTime)}, minutes so far ${rs.map((r) => Math.round(r.minutes)).join(' ')}`);
}
