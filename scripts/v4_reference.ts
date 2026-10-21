// Recorded before fatal injuries are held through passive recovery. Never overwrite to conceal a leak.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { v4Continuation } from '../tests/helpers/v4ref';
const path = new URL('../tests/v4_continuation.expected.json', import.meta.url);
const write = process.argv.includes('--write');
if (write && (Number(CURRENT_RULES_VERSION) !== 4 || existsSync(path))) throw new Error('Record only once, before version 6 exists');
const actual = v4Continuation();
if (write) writeFileSync(path, JSON.stringify({ source: '0d393504f2650a8e314ad0944ae5d8075641a08b; wolf defence on main, before fatal-injury finality', ...actual }, null, 2) + '\n');
else {
  const { source: _source, ...expected } = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Version-4 continuation changed');
  console.log('Version-4 continuation unchanged');
}
