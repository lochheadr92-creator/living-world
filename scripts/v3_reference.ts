// Recorded before integrating wolf defence. Never overwrite to conceal a leak.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v3Continuation } from '../tests/helpers/v3ref';
const path = new URL('../tests/v3_continuation.expected.json', import.meta.url);
const write = process.argv.includes('--write');
if (write && (Number(CURRENT_RULES_VERSION) !== 3 || existsSync(path))) throw new Error('Record only once, before version 4 exists');
const actual = v3Continuation();
if (write) writeFileSync(path, JSON.stringify({ source: 'a5530cfd36ab6bdba9ab62bfa7fb212ee5c79e24; habitation before wolf integration', ...actual }, null, 2) + '\n');
else {
  const { source: _source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version-3 continuation changed');
  console.log('Version-3 continuation unchanged');
}
