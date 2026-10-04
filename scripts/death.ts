import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { clockText, dayNumber } from '../src/sim/environment';
import { stageOf } from '../src/sim/people';
import { foodUnits } from '../src/sim/economy';
const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 8);
const w = createWorld({ ...defaultSettings(seed), harsh: process.argv[4] === 'harsh' });
const snap = new Map<number, string>();
let known = 0;
for (let i = 0; i < days * 2400; i++) {
  for (const p of w.persons) {
    if (p.health < 45 || p.needs.thirst < 8 || p.needs.hunger < 8) {
      if (i % 40 === 0)
        snap.set(p.id, `t${i} d${dayNumber(w.tick)} ${clockText(w.tick)} ${p.name} hp ${p.health.toFixed(0)} hunger ${p.needs.hunger.toFixed(0)} thirst ${p.needs.thirst.toFixed(0)} energy ${p.needs.energy.toFixed(0)} warmth ${p.needs.warmth.toFixed(0)} pos ${p.x.toFixed(0)},${p.y.toFixed(0)} act=${p.activity ? p.activity.kind + ':' + p.activity.label + ' phase=' + p.activity.phase + ' blocked=' + p.activity.blocked : 'none'} inv=${JSON.stringify(p.inv)} pose=${p.pose} conv=${p.convId} lastDec=${p.lastDecision?.chosen?.label} alts=${p.lastDecision?.alternatives.map((a) => a.label + '@' + a.utility).join('; ')} blockedOpts=${p.lastDecision?.blocked.map((a) => a.label + ':' + a.blocked).join('; ')} knownWater=${(p.bykind.water ?? []).length} HH[${w.persons.filter((q) => q.hhId === p.hhId && q !== p).map((q) => `${q.name}:${stageOf(w, q)[0]}:${q.activity ? q.activity.kind : 'idle'}:food${foodUnits(q.inv)}:h${q.needs.hunger.toFixed(0)}`).join(' ')}] home=${(() => { const hh = w.households.find((h) => h.id === p.hhId); const hm = hh?.homeId ? w.byId.get(hh.homeId) : null; return hm && hm.ent === 'building' ? hm.type + ' food' + foodUnits(hm.store.items) : 'none'; })()}`);
    }
  }
  stepWorld(w);
  if (w.deceased.length > known) {
    for (let k = known; k < w.deceased.length; k++) {
      const d = w.deceased[k];
      console.log('DEATH', d.name, d.cause, 'tick', d.tick);
      console.log('  last snapshot:', snap.get(d.id));
    }
    known = w.deceased.length;
  }
}
console.log('done; deaths:', w.deceased.length);
