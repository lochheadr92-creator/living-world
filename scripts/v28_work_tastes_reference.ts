import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v28Continuation } from '../tests/helpers/v28_work_tastes_ref';
const path = new URL('../tests/v28_work_tastes_continuation.expected.json', import.meta.url);
const actual = v28Continuation();
if (process.argv.includes('--write')) {
 if (Number(CURRENT_RULES_VERSION) !== 28 || existsSync(path)) throw new Error('Record only before version 29 exists');
 writeFileSync(path, JSON.stringify({ source: 'rules 28 before individual work tastes', ...actual }, null, 2) + '\n');
} else {
 const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
 if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 28 continuation changed');
 console.log('Version 28 continuation unchanged');
}
