import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { foodUnits } from '../src/sim/economy';
import { stageOf } from '../src/sim/people';
const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 30);
const w = createWorld(defaultSettings(seed));
const why: Record<string, number> = {};
let n = 0;
for (let i = 0; i < days * 2400; i++) {
  stepWorld(w);
  if (i % 400 === 211) {
    n++;
    const bump = (k: string) => { why[k] = (why[k] ?? 0) + 1; };
    const pop = w.persons.filter((q) => q.alive).length;
    if (pop >= 54) { bump('pop>=54'); continue; }
    if (w.tick < 4800) { bump('too early'); continue; }
    if (w.tick - (w.stats.lastArrival ?? -99999) < 5200) { bump('gap'); continue; }
    let food = 0;
    for (const q of w.persons) food += foodUnits(q.inv);
    for (const b of w.buildings) if (b.store.cap > 0) food += foodUnits(b.store.items);
    const perHead = food / Math.max(1, pop);
    const roofs = w.buildings.filter((b) => b.type === 'hut' || b.type === 'lean_to').length;
    if (perHead < 3.2) { bump('perHead<3.2'); continue; }
    if (roofs < Math.ceil(pop / 3.2) - 1) { bump('roofs'); continue; }
    bump('rolled(35%)');
  }
  if (i % 2400 === 2399) {
    const pop = w.persons.filter((q) => q.alive).length;
    let food = 0;
    for (const q of w.persons) food += foodUnits(q.inv);
    for (const b of w.buildings) if (b.store.cap > 0) food += foodUnits(b.store.items);
    const roofs = w.buildings.filter((b) => b.type === 'hut' || b.type === 'lean_to').length;
    console.log(`day ${(i + 1) / 2400} pop ${pop} perHead ${(food / pop).toFixed(1)} roofs ${roofs} need ${Math.ceil(pop / 3.2) - 1} adults ${w.persons.filter((q) => q.alive && stageOf(w, q) === 'adult').length}`);
  }
}
console.log(JSON.stringify(why), 'arrivals', w.stats.arrivals ?? 0);
