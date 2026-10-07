// Replay a world to just before one tick and run that tick under the CPU profiler: what does a slow tick spend its time on?
//   npx vite-node scripts/slowtick.ts -- --profile huge --tick 31217 [--top 25] [--arrivals off]
// The simulation is deterministic, so the replay reaches the same state; only the profiled tick is timed (sampling, 100 µs).
import { Session } from 'node:inspector';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const profile = opt('profile', 'huge') as ProfileName;
const seed = opt('seed', 'meadow');
const tick = Number(opt('tick', '0'));
const top = Number(opt('top', '25'));
const popArg = opt('pop', '');
const world = createWorld(settingsForProfile(profile, seed, { immigration: opt('arrivals', 'on') !== 'off', ...(popArg ? { population: Number(popArg) } : {}) }));
while (world.tick < tick) stepWorld(world);

const session = new Session();
session.connect();
const post = (method: string, params?: object) => new Promise<any>((res, rej) => session.post(method, params, (e, r) => (e ? rej(e) : res(r))));
await post('Profiler.enable');
await post('Profiler.setSamplingInterval', { interval: 100 });
await post('Profiler.start');
const t0 = performance.now();
stepWorld(world);
const ms = performance.now() - t0;
const { profile: prof } = await post('Profiler.stop');

const self = new Map<string, number>();
const byId = new Map<number, any>(prof.nodes.map((n: any) => [n.id, n]));
const dt: number[] = prof.timeDeltas;
prof.samples.forEach((id: number, i: number) => {
  const n = byId.get(id);
  if (['post', '(idle)', '(program)', '(root)'].includes(n.callFrame.functionName)) return; // the profiler's own call and waiting, not the tick
  const key = `${n.callFrame.functionName || '(anonymous)'}  ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`;
  self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0));
});
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log(`tick ${tick} (tick % 2400 = ${tick % 2400}) took ${ms.toFixed(1)} ms under the profiler; ${(total / 1000).toFixed(1)} ms sampled`);
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${(v / 1000).toFixed(1).padStart(8)} ms ${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
process.exit(0);
