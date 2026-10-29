import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v43Continuation } from '../tests/helpers/v43ref';
const path = new URL('../tests/v43_continuation.expected.json', import.meta.url);
const actual = v43Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 43 || existsSync(path)) throw new Error('Record only at rules 43 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main eaa1cc804da5f050488883bcff4baf6c1c16a5d4, before rules 44 varied personal backgrounds', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 43 continuation changed');
  console.log('Version 43 full serialized continuation unchanged');
}
