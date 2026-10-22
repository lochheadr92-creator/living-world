// Recorded before household shelter plans (rules version 7) exist. Never overwrite to conceal a leak.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v6Continuation } from '../tests/helpers/v6ref';
const path = new URL('../tests/v6_continuation.expected.json', import.meta.url);
const write = process.argv.includes('--write');
if (write && (Number(CURRENT_RULES_VERSION) !== 6 || existsSync(path))) throw new Error('Record only once, before version 7 exists');
const actual = v6Continuation();
if (write) writeFileSync(path, JSON.stringify({ source: 'b050816; fatal-injury finality on main, before household shelter plans', ...actual }, null, 2) + '\n');
else {
  const { source: _source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version-6 continuation changed');
  console.log('Version-6 continuation unchanged');
}
