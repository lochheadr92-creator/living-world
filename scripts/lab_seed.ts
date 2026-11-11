import {setDepositGeology} from '../src/sim/geology';
import {serializeWorld} from '../src/app/save';
// One seed of the counterfactual lab (see scripts/lab/lab.ts). Prints one JSON line per branch.
//   npx vite-node scripts/lab_seed.ts -- --seed meadow [--profile large] [--fork 4] [--days 8] [--branches nudge:1,nudge:2,...] [--sample 120]
//     [--arrivals on|off] [--rules N] [--arm <spec>]
// Run many seeds in parallel, then aggregate: node scripts/lab.mjs --out lab_out --seeds 8
// `--arm control` (or any one branch spec) runs that one arm alone from the same fork and prints its row WITH its sampled hashes, so
// the runner can run a seed's arms side by side and work out afterwards when each parted from the control (scripts/lab.mjs). An arm
// forks from the same saved world whichever process runs it, so the row is the one the serial run prints.
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { freshRunSettings, parseRunRules, runRulesVersion } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { DEFAULT_BRANCHES, runLab, runBranch, parseIntervention } from './lab/lab';
import { labProvenance, assertLabSourceUnchanged } from './observers/provenance';
import { parseArrivals, parsePinnedRules } from './lab/guard';

const provenance = labProvenance();

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

// The current simulation is the baseline; `--dynamics authored` reproduces older experiments, and `rich-unversioned` a rich
// one from before rules versions existed. A current run is stamped with the current rules version, as a new world in the app
// is: a measurement of "the current simulation" that quietly ran the unversioned baseline would be worthless.
const rules = parseRunRules(opt('dynamics', 'rich'));
const dynamics = rules === 'authored' ? 'authored' : 'rich';
// `--rules N` runs an earlier generation of the rich rules on today's code, as a saved world of that version continues. Its rows
// carry `rulesPinned: true` beside the version, so a pinned run is never read as a measurement of the current simulation.
const pinned = parsePinnedRules(opt('rules', ''), rules);
const rulesVersion = pinned ?? runRulesVersion(rules);
// Arrivals are on, as in a new world in the app: the owner's instruction of 3 November 2026 is to measure the world with
// everything on. Until then the lab always forced them off; `--arrivals off` reproduces those runs and the recorded gate baselines.
const arrivals = parseArrivals(opt('arrivals', 'on'));
const geologyComparison=opt('geology-comparison','no')==='yes';
if(geologyComparison&&fork!==0)throw new Error('Generation geology comparison requires --fork 0; no post-fork resource rewrite is permitted');
const settings=freshRunSettings(rules,profile,seed,{immigration:arrivals});
if (pinned !== undefined) settings.rulesVersion = pinned;
const world = createWorld(settings);
// `dynamics` goes on every row: a result from a rich world is not comparable with one from an authored world, and the gates
// (scripts/gates.ts) refuse to compare them rather than quietly treating one as a baseline for the other.
// `rulesVersion` is on every row beside `dynamics`, explicitly null for an unversioned run: a reader must never have to
// guess a generation from the word "rich". `arrivals` is on every row for the same reason.
const emit=(r:ReturnType<typeof runBranch>,keepHashes=false)=>{assertLabSourceUnchanged(provenance);console.log(JSON.stringify({seed,profile,fork,days,dynamics,rulesVersion,...(pinned!==undefined?{rulesPinned:true}:{}),arrivals,provenance,...(geologyComparison?{generationComparison:true}:{}),...r,...(keepHashes?{}:{hashes:undefined})}));};
const arm=opt('arm','');
if(arm){
 // one arm alone, for the runner's side-by-side mode: the same fork, the same save, this arm only, hashes kept
 if(geologyComparison)throw new Error('--arm cannot be combined with the generation geology comparison');
 while(world.tick<fork*DAY)stepWorld(world);
 emit(runBranch(serializeWorld(world),parseIntervention(arm),days,sample),true);
 assertLabSourceUnchanged(provenance);
 console.log(JSON.stringify({seed,arm,done:true}));
 process.exit(0);
}
runLab(world,fork,days,branches,sample,emit);
if(geologyComparison){
 let baseline;setDepositGeology(false);try{baseline=createWorld(settings);}finally{setDepositGeology(true);}
 const r=runBranch(serializeWorld(baseline),parseIntervention('control'),days,sample);
 emit({...r,divergedAfterTicks:serializeWorld(baseline)!==serializeWorld(world)?0:null,spec:'no-geology-at-generation',summary:'same seed and source locations; spatial mineral quantity field disabled at generation',note:'Different initial mineral quantities; not a post-fork transfer or deletion.'});
}
// a last line so that a runner can tell a finished seed from one cut short (the lab.mjs runner skips finished seeds when re-run)
assertLabSourceUnchanged(provenance);
console.log(JSON.stringify({ seed, done: true }));
