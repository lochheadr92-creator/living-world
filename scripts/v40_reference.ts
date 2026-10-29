import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v40Continuation } from '../tests/helpers/v40ref';
const path = new URL('../tests/v40_continuation.expected.json', import.meta.url);
const actual = v40Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 40 || existsSync(path)) throw new Error('Record only at rules 40 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main 393e71f0c029fb6df816faa6c407875d6a1b106c, before rules 41 learner-initiated instruction', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 40 continuation changed');
  console.log('Version 40 full serialized continuation unchanged');
}
