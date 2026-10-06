// What happens to attempts to make a tool? usage: npx vite-node scripts/toolmaking.ts [seed] [days] [harsh]
// Every finished attempt is counted by tool and by how it ended (and, when it failed, why). This is how it was found that
// "no room to carry it" ended about half of them.
import { DAY } from '../src/sim/constants';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';

const seed = process.argv[2] ?? 'river';
const days = Number(process.argv[3] ?? 30);
const harsh = process.argv[4] === 'harsh';
const w = createWorld({ ...defaultSettings(seed), harsh });
const seen = new Map<number, number>();
const counts: Record<string, number> = {};
let made = 0;
let noRoom = 0;
for (let t = 0; t < days * DAY; t++) {
  stepWorld(w);
  for (const p of w.persons) {
    const r = p.lastResult;
    if (!r || seen.get(p.id) === r.tick) continue;
    seen.set(p.id, r.tick);
    if (!/^Making /.test(r.label)) continue;
    const k = `${r.label} -> ${r.outcome}: ${r.detail}`;
    counts[k] = (counts[k] ?? 0) + 1;
    if (r.outcome === 'success') made++;
    else if (/no room/.test(r.detail ?? '')) noRoom++;
  }
}
console.log(JSON.stringify({ seed, harsh, days, finishedAttempts: made + noRoom, made, refusedForRoom: noRoom }));
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);
