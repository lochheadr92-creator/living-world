// The proof that a change to the engine changed nothing: load a save point, step it a number of ticks, print the hash of the
// whole world. Run it before a speed-up and after; the same line both times means every person, building and belief ended the
// same. It also prints how long the stepping took, for the speed-up itself.
//
//   node scripts/fast.mjs scripts/hash_from_save.ts -- --load C:\saves\aspen-day84.save.json --ticks 2400
//   (or --seed aspen [--rules N] in place of --load, to hash a fresh world: see scripts/world_args.ts)
import { DAY } from '../src/sim/constants';
import { hashWorld, stepWorld } from '../src/sim/world';
import { argsOf, worldFromArgs } from './world_args';

const { opt } = argsOf(process.argv);
const { w, loaded } = worldFromArgs(opt, 'aspen');
const ticks = Number(opt('ticks', String(DAY)));
const from = w.tick;
const started = Date.now();
for (let i = 0; i < ticks; i++) stepWorld(w);
const ms = Date.now() - started;
const alive = w.persons.filter((p) => p.alive).length;
console.log(`${loaded ? 'save' : 'fresh'} ${w.settings.seed} rules ${w.settings.rulesVersion} ticks ${from} to ${w.tick} alive ${alive} hash ${hashWorld(w)}`);
console.error(`  ${ms} ms for ${ticks} ticks, ${(ms / ticks).toFixed(2)} ms a tick`);
