import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v47Continuation } from '../tests/helpers/v47ref';
const path = new URL('../tests/v47_continuation.expected.json', import.meta.url);
const actual = v47Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 47 || existsSync(path)) throw new Error('Record only at rules 47 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 47 winter shelter, before rules 48 delivery place', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 47 continuation changed');
  console.log('Version 47 full serialized continuation unchanged');
}
