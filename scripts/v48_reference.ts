import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v48Continuation } from '../tests/helpers/v48ref';
const path = new URL('../tests/v48_continuation.expected.json', import.meta.url);
const actual = v48Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 48 || existsSync(path)) throw new Error('Record only at rules 48 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 48 delivery place, before the next slice', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 48 continuation changed');
  console.log('Version 48 full serialized continuation unchanged');
}
