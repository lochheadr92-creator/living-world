import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v23Continuation } from '../tests/helpers/v23ref';
const path = new URL('../tests/v23_continuation.expected.json', import.meta.url);
const actual = v23Continuation();
if (process.argv.includes('--write')) {
 if (Number(CURRENT_RULES_VERSION) !== 23 || existsSync(path)) throw new Error('Record only before reconciliation');
 writeFileSync(path, JSON.stringify({ source: 'reconciled version 23 before transmitted household practices', ...actual }, null, 2) + '\n');
} else {
 const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
 if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 23 continuation changed');
 console.log('Version 23 continuation unchanged');
}
