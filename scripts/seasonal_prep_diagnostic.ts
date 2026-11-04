// Read-only seasonal-preparation diagnostic: where a household's stored food actually goes across a winter.
//
// It steps an ordinary world and, per day, records the food held in home stores, how much has been eaten and how much
// has spoiled (from the ordinary ledger reasons), so the WS3 question "is the one-day reserve eaten, spoiled, or left
// unused?" can be answered with denominators instead of guessed. It changes nothing: no person is controlled, no state
// is written, and the run is identical with the sampling on or off.
//
//   npx vite-node scripts/seasonal_prep_diagnostic.ts -- --seed meadow --days 60
//
// A year is DAYS_PER_YEAR days; the last WINTER_LENGTH are winter. The last column pairs the year's eaten and spoiled
// food so a winter's drawdown can be read off directly.
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { DAY, DAYS_PER_YEAR, isHomeType } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { WINTER_LENGTH } from '../src/sim/hardship';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (n: string, d: string): string => { const i = args.indexOf('--' + n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const seed = opt('seed', 'meadow');
const days = Number(opt('days', '60'));

const world = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
const total = days * DAY;

let storeFood = 0;
let eaten = 0;
let spoiled = 0;
const eatKey = (k: string): string => '-' + k;
const spoilKey = (k: string): string => 'x' + k;

const storeFoodNow = (): number => {
  let n = 0;
  for (const b of world.buildings) if (isHomeType(b.type)) n += foodUnits(b.store.items);
  return n;
};

const eatenNow = (): number => (world.ledger.reasons[eatKey('eaten')] ?? 0) + (world.ledger.reasons[eatKey('eaten at the source')] ?? 0);
const spoiledNow = (): number => (world.ledger.reasons[spoilKey('stored food spoiled')] ?? 0) + (world.ledger.reasons[spoilKey('left-out food spoiled')] ?? 0);

console.log(`day  yearDay  storeFood  eaten(Δ)  spoiled(Δ)  winter?`);
let prevEaten = 0;
let prevSpoiled = 0;
for (let d = 1; d <= days; d++) {
  for (let t = 0; t < DAY; t++) stepWorld(world);
  const yearDay = (world.tick / DAY) % DAYS_PER_YEAR;
  const winter = yearDay >= DAYS_PER_YEAR - WINTER_LENGTH;
  storeFood = storeFoodNow();
  eaten = eatenNow();
  spoiled = spoiledNow();
  const de = eaten - prevEaten;
  const ds = spoiled - prevSpoiled;
  prevEaten = eaten;
  prevSpoiled = spoiled;
  console.log(
    `${String(d).padStart(3)}  ${String(Math.round(yearDay)).padStart(3)}     ${String(Math.round(storeFood)).padStart(9)}  ${String(Math.round(de)).padStart(7)}  ${String(Math.round(ds)).padStart(9)}     ${winter ? 'WINTER' : ''}`,
  );
}
console.log(`\ntotal food eaten ${Math.round(eaten)}, spoiled ${Math.round(spoiled)} over ${days} days; ${world.persons.filter((p) => p.alive).length} alive, ${world.deceased.length} dead`);
