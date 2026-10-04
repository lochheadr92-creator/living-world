import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { ageYears, stageOf } from '../src/sim/people';
import { householdById, membersOf } from '../src/sim/households';
import { foodUnits } from '../src/sim/economy';
import { personOf } from '../src/sim/social';
const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 30);
const harsh = process.argv[4] === 'harsh';
const w = createWorld({ ...defaultSettings(seed), harsh } as any);
let births = 0, arrivals = 0;
const reasons: Record<string, number> = {};
let samples = 0;
for (let i = 0; i < days * 2400; i++) {
  stepWorld(w);
  if (i % 200 === 91) {
    for (const p of w.persons) {
      if (!p.alive || p.sex !== 'f') continue;
      const age = ageYears(w, p);
      if (age < 17 || age > 44) continue;
      samples++;
      const bump = (k: string) => { reasons[k] = (reasons[k] ?? 0) + 1; };
      if (p.pregnantUntil > 0) { bump('pregnant'); continue; }
      if (p.partnerId === 0) { bump('no partner'); continue; }
      const partner = personOf(w, p.partnerId);
      if (!partner || partner.hhId !== p.hhId) { bump('partner elsewhere/dead'); continue; }
      const hh = householdById(w, p.hhId);
      if (!hh || !hh.homeId) { bump('no home'); continue; }
      const kids = membersOf(w, hh).filter((m) => stageOf(w, m) === 'child').length;
      if (kids >= 3) { bump('3+ kids'); continue; }
      if (w.tick - (p.cooldowns.lastBirth ?? -99999) < 3600) { bump('recent birth'); continue; }
      const ms = membersOf(w, hh); let food = 0; for (const m of ms) food += foodUnits(m.inv);
      const h = w.byId.get(hh.homeId); if (h && h.ent === 'building') food += foodUnits(h.store.items);
      if (food / Math.max(1, ms.length) < 3) { bump('food<3/head'); continue; }
      if (p.health < 60 || p.needs.hunger < 35) { bump('weak/hungry'); continue; }
      bump('ELIGIBLE');
    }
  }
}
const ev = w.events.filter((e) => e.kind === 'life');
births = ev.filter((e) => /was born/.test(e.text)).length;
arrivals = ev.filter((e) => /arrives at the settlement/.test(e.text)).length;
console.log(`seed ${seed} days ${days}: births ${births} arrivals ${arrivals} pop ${w.persons.filter((p) => p.alive).length} fertile-woman samples ${samples}`);
console.log(JSON.stringify(reasons));
const women = w.persons.filter((p) => p.alive && p.sex === 'f' && ageYears(w, p) >= 17 && ageYears(w, p) <= 44);
console.log('women 17-44 now:', women.length, ' partnered:', women.filter((p) => p.partnerId).length);
const men = w.persons.filter((p) => p.alive && p.sex === 'm' && ageYears(w, p) >= 17);
console.log('men 17+ now:', men.length, 'partnered:', men.filter((p) => p.partnerId).length);
console.log('ages', w.persons.filter((p) => p.alive).map((p) => `${p.sex}${Math.round(ageYears(w, p))}`).sort().join(' '));
