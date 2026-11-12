// The hardship calendar of a seed, read from the same hashes the simulation uses (src/sim/hardship.ts updateHardship,
// src/sim/lean_years.ts). Read-only: it builds no world. One line a seed, one character a day, a space between years.
//
//   npx vite-node scripts/hardship_calendar.ts -- [--days 72] [--rules 220|216] [--seeds aspen,birch,...]
//
// `--rules 216` prints the daily one-in-five roll of rules 219 and earlier; `--rules 220` (the default) lean years. The
// calendar is checked once a day at the tick the engine checks (tick 5 of the day), so a season that ends part-way through a
// day shows as ending the next morning; the engine's own record of a world (scripts/hardship_trace.ts) is the measurement.
import { DAY, DAYS_PER_YEAR } from '../src/sim/constants';
import { DRY_CHANCE, LEAN_CHANCE, WINTER_LENGTH } from '../src/sim/hardship';
import { isLeanYear, leanStartDay } from '../src/sim/lean_years';
import { hashString, hashUnit } from '../src/sim/rng';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const days = Number(opt('days', '72'));
const rules = Number(opt('rules', '220'));
const seeds = opt('seeds', 'aspen,birch,cedar,fern,gen-1,gen-2,gen-3,gen-4,gen-5,gen-6,meadow,river').split(',');
const rare = rules >= 220;

console.log(`rules ${rules}: ${rare ? 'lean years (one every two or three)' : 'a lean season on a one-in-five daily roll'}; ${days} days`);
for (const seed of seeds) {
  const key = hashString(seed);
  let until = -1;
  let kind = '';
  let line = '';
  let lean = 0;
  let dry = 0;
  let leanInWinter = 0;
  let seasons = 0;
  for (let d = 0; d < days; d++) {
    const tick = d * DAY + 5;
    if (until >= 0 && tick >= until) {
      until = -1;
      kind = '';
      if (!rare) {
        // before 220 the ending returned before anything could begin that morning
        const w0 = d % DAYS_PER_YEAR >= DAYS_PER_YEAR - WINTER_LENGTH;
        line += (w0 ? 'w' : '.') + (d % DAYS_PER_YEAR === DAYS_PER_YEAR - 1 ? ' ' : '');
        continue;
      }
    }
    if (until < 0 && d >= 2) {
      const into = d % DAYS_PER_YEAR;
      const year = Math.floor(d / DAYS_PER_YEAR);
      const leanYear = rare && isLeanYear(key, year);
      if (!leanYear && into >= 4 && into < 8 && hashUnit(key, d, 0xd217) < DRY_CHANCE) {
        until = tick + Math.round((2 + 3 * hashUnit(key, d, 0xd218)) * DAY);
        kind = 'd';
      } else if (rare ? leanYear && into === leanStartDay(key, year) : hashUnit(key, d, 0x1ea7) < LEAN_CHANCE) {
        until = tick + Math.round((3 + 3 * hashUnit(key, d, 0x1ea8)) * DAY);
        kind = 'L';
        seasons++;
      }
    }
    const winter = d % DAYS_PER_YEAR >= DAYS_PER_YEAR - WINTER_LENGTH;
    if (kind === 'L') lean++;
    if (kind === 'd') dry++;
    if (kind === 'L' && winter) leanInWinter++;
    line += (kind === 'L' ? (winter ? '#' : 'L') : kind === 'd' ? 'd' : winter ? 'w' : '.') + (d % DAYS_PER_YEAR === DAYS_PER_YEAR - 1 ? ' ' : '');
  }
  console.log(`${seed.padEnd(7)} ${line} lean seasons ${seasons}, lean days ${lean}/${days}, dry days ${dry}, lean days in winter ${leanInWinter}`);
}
console.log('key: . ordinary   L lean season   d dry spell   w winter   # lean season during winter');
