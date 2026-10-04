import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { clockText } from '../src/sim/environment';
const seed = process.argv[2] ?? 'meadow';
const name = process.argv[3] ?? 'Tariq';
const from = Number(process.argv[4] ?? 13000);
const to = Number(process.argv[5] ?? 15000);
const step = Number(process.argv[6] ?? 60);
const w = createWorld({ ...defaultSettings(seed), harsh: process.argv[7] === 'harsh' });
let lastKey = '';
for (let i = 0; i < to; i++) {
  const pp = w.persons.find((q) => q.name === name); const key = pp ? (pp.activity ? pp.activity.kind + pp.activity.targetId : 'none') : 'gone'; const changed = step === 0 && key !== lastKey; if (changed) lastKey = key;
  if (i >= from && (step === 0 ? changed : i % step === 0)) {
    const p = w.persons.find((q) => q.name === name);
    if (!p) { console.log('gone at', i); break; }
    console.log(`t${i} ${clockText(w.tick)} hp ${p.health.toFixed(0)} h${p.needs.hunger.toFixed(0)} t${p.needs.thirst.toFixed(0)} e${p.needs.energy.toFixed(0)} @${p.x.toFixed(1)},${p.y.toFixed(1)} pose=${p.pose} act=${p.activity ? p.activity.kind + '/' + p.activity.phase + '/' + p.activity.label + ' blk=' + p.activity.blocked + ' path=' + p.activity.path.length / 2 + '@' + p.activity.pi / 2 : 'none'} susp=${p.suspended?.kind ?? '-'} conv=${p.convId} pause=${p.cooldowns.pause ?? '-'} nextThink=${p.nextThink} spot=${p.activity ? p.activity.spotX.toFixed(1) + ',' + p.activity.spotY.toFixed(1) : ''}`);
  }
  stepWorld(w);
}
