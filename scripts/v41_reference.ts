import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v41Continuation } from '../tests/helpers/v41ref';
const path = new URL('../tests/v41_continuation.expected.json', import.meta.url);
const actual = v41Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 41 || existsSync(path)) throw new Error('Record only at rules 41 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main 05bacf767e807df23e41560787f708d468ac31bf, before rules 42 civic benefit', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 41 continuation changed');
  console.log('Version 41 full serialized continuation unchanged');
}
