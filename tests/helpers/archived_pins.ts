// Which continuation pins run in `npm test` and which are archived, by the rules support floor (src/sim/support_floor.ts).
// A pin is tests/v<N>_continuation.test.ts (one has a name between the number and "_continuation"). Read by vite.config.ts,
// vitest.archive.config.ts and tests/support_floor.test.ts, so the three cannot disagree.
import { readdirSync } from 'node:fs';
import { RULES_SUPPORT_FLOOR } from '../../src/sim/support_floor';

const PIN = /^v(\d+)(?:_[a-z_]+)?_continuation\.test\.ts$/;

/** The rules version a pin test file belongs to, or null when the file is not a pin. */
export const pinVersion = (file: string): number | null => {
  const m = PIN.exec(file);
  return m ? Number(m[1]) : null;
};

/** Pin test files as paths from the repository root: `archived` are below the floor, `kept` are at or above it. */
export function pinFiles(dir = 'tests', floor = RULES_SUPPORT_FLOOR): { archived: string[]; kept: string[] } {
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return { archived: [], kept: [] };
  }
  const archived: string[] = [];
  const kept: string[] = [];
  for (const name of names.sort()) {
    const v = pinVersion(name);
    if (v === null) continue;
    (v < floor ? archived : kept).push(`${dir}/${name}`);
  }
  return { archived, kept };
}
