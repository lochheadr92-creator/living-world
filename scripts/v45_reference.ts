import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v45Continuation } from '../tests/helpers/v45ref';
const path = new URL('../tests/v45_continuation.expected.json', import.meta.url);
const actual = v45Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 45 || existsSync(path)) throw new Error('Record only at rules 45 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 45 food help, before rules 46 winter reserve', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 45 continuation changed');
  console.log('Version 45 full serialized continuation unchanged');
}
