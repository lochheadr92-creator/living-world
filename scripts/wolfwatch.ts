// What do the wolves cost a settlement? Bites, runs away, wolves turned back by a spear, who died of what, and how many spears.
// usage: npx vite-node scripts/wolfwatch.ts [seed] [days] [harsh]      (prints one JSON line)
import { DAY } from '../src/sim/constants';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';

const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 30);
const harsh = process.argv[4] === 'harsh';
const w = createWorld({ ...defaultSettings(seed), harsh });
let bites = 0;
let turned = 0;
let flee = 0;
let lastId = w.nextId;
w.hooks = {
  onActivityStart: (_p, a) => {
    if (a.kind === 'flee') flee++;
  },
};
for (let t = 0; t < days * DAY; t++) {
  stepWorld(w);
  for (let i = w.events.length - 1; i >= 0; i--) {
    const e = w.events[i];
    if (e.id < lastId) break;
    if (/A wolf bit/.test(e.text)) bites++;
    if (/turned a wolf away/.test(e.text)) turned++;
  }
  lastId = w.nextId;
}
console.log(
  JSON.stringify({
    seed,
    harsh,
    days,
    population: w.persons.filter((p) => p.alive).length,
    deaths: w.deceased.map((d) => ({ name: d.name, cause: d.cause, day: Math.round((d.tick / DAY) * 10) / 10 })),
    bites,
    fledFromWolves: flee,
    wolvesTurnedAway: turned,
    spearsMade: w.ledger.reasons['+crafted: spear'] ?? 0,
    spearsInHand: w.tools.filter((x) => x.kind === 'spear').length,
  }),
);
