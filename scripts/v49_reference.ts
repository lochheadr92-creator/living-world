import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v49Continuation } from '../tests/helpers/v49ref';
const path = new URL('../tests/v49_continuation.expected.json', import.meta.url);
const actual = v49Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 49 || existsSync(path)) throw new Error('Record only at rules 49 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 49 public food benefit, before rules 50 batch plans', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 49 continuation changed');
  console.log('Version 49 full serialized continuation unchanged');
}
