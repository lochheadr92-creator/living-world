import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v27Continuation } from '../tests/helpers/v27ref';
const path = new URL('../tests/v27_continuation.expected.json', import.meta.url);
const actual = v27Continuation();
if (process.argv.includes('--write')) {
 if (Number(CURRENT_RULES_VERSION) !== 27 || existsSync(path)) throw new Error('Record only before version 28 exists');
 writeFileSync(path, JSON.stringify({ source: 'rules 27 before varied spare time', ...actual }, null, 2) + '\n');
} else {
 const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
 if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 27 continuation changed');
 console.log('Version 27 continuation unchanged');
}

