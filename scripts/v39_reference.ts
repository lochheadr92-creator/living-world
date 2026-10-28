import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v39Continuation } from '../tests/helpers/v39ref';
const path = new URL('../tests/v39_continuation.expected.json', import.meta.url);
const actual = v39Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 39 || existsSync(path)) throw new Error('Record only at rules 39 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main 0fba6ede47fe1e20d939f39a31cda4f834f1002f, before rules 40 stored material supply', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 39 continuation changed');
  console.log('Version 39 full serialized continuation unchanged');
}
