// Rules 249 check: before the first bakery stands an ordinary world must be the same world at 248 and 249 (the oven touches nothing earlier).
// Prints the world hash at the end of day N for one seed at two rules versions. usage: npx vite-node scripts/oven_hash25.ts -- <seed> <days>
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
const [seed = 'gen-2', daysArg = '25'] = process.argv.slice(2).filter((a) => a !== '--');
const out: Record<string, string | number> = { seed, days: Number(daysArg) };
for (const rules of [248, 249]) {
  const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: rules });
  let bakery = -1;
  while (w.tick < Number(daysArg) * DAY) {
    stepWorld(w);
    if (bakery < 0 && w.buildings.some((b) => b.type === 'bakery' || b.type === 'mill')) bakery = Math.round((w.tick / DAY) * 10) / 10;
  }
  w.settings.rulesVersion = 248; // the hash carries the version label; the state is what is compared
  out['hash' + rules] = hashWorld(w);
  out['firstOvenBuildingDay' + rules] = bakery;
}
console.log(JSON.stringify(out));
