import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v29Continuation } from '../tests/helpers/v29ref';
const path = new URL('../tests/v29_continuation.expected.json', import.meta.url);
const actual = v29Continuation();
if (process.argv.includes('--write')) {
  if (Number(CURRENT_RULES_VERSION) !== 29 || existsSync(path)) throw new Error('Record only before rules 30 exists; never overwrite');
  writeFileSync(path, JSON.stringify({ source: 'c31ce120a91401b58f9ab8756b1d0bf4de1cb2c0, before pending-layout claims and occupancy recovery', ...actual }, null, 2) + '\n');
} else {
  const { source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version 29 continuation changed');
  console.log('Version 29 full serialized continuation unchanged');
}
