import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v44Continuation } from '../tests/helpers/v44ref';
const path = new URL('../tests/v44_continuation.expected.json', import.meta.url);
const actual = v44Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 44 || existsSync(path)) throw new Error('Record only at rules 44 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main 7625337ecc95f451b4a8a1529f319e622d5f1c75, before rules 45 food fetch promises', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 44 continuation changed');
  console.log('Version 44 full serialized continuation unchanged');
}
