import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v51Continuation } from '../tests/helpers/v51ref';
const path = new URL('../tests/v51_continuation.expected.json', import.meta.url);
const actual = v51Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 51 || existsSync(path)) throw new Error('Record only at rules 51 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 51 batch plans (7dd9066), before rules 51', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 51 continuation changed');
  console.log('Version 51 full serialized continuation unchanged');
}
