// The resume guard as scripts/lab.mjs runs it: read the existing rows, print why they cannot be mixed with the run about to
// start, and exit non-zero. It creates nothing and starts nothing; the rule itself lives in guard.ts, which is importable.
import { parseRunRules } from '../../src/sim/profiles';
import { checkResumable, parseArrivals, parsePinnedRules } from './guard';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (n: string, d: string): string => {
  const i = args.indexOf('--' + n);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : d;
};
const rules = parseRunRules(opt('dynamics', 'rich'));
const complaint = checkResumable(opt('out', 'current_lab_out'), opt('seeds', '').split(',').filter(Boolean), rules,opt('geology-comparison','no')==='yes', parseArrivals(opt('arrivals', 'on')), parsePinnedRules(opt('rules', ''), rules));
if (complaint) {
  console.error(complaint);
  process.exit(1);
}
