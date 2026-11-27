// Scratch-only diagnostic at the actual review decision; hook retains only primitive copies.
import { DAY } from '../src/sim/constants';
import { hashWorld, stepWorld } from '../src/sim/world';
import { argsOf, worldFromArgs } from './world_args';

const { opt } = argsOf(process.argv);
const { w, loaded } = worldFromArgs(opt);
if (!loaded) throw new Error('Requires --load');
const sample = opt('sample', 'on');
if (sample !== 'on' && sample !== 'off') throw new Error('Invalid --sample');
const startHash = hashWorld(w), startTick = w.tick, end = startTick + DAY;
const groups: Record<string, { count: number; absent: number; currentZero: number; remainingTotal: number }> = {};
if (sample === 'on') w.hooks = { ...w.hooks, onWalkReviewTrace: e => {
  const key = `${e.reason}|${e.kind}|${e.nextKind}|${e.optionKey.replace(/\d+/g, '#')}|target:${e.targetExists}`;
  const row = groups[key] ??= { count: 0, absent: 0, currentZero: 0, remainingTotal: 0 };
  row.count++; if (!e.currentPresent) row.absent++; if (e.current === 0) row.currentZero++; row.remainingTotal += e.remaining;
} };
while (w.tick < end) stepWorld(w);
console.log(JSON.stringify({ loaded, rules: w.settings.rulesVersion, sample, startTick, endTick: w.tick, startHash, endHash: hashWorld(w), groups }));
