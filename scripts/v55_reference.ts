import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v55Continuation } from '../tests/helpers/v55ref';
const path = new URL('../tests/v55_continuation.expected.json', import.meta.url);
const actual = v55Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 55 || existsSync(path)) throw new Error('Record only at rules 55 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 55 transport (94f5f8a), before rules 56', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 55 continuation changed');
  console.log('Version 55 full serialized continuation unchanged');
}
