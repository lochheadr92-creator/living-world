import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v21Continuation } from '../tests/helpers/v21ref';
const path = new URL('../tests/v21_continuation.expected.json', import.meta.url);
const actual = v21Continuation();
if (process.argv.includes('--write')) {
 if (Number(CURRENT_RULES_VERSION) !== 21 || existsSync(path)) throw new Error('Record only before reconciliation');
 writeFileSync(path, JSON.stringify({ source: 'reconciled version 21 before exchange journeys', ...actual }, null, 2) + '\n');
} else {
 const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
 if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 21 continuation changed');
 console.log('Version 21 continuation unchanged');
}
