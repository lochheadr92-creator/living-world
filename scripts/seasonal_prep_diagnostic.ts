// Historical aggregate seasonal diagnostic: home-store levels alongside world-wide food totals.
// These are not reserve-specific flows and cannot by themselves identify a reserve's binding constraint.
//
// It steps an ordinary world and records home-store food alongside aggregate consumption and spoilage. It does not
// follow deposited batches through withdrawals, meals and losses. No person is controlled or supplied with observer data.
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
if (!Number.isInteger(days) || days < 1) throw new Error('Positive integer --days required');

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

console.log(`Historical aggregate diagnostic; rules ${world.settings.rulesVersion}; arrivals off. Eaten/spoiled totals do not trace reserve food.`);
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
