// Capture once BEFORE habitation is implemented. Never refresh to hide a compatibility failure.
import { writeFileSync, readFileSync } from 'node:fs';
import { v2Continuation } from '../tests/helpers/v2ref';
const path = new URL('../tests/v2_continuation.expected.json', import.meta.url);
const actual = v2Continuation();
if (process.argv.includes('--write')) writeFileSync(path, JSON.stringify({ source: '1a13408, before habitation', ...actual }, null, 2) + '\n');
else {
  const { source: _source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version-2 continuation changed');
  console.log('Version-2 continuation unchanged');
}
