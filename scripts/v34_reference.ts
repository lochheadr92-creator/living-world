import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v34Continuation } from '../tests/helpers/v34ref';
const path = new URL('../tests/v34_continuation.expected.json', import.meta.url);
const actual = v34Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 35 || existsSync(path)) throw new Error('Record only before rules 35 behaviour exists; never overwrite');
  writeFileSync(path, JSON.stringify({ source: '31cdc6e, rules 34 before crew re-entry consistency', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 34 continuation changed');
  console.log('Version 34 full serialized continuation unchanged');
}
