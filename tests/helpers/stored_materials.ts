// Explicit staged supplies, skills and stationary neighbours; no assigned outcomes.
import { addPerson, building, done, pin, stage } from './kit';
import { CURRENT_RULES_VERSION } from '../../src/sim/rulesversion';
import { makeSource } from '../../src/sim/sources';
import { observe } from '../../src/sim/knowledge';
import { perceive } from '../../src/sim/perception';
import { generateOptions } from '../../src/sim/decision';
import { reviewIntentions } from '../../src/sim/intent';
import { relOf } from '../../src/sim/relations';
import type { InhabitantObservation } from '../../src/agent/observe';

export function materialPlanScene(version = CURRENT_RULES_VERSION) {
  const s = stage('stored-material-plan');
  s.w.settings.dynamics = 'rich'; s.w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 30, inv: { wood: 2 }, hunger: 100, thirst: 100, energy: 100 });
  const outsider = addPerson(s, 'Dara', 75.5, 70.5, { age: 30 }); pin(outsider);
  const home = building(s, 'lean_to', 38, 38, ada.hhId, { berries: 8 });
  s.w.households.find(h => h.id === ada.hhId)!.homeId = home.id;
  const store = building(s, 'storehouse', 50, 40, 0, { stone: 4 });
  for (const x of [60, 62, 64]) observe(s.w, ada, makeSource(s.w, 'tree', x, 44, 9));
  ada.stats.gathered = 12; ada.skills.wood = 1.8;
  ada.needs.warmth = 100; ada.needs.safety = 100;
  done(s); s.w.tick = 700;
  observe(s.w, ada, store); perceive(s.w, ada);
  reviewIntentions(generateOptions(s.w, ada, true));
  return { w: s.w, ada, outsider, store, home };
}

export function materialPromiseScene(version = CURRENT_RULES_VERSION) {
  const s = stage('stored-material-promise');
  s.w.settings.dynamics = 'rich'; s.w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 30, inv: { wood: 2 }, hunger: 100, thirst: 100, energy: 100 });
  const cora = addPerson(s, 'Cora', 42.5, 42.5, { age: 30, inv: { wood: 3 }, traits: { generosity: 1 }, hunger: 100, thirst: 100, energy: 100 });
  const ben = addPerson(s, 'Ben', 42.5, 40.5, { age: 30, inv: { wood: 1, stone: 1 }, traits: { generosity: 1, sociability: 1 }, hunger: 100, thirst: 100, energy: 100 });
  const outsider = addPerson(s, 'Dara', 75.5, 70.5, { age: 30 }); pin(outsider); pin(cora);
  const home = building(s, 'lean_to', 38, 38, ada.hhId, { berries: 8 });
  s.w.households.find(h => h.id === ada.hhId)!.homeId = home.id;
  const benHome = building(s, 'lean_to', 43, 37, ben.hhId, { berries: 8 });
  s.w.households.find(h => h.id === ben.hhId)!.homeId = benHome.id;
  const store = building(s, 'storehouse', 51, 43, 0, { stone: 5, wood: 3 });
  for (const x of [60, 62, 64]) {
    const tree = makeSource(s.w, 'tree', x, 44, 9);
    observe(s.w, ada, tree); observe(s.w, ben, tree);
  }
  observe(s.w, ada, makeSource(s.w, 'rock', 72, 40, 12));
  ada.stats.gathered = 12; ada.skills.stone = 1.8; ada.skills.wood = 0.5; ada.skills.forage = 0.2;
  ben.stats.gathered = 12; ben.skills.wood = 1.8;
  for (const p of [ada, ben, cora]) { p.needs.warmth = 100; p.needs.safety = 100; }
  relOf(ada, cora.id); relOf(ada, ben.id); relOf(ben, ada.id);
  done(s); s.w.tick = 700;
  // Finite staged pause lets Ada start her request before Ben sets off; it expires normally.
  ben.cooldowns.pause = s.w.tick + 90;
  observe(s.w, ben, store);
  for (const p of [ada, ben]) { perceive(s.w, p); reviewIntentions(generateOptions(s.w, p, true)); }
  return { w: s.w, ada, ben, cora, outsider, store };
}

/** A policy that reads only the restricted offer/own request and inventory. */
export function materialChoice(o: InhabitantObservation, scenario: 'plan' | 'promise') {
  const urgent = o.options.find(a => a.need && o.self.needs[a.need as keyof typeof o.self.needs]?.state === 'critical');
  if (urgent) return urgent;
  if (scenario === 'promise') {
    const ask = o.options.find(a => a.label === 'Ask Ben for stone');
    if (ask && !o.people.requests.some(r => r.direction === 'I asked' && r.other === 'Ben')) return ask;
    const craft = o.options.find(a => a.kind === 'craft' && /pick/i.test(a.label));
    if (craft) return craft;
    if (o.people.requests.some(r => r.direction === 'I asked' && r.status === 'promised'))
      return o.options.find(a => a.kind === 'rest') ?? o.options.find(a => a.kind === 'wander') ?? o.options[0];
  } else {
    const craft = o.options.find(a => a.kind === 'craft' && /axe/i.test(a.label));
    if (craft) return craft;
    const collect = o.options.find(a => a.kind === 'withdraw' && /stone/.test(a.label));
    if (collect) return collect;
  }
  return o.options[0];
}
