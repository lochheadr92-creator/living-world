import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { stageOf } from '../src/sim/people';
const seed = process.argv[2] ?? 'fern';
const days = Number(process.argv[3] ?? 50);
const w = createWorld({ ...defaultSettings(seed), harsh: process.argv[4] === 'harsh' });
const starts: Record<string, number> = {};
w.hooks = { onActivityStart: (p: any, a: any) => { const k = a.kind; starts[k] = (starts[k] ?? 0) + 1; } } as any;
const wx: Record<string, number> = {};
for (let d = 1; d <= days; d++) {
  for (let i = 0; i < 2400; i++) { stepWorld(w); if (i % 100 === 0) wx[w.weather.kind] = (wx[w.weather.kind] ?? 0) + 1; }
  if (d >= 30 && d % 3 === 0) {
    const alive = w.persons.filter((p) => p.alive);
    const homes = w.buildings.filter((b) => b.type === 'hut' || b.type === 'lean_to');
    console.log(`day ${d} pop ${alive.length} (adults ${alive.filter((p) => stageOf(w, p) === 'adult').length}, elders ${alive.filter((p) => stageOf(w, p) === 'elder').length}) homes ${homes.length} avgCond ${(homes.reduce((s, b) => s + b.condition, 0) / Math.max(1, homes.length)).toFixed(0)} temp ${w.weather.temp.toFixed(0)} ${w.weather.kind} | starts: repair ${starts.repair ?? 0} haul ${starts.haul ?? 0} build ${starts.build ?? 0} gather ${starts.gather ?? 0} warm ${starts.warm ?? 0} rest ${starts.rest ?? 0} fuel ${starts.fuel_fire ?? 0} plan ${starts.plan_site ?? 0}`);
    for (const k of Object.keys(starts)) starts[k] = 0;
  }
}
console.log('weather samples', JSON.stringify(wx));
