// Where do the bytes of a save go?  Breaks the serialised world down by field, raw and compressed, at chosen days.
//
//   npx vite-node scripts/savesize.ts -- --profile huge --at 0,3          days at which to measure (default 0,3)
//   npx vite-node scripts/savesize.ts -- --pop 100 --profile large --at 0,1 --rows 20
//
// "stored" is what the browser keeps for the world: gzip, then (in localStorage) base64 — counted here in base64 characters, the unit the
// quota is in. The whole save is shown in the current format (4) and in the one before it (3, as written by tests/helpers/golden.ts).
// Per-field figures gzip each field on its own, so they do not add up exactly to the whole; per-person fields are all persons' values together.
import { gzipSync } from 'node:zlib';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { serializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { legacySaveText } from '../tests/helpers/golden';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const profile = opt('profile', 'huge') as ProfileName;
const seed = opt('seed', 'meadow');
const popArg = opt('pop', '');
const at = opt('at', '0,3').split(',').map(Number);
const settings = settingsForProfile(profile, seed, { immigration: opt('arrivals', 'off') !== 'off', ...(popArg ? { population: Number(popArg) } : {}) });
const world = createWorld(settings);

const mb = (n: number) => (n / 1e6).toFixed(2);
const stored = (text: string) => Math.ceil((gzipSync(text).length * 4) / 3);

function report(day: number): void {
  const total = serializeWorld(world);
  const old = legacySaveText(world);
  console.log(`\n=== ${profile} ${seed}, day ${day} (tick ${world.tick}), ${world.persons.length} people ===`);
  console.log(`format 3: ${mb(old.length)} MB of JSON, ${mb(stored(old))} MB stored   |   format 4: ${mb(total.length)} MB of JSON, ${mb(stored(total))} MB stored (gzip + base64)`);
  const rows: { name: string; raw: number; gz: number }[] = [];
  const body = (JSON.parse(total) as { world: Record<string, unknown> }).world;
  for (const [k, v] of Object.entries(body)) {
    if (k === 'persons' && v && typeof v === 'object' && '__cols' in v) {
      const cols = v as unknown as { d: Record<string, unknown> };
      for (const [f, col] of Object.entries(cols.d)) {
        const s = JSON.stringify(col);
        rows.push({ name: 'persons.' + f, raw: s.length, gz: stored(s) });
      }
      continue;
    }
    const s = JSON.stringify(v) ?? '';
    rows.push({ name: k, raw: s.length, gz: stored(s) });
  }
  rows.sort((a, b) => b.gz - a.gz);
  const whole = stored(total);
  console.log('field (format 4)'.padEnd(28), 'raw MB'.padStart(8), 'stored MB'.padStart(10), 'of whole'.padStart(9));
  for (const r of rows.slice(0, Number(opt('rows', '12')))) console.log(r.name.padEnd(28), mb(r.raw).padStart(8), mb(r.gz).padStart(10), (Math.round((r.gz / whole) * 1000) / 10 + '%').padStart(9));
}

for (const d of at) {
  while (world.tick < d * DAY) stepWorld(world);
  report(d);
}
