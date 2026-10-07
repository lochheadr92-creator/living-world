// Births, deaths and arrivals per day, and why the women who could have a child are not expecting one.
//   npx vite-node scripts/growth.ts -- --profile large --days 30 [--arrivals off] [--seed meadow] [--pop N]
//   npx vite-node scripts/growth.ts -- --profile normal --pop 100 --rules scaled --days 30
// Each day's last tick: people, children, born / died / arrived that day, women who are expecting, and the first condition (in the order
// conceptionTick checks them, src/sim/lifecycle.ts) that rules out each other woman aged 17-44, plus the population cap and the room indoors.
import { DAY, isSolidHome } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { foodUnits } from '../src/sim/economy';
import { householdById, membersOf } from '../src/sim/households';
import { ageYears, stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { rulesOf } from '../src/sim/rules';
import { stepWorld } from '../src/sim/world';
import { BIRTH_SPACING_TICKS } from '../src/sim/constants';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const profile = opt('profile', 'large') as ProfileName;
const seed = opt('seed', 'meadow');
const days = Number(opt('days', '30'));
const popArg = opt('pop', '');
const settings = settingsForProfile(profile, seed, { immigration: opt('arrivals', 'on') !== 'off', ...(popArg ? { population: Number(popArg) } : {}) });
if (opt('rules', '') === 'scaled') (settings as { ruleSet?: 'scaled' }).ruleSet = 'scaled';
const w = createWorld(settings);
const founders = w.persons.length;
const rules = rulesOf(w);
console.log(`${profile} ${seed}: ${founders} founders, ${w.W}x${w.H}, rules cap: arrivals stop at ${rules.immigrationCap}, conceptions stop above ${rules.conceptionCap}; arrivals ${settings.immigration ? 'on' : 'off'}`);
console.log('day  people  child  born  died  arrived  expecting | not expecting because: no-partner  age  partner/hh  no-home  3-kids  spacing  food<3  unwell | homes(solid)  roofless-hh');

let lastBorn = 0;
let lastDied = 0;
let lastArrived = 0;
const totals = { born: 0, died: 0, arrived: 0 };
for (let t = 1; t <= days * DAY; t++) {
  stepWorld(w);
  if (t % DAY !== 0) continue;
  const alive = w.persons.filter((p) => p.alive);
  const born = w.persons.filter((p) => p.birthTick > 0).length;
  const died = w.deceased.length;
  const arrived = w.persons.length - founders - born;
  const why: Record<string, number> = { partner: 0, age: 0, partnerHh: 0, home: 0, kids: 0, spacing: 0, food: 0, unwell: 0 };
  let expecting = 0;
  for (const p of alive) {
    if (p.sex !== 'f') continue;
    if (p.pregnantUntil > 0) {
      expecting++;
      continue;
    }
    const age = ageYears(w, p);
    if (p.partnerId === 0) {
      if (age >= 17 && age <= 44) why.partner++;
      continue;
    }
    if (age < 17 || age > 44) {
      why.age++;
      continue;
    }
    const partner = w.byId.get(p.partnerId);
    if (!partner || partner.ent !== 'person' || !partner.alive || partner.hhId !== p.hhId || partner.sex !== 'm') {
      why.partnerHh++;
      continue;
    }
    const hh = householdById(w, p.hhId);
    if (!hh || !hh.homeId) {
      why.home++;
      continue;
    }
    const kids = membersOf(w, hh).filter((m) => stageOf(w, m) === 'child').length;
    if (kids >= 3) {
      why.kids++;
      continue;
    }
    if (w.tick - (p.cooldowns.lastBirth ?? -99999) < BIRTH_SPACING_TICKS) {
      why.spacing++;
      continue;
    }
    const ms = membersOf(w, hh);
    let food = 0;
    for (const m of ms) food += foodUnits(m.inv);
    const home = w.byId.get(hh.homeId);
    if (home && home.ent === 'building') food += foodUnits(home.store.items);
    if (food / Math.max(1, ms.length) < 3) {
      why.food++;
      continue;
    }
    if (p.health < 60 || p.needs.hunger < 35) {
      why.unwell++;
      continue;
    }
  }
  const homes = w.buildings.filter((b) => isSolidHome(b.type)).length;
  const roofless = w.households.filter((h) => !h.homeId || !w.byId.get(h.homeId)).length;
  const day = t / DAY;
  console.log(
    [day, alive.length, alive.filter((p) => stageOf(w, p) === 'child').length, born - lastBorn, died - lastDied, arrived - lastArrived, expecting].map((v) => String(v).padEnd(6)).join('') +
      '| ' +
      Object.values(why).map((v) => String(v).padEnd(11)).join('') +
      '| ' + String(homes).padEnd(13) + roofless,
  );
  totals.born += born - lastBorn;
  totals.died += died - lastDied;
  totals.arrived += arrived - lastArrived;
  lastBorn = born;
  lastDied = died;
  lastArrived = arrived;
}
console.log(`\nover ${days} days: ${totals.born} born, ${totals.died} died, ${totals.arrived} arrived; ${founders} -> ${w.persons.filter((p) => p.alive).length} people`);
