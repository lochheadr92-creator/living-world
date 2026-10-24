import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v20Continuation } from '../tests/helpers/v20ref';
const path = new URL('../tests/v20_continuation.expected.json', import.meta.url);
const actual = v20Continuation();
if (process.argv.includes('--write')) {
 if (Number(CURRENT_RULES_VERSION) !== 20 || existsSync(path)) throw new Error('Record only before reconciliation');
 writeFileSync(path, JSON.stringify({ source: 'reconciled version 20 before settlement production observations', ...actual }, null, 2) + '\n');
} else {
 const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
 if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 20 continuation changed');
 console.log('Version 20 continuation unchanged');
}
