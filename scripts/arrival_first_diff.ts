// First tick (a multiple of 50) at which an ordinary world at rules 251 differs from the same seed at 250 (the version label equalised). usage: <seed> <maxDays>
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
const [seed = 'gen-4', daysArg = '60'] = process.argv.slice(2).filter((a) => a !== '--');
const make = (rulesVersion: number) => createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion });
const a = make(250), b = make(251);
const h = (w: typeof a) => { const v = w.settings.rulesVersion; w.settings.rulesVersion = 250; const x = hashWorld(w); w.settings.rulesVersion = v; return x; };
let out = 0;
while (a.tick < Number(daysArg) * DAY) {
  stepWorld(a); stepWorld(b);
  if (a.tick % 50 === 0 && h(a) !== h(b)) { out = a.tick; break; }
}
console.log(JSON.stringify({ seed, firstDiffTick: out, day: Math.round((out / DAY) * 10) / 10, alive: a.persons.filter((p) => p.alive).length }));
