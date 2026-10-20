// Recorded before correcting mood ranking. Never overwrite to conceal a leak.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v4Continuation } from '../tests/helpers/v4ref';
const path = new URL('../tests/v4_continuation.expected.json', import.meta.url);
const write = process.argv.includes('--write');
if (write && (Number(CURRENT_RULES_VERSION) !== 4 || existsSync(path))) throw new Error('Record only once, before version 5 exists');
const actual = v4Continuation();
if (write) writeFileSync(path, JSON.stringify({ source: 'a5530cf plus wolf integration working diff; captured before version 5 mood correction', ...actual }, null, 2) + '\n');
else {
  const { source: _source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version-3 continuation changed');
  console.log('Version-3 continuation unchanged');
}
