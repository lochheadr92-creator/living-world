// Record or check the golden fingerprints of the ordinary world.
//   npx vite-node scripts/golden.ts            compare the current code with tests/golden.expected.json
//   npx vite-node scripts/golden.ts --write    record the current code as the new golden state
//
// The fingerprints are re-recorded in the commit that changes the rules (CLAUDE.md), so --write records the rules version and refuses
// while the file already holds that version's fingerprints (or does not say which version it holds): a change that alters them under
// the same rules version is a failure to explain, not a file to refresh. --write --force records anyway, on purpose.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { GOLDEN_CASES, GOLDEN_SEEDS, computeCase, computeGeneration } from '../tests/helpers/golden';
import type { GoldenFile } from '../tests/helpers/golden';

const FILE = new URL('../tests/golden.expected.json', import.meta.url);
const write = process.argv.includes('--write');
if (write && existsSync(FILE) && !process.argv.includes('--force')) {
  const held = (JSON.parse(readFileSync(FILE, 'utf8')) as GoldenFile).rules;
  if (held === undefined || held === Number(CURRENT_RULES_VERSION))
    throw new Error(`tests/golden.expected.json already holds ${held === undefined ? 'fingerprints of an unrecorded rules version' : `the rules-${held} fingerprints`}; re-record only with a new rules version, or pass --force on purpose`);
}

const out: GoldenFile = {
  note: 'Fingerprints of the ordinary world. Regenerate only when behaviour is meant to change: npx vite-node scripts/golden.ts --write',
  rules: Number(CURRENT_RULES_VERSION),
  cases: {},
  generation: {},
};
for (const seed of GOLDEN_SEEDS) out.generation[seed] = computeGeneration(seed);
console.log(`generation: ${GOLDEN_SEEDS.length} seeds`);
for (const c of GOLDEN_CASES) {
  const t0 = Date.now();
  out.cases[c.name] = computeCase(c);
  console.log(`${c.name}: ${c.ticks[c.ticks.length - 1]} ticks in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

if (write) {
  writeFileSync(FILE, JSON.stringify(out, null, 1) + '\n');
  console.log('written', FILE.pathname);
} else {
  const want = JSON.parse(readFileSync(FILE, 'utf8')) as GoldenFile;
  let bad = 0;
  const cmp = (label: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      bad++;
      console.log('DIFFERS', label, '\n  expected', JSON.stringify(b), '\n  actual  ', JSON.stringify(a));
    }
  };
  for (const s of GOLDEN_SEEDS) cmp('generation ' + s, out.generation[s], want.generation[s]);
  for (const c of GOLDEN_CASES) cmp('case ' + c.name, out.cases[c.name], want.cases[c.name]);
  console.log(bad === 0 ? 'all golden fingerprints match' : `${bad} golden fingerprint(s) differ`);
  process.exit(bad === 0 ? 0 : 1);
}
