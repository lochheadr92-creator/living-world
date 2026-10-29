import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v42Continuation } from '../tests/helpers/v42ref';
const path = new URL('../tests/v42_continuation.expected.json', import.meta.url);
const actual = v42Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 42 || existsSync(path)) throw new Error('Record only at rules 42 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main 809e567a0a99594a82aee00300f63dd267cefdba, before rules 43 heard local demand', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 42 continuation changed');
  console.log('Version 42 full serialized continuation unchanged');
}
