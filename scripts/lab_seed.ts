// One seed of the counterfactual lab (see scripts/lab/lab.ts). Prints one JSON line per branch.
//   npx vite-node scripts/lab_seed.ts -- --seed meadow [--profile large] [--fork 4] [--days 8] [--branches nudge:1,nudge:2,...] [--sample 120]
// Run many seeds in parallel, then aggregate: node scripts/lab.mjs --out lab_out --seeds 8
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { DEFAULT_BRANCHES, runLab } from './lab/lab';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'meadow');
const profile = opt('profile', 'large') as ProfileName;
const fork = Number(opt('fork', '4'));
const days = Number(opt('days', '8'));
const sample = Number(opt('sample', '120'));
// `--branches none` runs the control alone (the gates use that)
const branches = opt('branches', DEFAULT_BRANCHES.join(',')).split(',').filter((b) => b && b !== 'none');

const world = createWorld(settingsForProfile(profile, seed, { immigration: false }));
runLab(world, fork, days, branches, sample, (r) => console.log(JSON.stringify({ seed, profile, fork, days, ...r, hashes: undefined })));
// a last line so that a runner can tell a finished seed from one cut short (the lab.mjs runner skips finished seeds when re-run)
console.log(JSON.stringify({ seed, done: true }));
