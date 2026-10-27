import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v31Continuation } from '../tests/helpers/v31ref';
const path = new URL('../tests/v31_continuation.expected.json', import.meta.url);
const actual = v31Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 32 || existsSync(path)) throw new Error('Record only before rules 32 behaviour exists; never overwrite');
  writeFileSync(path, JSON.stringify({ source: '4d3f35b, rules 31 before observer-facing truth', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 31 continuation changed');
  console.log('Version 31 full serialized continuation unchanged');
}
