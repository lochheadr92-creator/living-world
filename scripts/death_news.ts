// How news of a death spreads: for every death in a run, who loved the person (kin, or an affinity of 45 or more), who has learned
// of it and how (they saw it, came upon the grave, or were told), and how long it took.
//   npx vite-node scripts/death_news.ts <seed> [days] [harsh]
//   npx vite-node scripts/death_news.ts heath 30 harsh
import { createWorld, defaultSettings } from '../src/sim/factory';
import { DAY } from '../src/sim/constants';
import { stepWorld } from '../src/sim/world';

const [seed = 'heath', daysArg = '30', mode] = process.argv.slice(2);
const days = Number(daysArg);
const w = createWorld({ ...defaultSettings(seed), harsh: mode === 'harsh' });

interface Death {
  id: number;
  name: string;
  tick: number;
  cause: string;
  loved: number[];
  learned: Map<number, { tick: number; how: string }>;
}
const deaths: Death[] = [];
let seen = 0;
const how = (text: string): string => (/ told me that /.test(text) ? 'told' : /came upon/.test(text) ? 'found the grave' : 'was there');

for (let t = 0; t < days * DAY; t++) {
  stepWorld(w);
  while (seen < w.deceased.length) {
    const d = w.deceased[seen++];
    const loved = w.persons.filter((q) => q.alive && (q.relations[d.id]?.kin || (q.relations[d.id]?.affinity ?? 0) >= 45)).map((q) => q.id);
    deaths.push({ id: d.id, name: d.name, tick: d.tick, cause: d.cause, loved, learned: new Map() });
  }
  if (t % 50 === 0) {
    for (const d of deaths) {
      for (const qid of d.loved) {
        if (d.learned.has(qid)) continue;
        const q = w.byId.get(qid);
        if (!q || q.ent !== 'person') continue;
        const line = q.log.find((l) => l.tick >= d.tick && l.text.includes(d.name) && /died|grave/.test(l.text));
        if (line) d.learned.set(qid, { tick: line.tick, how: how(line.text) });
      }
    }
  }
}

console.log(`${seed}${mode === 'harsh' ? ' (harsh)' : ''}, ${days} days: ${deaths.length} death${deaths.length === 1 ? '' : 's'}; population ${w.persons.length}`);
for (const d of deaths) {
  const stillAlive = d.loved.filter((q) => w.byId.has(q));
  const learned = [...d.learned.entries()].filter(([q]) => w.byId.has(q));
  const byHow: Record<string, number> = {};
  for (const [, v] of learned) byHow[v.how] = (byHow[v.how] ?? 0) + 1;
  const delays = learned.map(([, v]) => v.tick - d.tick).sort((a, b) => a - b);
  const visited = stillAlive.filter((q) => (w.byId.get(q) as { visitedGraves?: Record<number, number> } | undefined)?.visitedGraves?.[d.id] !== undefined).length;
  const med = delays.length ? delays[Math.floor(delays.length / 2)] : null;
  console.log(
    `  ${d.name} (${d.cause}, day ${(d.tick / DAY).toFixed(1)}): ${d.loved.length} loved them, ${stillAlive.length} still alive; learned ${learned.length}` +
      ` ${JSON.stringify(byHow)}; ${visited} stood at the grave; median wait ${med === null ? '—' : `${med} ticks (${(med / DAY).toFixed(2)} days)`}; ${stillAlive.length - learned.length} not told by day ${days}`,
  );
}
