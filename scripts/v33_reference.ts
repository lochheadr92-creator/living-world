import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { v33Continuation } from '../tests/helpers/v33ref';
const path = new URL('../tests/v33_continuation.expected.json', import.meta.url);
const actual = v33Continuation();
if (process.argv.includes('--write')) {
  if (existsSync(path)) throw new Error('Record only before rules 34 behaviour exists; never overwrite');
  writeFileSync(path, JSON.stringify({ source: '39c3027, rules 33 before winter shelter', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 33 continuation changed');
  console.log('Version 33 full serialized continuation unchanged');
}
