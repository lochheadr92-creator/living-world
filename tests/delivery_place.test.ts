// STAGED contracts for the agreed delivery place and the remembered outcome (rules 48).
import { afterEach, expect, it } from 'vitest';
import { foodHelpScene } from './helpers/food_help';
import { addPerson, building, done, pin, stage } from './helpers/kit';
import { makeSource } from '../src/sim/sources';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { relOf } from '../src/sim/relations';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { startActivity, endActivity, newActivity } from '../src/sim/activities';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport, foodUnits } from '../src/sim/economy';
import { agreedPlace, askTrustBonus, setDeliveryPlace } from '../src/sim/delivery_place';
import { parseIntervention } from '../scripts/lab/lab';

afterEach(() => setDeliveryPlace(true));

/** Ada (hungry, knows no food) and Ben (knows a fish spot, knows Ada's hut); Ada's household hut is at (44,38). */
function sceneWithHome(version: number) {
  const f = foodHelpScene({ version, source: 'fish_spot' });
  const hut = building({ w: f.w, rng: null as never }, 'hut', 44, 38, f.ada.hhId, {});
  f.w.households.find((h) => h.id === f.ada.hhId)!.homeId = hut.id;
  observe(f.w, f.ben, hut);
  observe(f.w, f.ada, hut);
  return { ...f, hut };
}

it('rules 48: a promise to a person names the asker’s home as the agreed place; rules 47 names only the person', () => {
  const old = sceneWithHome(47);
  expect(agreedPlace(old.w, old.ben, old.ada)).toBeNull();
  old.ask();
  const c47 = old.ben.commitments[0];
  expect(c47.destKind).toBe('person');
  const f = sceneWithHome(48);
  expect(agreedPlace(f.w, f.ben, f.ada)?.id).toBe(f.hut.id);
  f.ask();
  const req = f.w.requests.find((r) => r.from === f.ada.id)!;
  expect(req.status).toBe('promised');
  const c = f.ben.commitments[0];
  expect(c.destKind).toBe('building');
  expect(c.destId).toBe(f.hut.id);
  expect(c.to).toBe(f.ada.id);
  expect(req.note).toMatch(/or leave it at Ada’s hut/);
});

it('rules 48: when the asker is not where expected, the fish are left at her door, credited once, and she eats from her own store', () => {
  const f = sceneWithHome(48);
  f.ask();
  const req = f.w.requests.find((r) => r.from === f.ada.id)!;
  const c = f.ben.commitments[0];
  // Ada goes off out of sight (a staged move: she is foraging far away), so a hand-over cannot find her
  if (f.ada.activity) endActivity(f.w, f.ada, 'interrupted', 'staged');
  f.ada.x = 20.5;
  f.ada.y = 70.5;
  startActivity(f.w, f.ada, newActivity(f.w, f.ada, { kind: 'rest', label: 'Resting (staged)', goal: 'staged: away from home', need: 'warmth', targetId: 0, here: true, amount: 3000, utility: 100, minCommit: 3000, maxTicks: 3200, data: { sticky: true } }));
  f.release();
  let left = false;
  for (let i = 0; i < 2500 && !left; i++) {
    stepWorld(f.w);
    if ((f.hut.store.items.fish ?? 0) > 0) left = true;
  }
  expect(left).toBe(true);
  expect(req.delivered).toBeGreaterThanOrEqual(1);
  expect(c.delivered).toBe(req.delivered);
  expect(f.ada.log.some((l) => /left \d+ fish at our door, as promised/.test(l.text))).toBe(true);
  for (let i = 0; i < 300 && c.status === 'active'; i++) stepWorld(f.w);
  expect(c.status).toBe('done');
  expect(['fulfilled', 'partial']).toContain(req.status);
  expect(req.note).toMatch(/promise kept/);
  // the promise is a delivery only once: the store holds exactly what was credited
  expect(f.hut.store.items.fish).toBe(req.delivered);
  // she comes home and eats from her own store
  endActivity(f.w, f.ada, 'interrupted', 'staged hold released');
  f.ada.x = 45.5;
  f.ada.y = 41.5;
  perceive(f.w, f.ada);
  const o = generateOptions(f.w, f.ada, true, true).options.find((x) => x.kind === 'eat_store' && x.targetId === f.hut.id);
  expect(o?.label).toBe('Eat from the home store');
  startActivity(f.w, f.ada, o!.make!()!);
  for (let i = 0; i < 400 && f.ada.activity; i++) stepWorld(f.w);
  expect(foodUnits(f.hut.store.items)).toBeLessThan(req.delivered!);
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rules 48: a kept promise is remembered, and next time the asker turns to the neighbour who came through', () => {
  const s = stage('ask-trust');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 48;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 30, hunger: 40, thirst: 100, energy: 100, traits: { sociability: 1 } });
  const ben = addPerson(s, 'Ben', 42, 39.5, { age: 30, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 1 } });
  const cal = addPerson(s, 'Cal', 42, 41.5, { age: 30, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 1 } });
  for (const p of [ada, ben, cal]) {
    pin(p);
    p.cooldowns.trade = 1e12;
  }
  for (const q of [ben, cal]) {
    relOf(ada, q.id).affinity = 40;
    relOf(q, ada.id).affinity = 40;
  }
  done(s);
  // the remembered outcome: Ben kept a promise before (the trust a kept promise gives, social.ts fulfillCommitment), Cal did not
  relOf(ada, ben.id).trust = 22;
  relOf(ada, cal.id).trust = 10;
  perceive(w, ada);
  const ctx = generateOptions(w, ada, true, true);
  const askBen = ctx.options.find((o) => o.label === 'Ask Ben for food')!;
  const askCal = ctx.options.find((o) => o.label === 'Ask Cal for food')!;
  expect(askBen.parts.some(([n]) => n === 'they came through before')).toBe(true);
  expect(askCal.parts.some(([n]) => n === 'they came through before')).toBe(false);
  expect(askBen.util).toBeGreaterThan(askCal.util);
  expect(rankOptions(ctx).find((o) => /^Ask .* for food$/.test(o.label))?.label).toBe('Ask Ben for food');
  expect(askTrustBonus(w, 22)).toBeCloseTo(0.96, 5);
  expect(askTrustBonus(w, 90)).toBe(4);
  expect(askTrustBonus(w, -90)).toBe(-4);
  // below 48, or with the switch off, trust changes nothing in the ask
  w.settings.rulesVersion = 47;
  const ctx47 = generateOptions(w, ada, true, true);
  expect(ctx47.options.find((o) => o.label === 'Ask Ben for food')!.parts.some(([n]) => n === 'they came through before')).toBe(false);
  expect(askTrustBonus(w, 22)).toBe(0);
});

it('rules 48: the switch removes the place and the trust lean reversibly; saving and replaying are exact; observing changes nothing', () => {
  const restore = parseIntervention('rich-no-delivery-place').install!();
  const off = sceneWithHome(48);
  expect(agreedPlace(off.w, off.ben, off.ada)).toBeNull();
  off.ask();
  expect(off.ben.commitments[0].destKind).toBe('person');
  restore();
  const f = sceneWithHome(48);
  const before = serializeWorld(f.w);
  agreedPlace(f.w, f.ben, f.ada);
  generateOptions(f.w, f.ben, true, true);
  expect(serializeWorld(f.w)).toBe(before);
  f.ask();
  f.release();
  const saved = serializeWorld(f.w);
  const copy = deserializeWorld(saved);
  for (let i = 0; i < 1500; i++) {
    stepWorld(f.w);
    stepWorld(copy);
  }
  expect(hashWorld(copy)).toBe(hashWorld(f.w));
  expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
  void makeSource;
});
