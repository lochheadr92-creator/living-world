import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v24Continuation } from '../tests/helpers/v24ref';
const path = new URL('../tests/v24_continuation.expected.json', import.meta.url);
const actual = v24Continuation();
if (process.argv.includes('--write')) {
 if (Number(CURRENT_RULES_VERSION) !== 24 || existsSync(path)) throw new Error('Record only before reconciliation');
 writeFileSync(path, JSON.stringify({ source: 'reconciled version 24 before bounded cosmetic retention and historical indexing', ...actual }, null, 2) + '\n');
} else {
 const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
 if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 24 continuation changed');
 console.log('Version 24 continuation unchanged');
}
