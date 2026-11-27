// Free-time split, the runner (read only; what is counted and why: scripts/observers/free_time.ts).
//   npx vite-node scripts/free_time_split.ts -- --seed meadow --days 20 [--arrivals on] [--sample 5] --out C:/dev/lw_labs/free_time/fresh-meadow.json
//   npx vite-node scripts/free_time_split.ts -- --load C:/dev/lw_saves/rules256/aspen-day96.save.json --rules-up 279 --days 5 --out ...
//   npx vite-node scripts/free_time_report.ts -- a.json b.json ...   (the table)
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { argsOf, worldFromArgs } from './world_args';
import { DAY } from '../src/sim/constants';
import { hashWorld, stepWorld } from '../src/sim/world';
import { emptyTally, observeFreeTime } from './observers/free_time';

const { opt } = argsOf(process.argv);
const days = Number(opt('days', '20'));
const sample = Math.max(1, Number(opt('sample', '5')));
const out = opt('out', '');
if (!out) throw new Error('--out <file.json> is required');
const { w, loaded, startDay } = worldFromArgs(opt, 'meadow');
const startPeople = w.persons.filter((p) => p.alive).length;
const end = w.tick + Math.round(days * DAY);
const tally = emptyTally();
const t0 = Date.now();
let nextNote = w.tick + DAY;
while (w.tick < end) {
  if (w.tick % sample === 0) observeFreeTime(w, tally);
  stepWorld(w);
  if (w.tick >= nextNote) { console.error(`day ${(w.tick / DAY).toFixed(1)} people ${w.persons.filter((p) => p.alive).length} ${((Date.now() - t0) / 1000).toFixed(0)}s`); nextNote += DAY; }
}
const git = (c: string) => { try { return execSync(`git ${c}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
writeFileSync(out, JSON.stringify({
  seed: w.settings.seed, rulesVersion: w.settings.rulesVersion, arrivals: w.settings.immigration, loaded, rulesUp: opt('rules-up', ''),
  startDay, days, sample, startPeople, endPeople: w.persons.filter((p) => p.alive).length, finalHash: hashWorld(w),
  head: git('rev-parse HEAD'), dirty: git('status --short --untracked-files=no').split('\n').filter(Boolean),
  seconds: Math.round((Date.now() - t0) / 1000), ...tally,
}));
console.error(`wrote ${out}`);
