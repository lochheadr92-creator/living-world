import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { stageOf } from '../src/sim/people';
import { generateOptions, rankOptions } from '../src/sim/decision';
const seed = process.argv[2] ?? 'fern';
const day = Number(process.argv[3] ?? 110);
const w = createWorld({ ...defaultSettings(seed), harsh: process.argv[4] === 'harsh' });
for (let i = 0; i < day * 2400; i++) stepWorld(w);
const alive = w.persons.filter((p) => p.alive);
console.log(`day ${day} pop ${alive.length} adults ${alive.filter((p) => stageOf(w, p) === 'adult').length} youths ${alive.filter((p) => stageOf(w, p) === 'youth').length} kids ${alive.filter((p) => stageOf(w, p) === 'child').length}`);
let homeless = 0, withHome = 0;
for (const h of w.households) {
  const members = alive.filter((p) => p.hhId === h.id);
  if (!members.length) continue;
  const home = h.homeId ? w.byId.get(h.homeId) : null;
  if (home && home.ent === 'building') withHome++; else homeless++;
}
console.log('households with a home', withHome, 'homeless', homeless);
for (const s of w.sites) {
  const owner = w.households.find((h) => h.id === s.hhId);
  const members = alive.filter((p) => p.hhId === s.hhId);
  console.log(`site ${s.type} hh${s.hhId} members ${members.length} (${members.map((m) => stageOf(w, m)[0]).join('')}) work ${(100 * s.work / s.workTotal).toFixed(0)}% delivered ${JSON.stringify(s.delivered)} required ${JSON.stringify(s.required)} age ${((w.tick - s.createdTick) / 2400).toFixed(1)}d idle ${((w.tick - s.lastWorkTick) / 2400).toFixed(1)}d status ${s.status}`);
}
const trees = w.sources.filter((s) => s.type === 'tree' && s.amount >= 1).length;
const rocks = w.sources.filter((s) => s.type === 'rock' && s.amount >= 1);
console.log('trees', trees, 'rocks with stone', rocks.length, 'stone total', rocks.reduce((a, r) => a + r.amount, 0));
const stoneCarried = alive.reduce((a, p) => a + (p.inv.stone ?? 0), 0), woodCarried = alive.reduce((a, p) => a + (p.inv.wood ?? 0), 0);
console.log('carried wood', woodCarried, 'stone', stoneCarried);
const acts: Record<string, number> = {};
for (const p of alive) acts[p.activity ? p.activity.kind : 'idle'] = (acts[p.activity ? p.activity.kind : 'idle'] ?? 0) + 1;
console.log(JSON.stringify(acts));
let n = 0;
for (const p of alive) {
  if (stageOf(w, p) !== 'adult' || n >= 6) continue;
  const hh = w.households.find((h) => h.id === p.hhId);
  const home = hh?.homeId ? w.byId.get(hh.homeId) : null;
  const ctx = generateOptions(w, p, true);
  const top = rankOptions(ctx).slice(0, 4).map((o) => `${o.label}@${o.util.toFixed(0)}`).join('; ');
  console.log(`${p.name} hh${p.hhId} home ${home && home.ent === 'building' ? home.type + ' ' + home.condition.toFixed(0) : 'NONE'} act=${p.activity?.label ?? 'idle'} wood ${p.inv.wood ?? 0} stone ${p.inv.stone ?? 0} | ${top}`);
  n++;
}
