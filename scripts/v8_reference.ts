// Recorded before the warmth and shelter (rules version 9) exists. Never overwrite to conceal a leak.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v8Continuation } from '../tests/helpers/v8ref';
const path = new URL('../tests/v8_continuation.expected.json', import.meta.url);
const write = process.argv.includes('--write');
if (write && (Number(CURRENT_RULES_VERSION) !== 8 || existsSync(path))) throw new Error('Record only once, before version 9 exists');
const actual = v8Continuation();
if (write) writeFileSync(path, JSON.stringify({ source: 'd7ba86c: the iron-chain fix on main, before the warmth-and-shelter change (version 9) exists', ...actual }, null, 2) + '\n');
else {
  const { source: _source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version-8 continuation changed');
  console.log('Version-8 continuation unchanged');
}
