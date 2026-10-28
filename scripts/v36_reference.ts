import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v36Continuation } from '../tests/helpers/v36ref';
const path = new URL('../tests/v36_continuation.expected.json', import.meta.url);
const actual = v36Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 36 || existsSync(path)) throw new Error('Record only at rules 36, before the next behaviour change; never overwrite');
  writeFileSync(path, JSON.stringify({ source: '9871662 plus rules 36 local patch, rules 36 rules 36 before achievement aftermath', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 36 continuation changed');
  console.log('Version 36 full serialized continuation unchanged');
}
