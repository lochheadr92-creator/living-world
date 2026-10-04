import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import type { SceneId } from '../src/sim/types';
const scene = (process.argv[2] ?? 'contest') as SceneId;
const ticks = Number(process.argv[3] ?? 700);
const w = createWorld({ ...defaultSettings('scene-' + scene), scene });
console.log(w.sceneLabel);
let last = '';
for (let i = 0; i < ticks; i++) {
  stepWorld(w);
  if (i % 20 === 0) {
    const line = w.persons.map((p) => `${p.name}[${p.activity ? p.activity.kind : '-'} h${p.needs.hunger.toFixed(0)} @${p.x.toFixed(0)},${p.y.toFixed(0)} ${JSON.stringify(p.inv)}]`).join('  ');
    if (line !== last) console.log(`t${i}`, line);
    last = line;
  }
}
for (const e of w.events) console.log(`  event t${e.tick} [${e.kind}] ${e.text}`);
for (const p of w.persons) { console.log(p.name, 'log:'); for (const l of p.log.slice(-8)) console.log('   t' + l.tick, l.text); }
for (const r of w.requests) console.log('request', r.kind, r.from, '->', r.to, r.status, r.note);
console.log('ledger', JSON.stringify(conservationReport(w)));
console.log('sites', w.sites.map((s) => `${s.type} work ${s.work.toFixed(0)}/${s.workTotal} delivered ${JSON.stringify(s.delivered)} used ${JSON.stringify(s.used)}`), 'buildings', w.buildings.map((b) => b.type).join(','));
