import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v17Continuation } from '../tests/helpers/v17ref';
const path = new URL('../tests/v17_continuation.expected.json', import.meta.url);
const actual = v17Continuation();
if (process.argv.includes('--write')) {
 if (Number(CURRENT_RULES_VERSION) !== 17 || existsSync(path)) throw new Error('Record only before reconciliation');
 writeFileSync(path, JSON.stringify({ source: 'reconciled version 17 before person-held charcoal technique', ...actual }, null, 2) + '\n');
} else {
 const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
 if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 17 continuation changed');
 console.log('Version 17 continuation unchanged');
}
