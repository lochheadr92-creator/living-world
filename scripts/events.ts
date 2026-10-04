import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 12);
const w = createWorld({ ...defaultSettings(seed), harsh: process.argv[4] === 'harsh' });
for (let i = 0; i < days * 2400; i++) stepWorld(w);
const norm = (t: string) => t.replace(/[A-Z][a-z]+( [IVX]+)?/g, 'N').replace(/\d+/g, '#');
const hist = new Map<string, number>();
for (const e of w.events) { const k = `[${e.kind}] ` + norm(e.text); hist.set(k, (hist.get(k) ?? 0) + 1); }
console.log([...hist.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${String(v).padStart(4)}  ${k}`).join('\n'));
console.log('pop', w.persons.length, 'deceased', w.deceased.map(d => `${d.name}(${d.cause},${d.age})`).join(', '));
let talked = 0, given = 0, recv = 0; for (const p of w.persons) { talked += p.stats.talked; given += p.stats.given; recv += p.stats.received; }
console.log('talked', talked, 'given', given, 'households', w.households.length, 'buildings', w.buildings.length, 'plots', w.plots.length);
const reqs: Record<string, number> = {}; for (const r of w.requests) reqs[r.kind + ':' + r.status] = (reqs[r.kind + ':' + r.status] ?? 0) + 1; console.log('requests', JSON.stringify(reqs));
