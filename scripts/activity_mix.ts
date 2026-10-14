// What do people start doing? Counts of activity starts by kind over a run, to see where effort goes (authored or rich).
//   npx vite-node scripts/activity_mix.ts -- --seed meadow [--profile large] [--days 15] [--dynamics rich] [--json out.json]
import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { probe, probeReset, probeSnapshot } from '../src/sim/probe';
import { stepWorld } from '../src/sim/world';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'meadow');
const days = Number(opt('days', '15'));
const dynamics = opt('dynamics', 'authored') as 'authored' | 'rich';
const w = createWorld(settingsForProfile(opt('profile', 'large') as ProfileName, seed, { immigration: false, dynamics }));
const counts: Record<string, number> = {};
w.hooks = { onActivityStart: (_p, a) => void (counts[a.kind] = (counts[a.kind] ?? 0) + 1) };
probe.on = true;
probeReset();
try {
  for (let i = 0; i < days * DAY; i++) stepWorld(w);
} finally {
  probe.on = false;
}
const measured = probeSnapshot();
probeReset();
const out = {
  seed,
  dynamics,
  days,
  counts,
  plots: w.plots.length,
  buildings: w.buildings.length,
  moodRankings: measured.moodRankings,
  moodFlips: measured.moodFlips,
  moodFlipRate: measured.moodRankings ? measured.moodFlips / measured.moodRankings : 0,
};
if (opt('json', '')) writeFileSync(opt('json', ''), JSON.stringify(out));
console.log(JSON.stringify(out));
