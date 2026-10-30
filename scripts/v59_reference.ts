import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v59Continuation } from '../tests/helpers/v59ref';
const path = new URL('../tests/v59_continuation.expected.json', import.meta.url);
if (process.argv.includes('--write') && (Number(CURRENT_RULES_VERSION) !== 59 || existsSync(path))) throw new Error('Record only before rules 60; never overwrite');
const actual = v59Continuation();
if (process.argv.includes('--write')) writeFileSync(path, JSON.stringify({ source: 'main 14485835ebe35c2d79447447c6bd9b4833534543, rules 59 before successor behaviour', ...actual }, null, 2) + '\n');
else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Rules 59 continuation changed');
  console.log('Rules 59 ordinary and active cart continuations unchanged');
}
