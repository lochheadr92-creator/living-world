// Read-only proximity sampling for the review's proposed company inside existing time.
// A nearby person is not necessarily interacting. Samples are every 10 simulation ticks.
import { DAY } from '../src/sim/constants';
import { hashWorld, stepWorld } from '../src/sim/world';
import { timeCategory } from './observers/time_budget';
import { argsOf, worldFromArgs } from './world_args';

const { opt } = argsOf(process.argv);
const { w, loaded } = worldFromArgs(opt);
if (!loaded) throw new Error('This probe requires --load');
const days = Number(opt('days', '1'));
if (!Number.isSafeInteger(days) || days <= 0) throw new Error('Invalid --days');
const sample = opt('sample', 'on');
if (sample !== 'on' && sample !== 'off') throw new Error('Invalid --sample');
const startHash = hashWorld(w), startTick = w.tick, endTick = w.tick + days * DAY;
const counts: Record<string, { samples: number; nearOne: number; nearTwo: number }> = {};
while (w.tick < endTick) {
  if (sample === 'on' && (w.tick - startTick) % 10 === 0) {
    const live = w.persons.filter(p => p.alive && p.pose !== 'sleep');
    for (const p of live) {
      const category = timeCategory(p, w.tick);
      if (!['rest', 'waiting', 'eating_drinking_warming', 'idle'].includes(category)) continue;
      let nearby = 0;
      for (const q of live) {
        if (p === q || p.indoors !== q.indoors) continue;
        if ((p.x - q.x) ** 2 + (p.y - q.y) ** 2 <= 9) nearby++;
      }
      const row = counts[category] ??= { samples: 0, nearOne: 0, nearTwo: 0 };
      row.samples++;
      if (nearby >= 1) row.nearOne++;
      if (nearby >= 2) row.nearTwo++;
    }
  }
  stepWorld(w);
}
console.log(JSON.stringify({ loaded, rules: w.settings.rulesVersion, sample, startTick, endTick, startHash, endHash: hashWorld(w), sampleEveryTicks: 10, radius: 3, definition: 'awake living people, same indoors location or both outdoors; proximity does not establish interaction', counts }));
