import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v52Continuation } from '../tests/helpers/v52ref';
const path = new URL('../tests/v52_continuation.expected.json', import.meta.url);
const actual = v52Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 52 || existsSync(path)) throw new Error('Record only at rules 52 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 52 customers (d2a1543), before rules 52', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 52 continuation changed');
  console.log('Version 52 full serialized continuation unchanged');
}
