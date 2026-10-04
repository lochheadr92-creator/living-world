// Follow one person through a window of a run. usage: npx vite-node scripts/trace_person.ts <seed> <name> <fromTick> <toTick> [harsh] [every]
import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { clockText } from '../src/sim/environment';

const seed = process.argv[2] ?? 'meadow';
const name = process.argv[3] ?? '';
const from = Number(process.argv[4] ?? 0);
const to = Number(process.argv[5] ?? 1000);
const harsh = process.argv[6] === 'harsh';
const every = Number(process.argv[7] ?? 100);
const w = createWorld({ ...defaultSettings(seed), harsh });
for (let t = 0; t <= to; t++) {
  if (t >= from && t % every === 0) {
    const p = w.persons.find((q) => q.name === name);
    if (!p) {
      console.log(t, 'gone');
      break;
    }
    const a = p.activity;
    console.log(
      `t${t} ${clockText(w.tick)} pos ${p.x.toFixed(0)},${p.y.toFixed(0)} hp ${p.health.toFixed(0)} H${p.needs.hunger.toFixed(0)} T${p.needs.thirst.toFixed(0)} E${p.needs.energy.toFixed(0)} W${p.needs.warmth.toFixed(0)} inv ${JSON.stringify(p.inv)} ${a ? `${a.kind}:${a.label} (${a.phase}${a.blocked ? ', ' + a.blocked : ''})` : p.pose} | ${p.lastDecision?.because ?? ''} | known water ${(p.bykind.water ?? []).length}`,
    );
  }
  stepWorld(w);
}
