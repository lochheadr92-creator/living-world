// Recorded before full-pack site courier promises (rules version 8) exist. Never overwrite to conceal a leak.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v7Continuation } from '../tests/helpers/v7ref';
const path = new URL('../tests/v7_continuation.expected.json', import.meta.url);
const write = process.argv.includes('--write');
if (write && (Number(CURRENT_RULES_VERSION) !== 7 || existsSync(path))) throw new Error('Record only once, before version 8 exists');
const actual = v7Continuation();
if (write) writeFileSync(path, JSON.stringify({ source: 'fb6e8a579cfc68a5c0ca7f6b124be487f4d2a1fd; before courier recovery', ...actual }, null, 2) + '\n');
else {
  const { source: _source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version-7 continuation changed');
  console.log('Version-7 continuation unchanged');
}
