// Rules 249 reach probe (docs/GROWTH_PLAN.md "A full oven"): an ordinary Normal world, arrivals on, run for N days at a rules version;
// counts the batches begun at a bakery or a mill by recipe, the loaves and flour made, and the people at the end. A description, not a test.
// usage: npx vite-node scripts/oven_probe.ts -- <seed> <days> <rules>
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
const [seed = 'gen-2', daysArg = '60', rulesArg = '249'] = process.argv.slice(2).filter((a) => a !== '--');
const days = Number(daysArg);
const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: Number(rulesArg) });
const seen = new Map<number, number>();
const begun: Record<string, number> = {};
let firstBakery = -1;
while (w.tick < days * DAY) {
  stepWorld(w);
  for (const b of w.buildings) {
    if (b.type === 'bakery' && firstBakery < 0) firstBakery = Math.round((w.tick / DAY) * 10) / 10;
    const job = b.ops?.job;
    if (!job || (b.type !== 'bakery' && b.type !== 'mill')) continue;
    if (seen.get(b.id) === job.started) continue;
    seen.set(b.id, job.started);
    begun[job.recipe] = (begun[job.recipe] ?? 0) + 1;
  }
}
console.log(JSON.stringify({ seed, days, rules: Number(rulesArg), firstBakeryDay: firstBakery, begun, bread: w.ledger.created.bread ?? 0, flour: w.ledger.created.flour ?? 0, people: w.persons.filter((p) => p.alive).length, deaths: w.deceased.length }));
