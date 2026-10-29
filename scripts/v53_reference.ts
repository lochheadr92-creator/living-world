import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v53Continuation } from '../tests/helpers/v53ref';
const path = new URL('../tests/v53_continuation.expected.json', import.meta.url);
const actual = v53Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 53 || existsSync(path)) throw new Error('Record only at rules 53 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main after rules 53 technique tree (557f647), before rules 53', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 53 continuation changed');
  console.log('Version 53 full serialized continuation unchanged');
}
