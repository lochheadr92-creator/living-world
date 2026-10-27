import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { v32Continuation } from '../tests/helpers/v32ref';
const path = new URL('../tests/v32_continuation.expected.json', import.meta.url);
const actual = v32Continuation();
if (process.argv.includes('--write')) {
  if (existsSync(path)) throw new Error('Record only before rules 33 behaviour exists; never overwrite');
  writeFileSync(path, JSON.stringify({ source: '073ddb3, rules 32 before leave-heaviest', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 32 continuation changed');
  console.log('Version 32 full serialized continuation unchanged');
}
