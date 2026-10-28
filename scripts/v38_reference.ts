import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v38Continuation } from '../tests/helpers/v38ref';
const path = new URL('../tests/v38_continuation.expected.json', import.meta.url);
const actual = v38Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 38 || existsSync(path)) throw new Error('Record only at rules 38 before successor behaviour; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'main 4135461d167422a5693f2a4c27bc6622ec5dea7b, before rules 39 project-helper choice', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 38 continuation changed');
  console.log('Version 38 full serialized continuation unchanged');
}
