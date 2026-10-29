import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v46Continuation } from '../tests/helpers/v46ref';
const path = new URL('../tests/v46_continuation.expected.json', import.meta.url);
const actual = v46Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 46 || existsSync(path)) throw new Error('Record only at rules 46 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 46 winter reserve, before rules 47 winter shelter', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 46 continuation changed');
  console.log('Version 46 full serialized continuation unchanged');
}
