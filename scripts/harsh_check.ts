// Survival still matters under rules 195: the same seeds with the harsh setting on (the x1.18 drain factor, a harder world), and the
// Normal setting beside it, at two rules versions, for a given number of days; prints people alive and deaths by cause per seed and
// the means. Read-only, deterministic, no lab infrastructure needed; it is the balance stream's "severe conditions" check
// (docs/ORDINARY_METABOLISM.md). Usage:
//   node node_modules/vite-node/dist/cli.mjs scripts/harsh_check.ts -- <rules> <days> <harsh:on|off> <seed> [seed ...]
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { CRITICAL } from '../src/sim/constants';

const args = process.argv.slice(2).filter((a) => a !== '--');
const rules = Number(args[0]);
const days = Number(args[1]);
const harsh = args[2] === 'harsh:on';
const seeds = args.slice(3);
if (!rules || !days || !seeds.length) throw new Error('usage: <rules> <days> <harsh:on|off> <seed...>');
const causes = ['hunger', 'thirst', 'exposure', 'wolf attack', 'fever', 'injuries'];
const sum: Record<string, number> = { people: 0, deaths: 0, critTicks: 0, personTicks: 0 };
for (const c of causes) sum[c] = 0;
for (const seed of seeds) {
  const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true, harsh }), rulesVersion: rules });
  let crit = 0, person = 0;
  while (w.tick < days * DAY) {
    stepWorld(w);
    if (w.tick % 60 === 0) for (const p of w.persons) if (p.alive) { person++; if (p.needs.hunger < CRITICAL.hunger || p.needs.thirst < CRITICAL.thirst || p.needs.warmth < CRITICAL.warmth) crit++; }
  }
  const alive = w.persons.filter((p) => p.alive).length;
  const by: Record<string, number> = {};
  for (const d of w.deceased) by[d.cause] = (by[d.cause] ?? 0) + 1;
  sum.people += alive; sum.deaths += w.deceased.length; sum.critTicks += crit; sum.personTicks += person;
  for (const c of causes) sum[c] += by[c] ?? 0;
  console.log(`${seed} rules ${rules} harsh ${harsh ? 'on' : 'off'} ${days}d: alive ${alive} deaths ${w.deceased.length} ${JSON.stringify(by)} critical-share ${(crit / Math.max(1, person)).toFixed(3)}`);
}
const n = seeds.length;
console.log(`MEAN rules ${rules} harsh ${harsh ? 'on' : 'off'} ${days}d over ${n}: alive ${(sum.people / n).toFixed(1)} deaths ${(sum.deaths / n).toFixed(1)} ` + causes.map((c) => `${c} ${(sum[c] / n).toFixed(1)}`).join(' ') + ` critical-share ${(sum.critTicks / Math.max(1, sum.personTicks)).toFixed(3)}`);
