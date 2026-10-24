import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v26Continuation } from '../tests/helpers/v26ref';
const path = new URL('../tests/v26_continuation.expected.json', import.meta.url);
const actual = v26Continuation();
if (process.argv.includes('--write')) {
 if (Number(CURRENT_RULES_VERSION) !== 26 || existsSync(path)) throw new Error('Record only before the version 27 change');
 writeFileSync(path, JSON.stringify({ source: 'version 26 before free time variety and daily rhythm', ...actual }, null, 2) + '\n');
} else {
 const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
 if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 26 continuation changed');
 console.log('Version 26 continuation unchanged');
}
