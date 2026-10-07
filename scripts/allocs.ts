// Where does the garbage come from?  Replays a world, then samples every allocation over a stretch of ticks (V8's sampling heap
// profiler) and reports bytes allocated by function. Nothing is timed; sampling only changes how long it takes.
//   npx vite-node scripts/allocs.ts -- --profile huge --from 4800 --ticks 600 [--top 25] [--arrivals off]
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
const from = Number(opt('from', '4800'));
const ticks = Number(opt('ticks', '600'));
const top = Number(opt('top', '25'));
const popArg = opt('pop', '');
const world = createWorld(settingsForProfile(profile, opt('seed', 'meadow'), { immigration: opt('arrivals', 'off') !== 'off', ...(popArg ? { population: Number(popArg) } : {}) }));
while (world.tick < from) stepWorld(world);

const session = new Session();
session.connect();
const post = (method: string, params?: object) => new Promise<any>((res, rej) => session.post(method, params, (e, r) => (e ? rej(e) : res(r))));
await post('HeapProfiler.enable');
await post('HeapProfiler.startSampling', { samplingInterval: 2048, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
for (let i = 0; i < ticks; i++) stepWorld(world);
const { profile: prof } = await post('HeapProfiler.stopSampling');

const self = new Map<string, number>();
let total = 0;
const walk = (n: any): void => {
  const key = `${n.callFrame.functionName || '(anonymous)'}  ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`;
  let bytes = 0;
  for (const s of n.selfSize ? [n.selfSize] : []) bytes += s;
  if (bytes) {
    self.set(key, (self.get(key) ?? 0) + bytes);
    total += bytes;
  }
  for (const c of n.children ?? []) walk(c);
};
walk(prof.head);
console.log(`${profile}: ticks ${from}..${from + ticks}, ${(total / 1e6).toFixed(1)} MB allocated (live at the end or already collected); ~${(total / ticks / 1024).toFixed(0)} KB per tick`);
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${(v / 1e6).toFixed(2).padStart(8)} MB ${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
process.exit(0);
