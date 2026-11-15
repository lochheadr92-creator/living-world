// Rules 250 reach probe (docs/GROWTH_PLAN.md "A wider look for a workshop spot"): an ordinary Normal world, arrivals on, at one rules version
// for N days; the day a granary (or any workshop) was first laid out, counts at the end, the hash at day 5 (the ring still has room, so
// 249 and 250 must agree), and the people. A description, not a test. usage: npx vite-node scripts/ring_probe.ts -- <seed> <days> <rules>
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
const [seed = 'gen-4', daysArg = '60', rulesArg = '250'] = process.argv.slice(2).filter((a) => a !== '--');
const days = Number(daysArg);
const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: Number(rulesArg) });
const first: Record<string, number> = {};
let hash5 = '';
while (w.tick < days * DAY) {
  stepWorld(w);
  for (const e of [...w.buildings, ...w.sites]) if (first[e.type] === undefined) first[e.type] = Math.round((w.tick / DAY) * 10) / 10;
  if (!hash5 && w.tick >= 5 * DAY) {
    const v = w.settings.rulesVersion;
    w.settings.rulesVersion = 249;
    hash5 = hashWorld(w);
    w.settings.rulesVersion = v;
  }
}
const count = (t: string) => w.buildings.filter((b) => b.type === t).length;
console.log(JSON.stringify({ seed, days, rules: Number(rulesArg), hash5, firstDay: { granary: first.granary ?? -1, bakery: first.bakery ?? -1, kiln: first.kiln ?? -1, smithy: first.smithy ?? -1, hall: first.hall ?? -1 }, granaries: count('granary'), bakeries: count('bakery'), kilns: count('kiln'), smithies: count('smithy'), halls: count('hall'), buildings: w.buildings.length, people: w.persons.filter((p) => p.alive).length, deaths: w.deceased.length }));
