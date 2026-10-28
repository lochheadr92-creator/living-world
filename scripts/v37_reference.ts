import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v37Continuation } from '../tests/helpers/v37ref';
const path = new URL('../tests/v37_continuation.expected.json', import.meta.url);
const actual = v37Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 37 || existsSync(path)) throw new Error('Record only at rules 37, before the next behaviour change; never overwrite');
  writeFileSync(path, JSON.stringify({ source: '9871662 plus rules 37 local patch, rules 37 rules 37 before achievement aftermath', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 37 continuation changed');
  console.log('Version 37 full serialized continuation unchanged');
}
