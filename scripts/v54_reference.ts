import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v54Continuation } from '../tests/helpers/v54ref';
const path = new URL('../tests/v54_continuation.expected.json', import.meta.url);
const actual = v54Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 54 || existsSync(path)) throw new Error('Record only at rules 54 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 54 relocation extensions (aaa95ce), before rules 55', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 54 continuation changed');
  console.log('Version 54 full serialized continuation unchanged');
}
