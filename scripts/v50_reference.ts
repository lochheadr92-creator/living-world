import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v50Continuation } from '../tests/helpers/v50ref';
const path = new URL('../tests/v50_continuation.expected.json', import.meta.url);
const actual = v50Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 50 || existsSync(path)) throw new Error('Record only at rules 50 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 50 batch plans (7c70fb0), before rules 51', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 50 continuation changed');
  console.log('Version 50 full serialized continuation unchanged');
}
