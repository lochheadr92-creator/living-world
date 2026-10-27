import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v30Continuation } from '../tests/helpers/v30ref';
const path = new URL('../tests/v30_continuation.expected.json', import.meta.url);
const actual = v30Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 30 || existsSync(path)) throw new Error('Record only before rules 31 exists; never overwrite');
  writeFileSync(path, JSON.stringify({ source: '62fa4d1, rules 30 before integrated work tastes', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 30 continuation changed');
  console.log('Version 30 full serialized continuation unchanged');
}
