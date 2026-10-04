import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { clockText } from '../src/sim/environment';
const seed = process.argv[2] ?? 'alpha';
const days = Number(process.argv[3] ?? 8);
const w = createWorld({ ...defaultSettings(seed), harsh: process.argv[4] === 'harsh' });
for (let i = 0; i <= days * 2400; i++) {
  if (i % 300 === 0) {
    const fire = w.buildings.find((b) => b.type === 'fire');
    const alive = w.persons.filter((p) => p.alive);
    const cold = alive.filter((p) => p.needs.warmth < 25).length;
    const sleeping = alive.filter((p) => p.pose === 'sleep').length;
    const exhausted = alive.filter((p) => p.needs.energy < 10).length;
    const wood = alive.reduce((s, p) => s + (p.inv.wood ?? 0), 0);
    const homes = w.buildings.filter((b) => b.type === 'hut' || b.type === 'lean_to').length;
    const fuelers = alive.filter((p) => p.activity?.kind === 'fuel_fire').length;
    console.log(`t${i} ${clockText(w.tick)} temp ${w.weather.temp.toFixed(0)} ${w.weather.kind} fire ${fire ? fire.fuel.toFixed(0) : '-'} pop ${alive.length} cold ${cold} sleeping ${sleeping} exhausted ${exhausted} carriedWood ${wood} homes ${homes} fueling ${fuelers}`);
  }
  stepWorld(w);
}
