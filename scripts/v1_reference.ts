// Record or check the version-1 continuation reference (tests/v1_continuation.expected.json).
//   npx vite-node scripts/v1_reference.ts            compare the current code against the recorded reference
//   npx vite-node scripts/v1_reference.ts --write    record it
//
// Recording is NOT a way to make a failure go away. The reference is taken from the revision at which version 1 was the whole
// of the behaviour; after that, a difference means behaviour written for a later version reached a version-1 world.
import { readFileSync, writeFileSync } from 'node:fs';
import { V1_CASES, computeV1Case } from '../tests/helpers/v1ref';
import type { V1File } from '../tests/helpers/v1ref';

const FILE = new URL('../tests/v1_continuation.expected.json', import.meta.url);
const write = process.argv.includes('--write');

const out: V1File = {
  note: 'A version-1 world, saved, loaded and continued. Recorded before rules version 2 existed; a difference means later behaviour reached a version-1 world.',
  cases: {},
};
for (const c of V1_CASES) {
  const t0 = Date.now();
  out.cases[c.name] = computeV1Case(c);
  console.log(`${c.name}: to tick ${c.ticks[c.ticks.length - 1]} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

if (write) {
  writeFileSync(FILE, JSON.stringify(out, null, 1) + '\n');
  console.log('written', FILE.pathname);
} else {
  const want = JSON.parse(readFileSync(FILE, 'utf8')) as V1File;
  let bad = 0;
  for (const c of V1_CASES) {
    for (const t of c.ticks) {
      const a = out.cases[c.name][String(t)];
      const b = want.cases[c.name]?.[String(t)];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        bad++;
        console.log(`DIFFERS ${c.name} @${t}\n  expected ${JSON.stringify(b)}\n  actual   ${JSON.stringify(a)}`);
      }
    }
  }
  console.log(bad === 0 ? 'version-1 continuation unchanged' : `${bad} version-1 checkpoint(s) differ`);
  process.exit(bad === 0 ? 0 : 1);
}
