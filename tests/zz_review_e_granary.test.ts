// REVIEW DIAGNOSTIC (agent E). Granary shares vs bins after real spoilage (world.ts spoilGoods -> facilities.ts noteSpoiled),
// and who may eat from a granary they did not fill (withdrawAllowance). Rich dynamics, current rules; staged.
import { expect, it } from 'vitest';
import { stage, addPerson, done, building, pin } from './helpers/kit';
import { stepWorld } from '../src/sim/world';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { addItem } from '../src/sim/economy';
import { noteDeposit, withdrawAllowance, commonsStock } from '../src/sim/facilities';
import { isFacilityType } from '../src/sim/recipes';
import { hasWinterReserve } from '../src/sim/provision';

function granaryScene(name: string, owned: Record<string, number>, commons: number) {
  const s = stage(name);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = CURRENT_RULES_VERSION;
  const a = addPerson(s, 'Ann', 30.5, 30.5, { age: 35 });
  const b = addPerson(s, 'Bob', 32.5, 30.5, { age: 35 });
  const c = addPerson(s, 'Cid', 34.5, 30.5, { age: 35 });
  pin(a); pin(b); pin(c);
  const g = building(s, 'granary', 40, 40, 0);
  const people: Record<string, typeof a> = { Ann: a, Bob: b, Cid: c };
  for (const [who, n] of Object.entries(owned)) {
    addItem(g.store.items, 'grain', n);
    noteDeposit(w, g, people[who], 'grain', n);
  }
  if (commons) addItem(g.store.items, 'grain', commons);
  done(s);
  return { w, g, a, b, c };
}

const sumShares = (g: any, item = 'grain') => Object.values(g.ops.shares as Record<string, Record<string, number>>).reduce((n, sh) => n + (sh[item] ?? 0), 0);

it('Q4a: shares stay consistent with the bins through heavy real spoilage (all grain owned)', () => {
  const { w, g } = granaryScene('review-e-granary-owned', { Ann: 20, Bob: 20 }, 0);
  expect(isFacilityType('granary')).toBe(true);
  expect(g.ops).toBeDefined();
  expect(hasWinterReserve(w)).toBe(true);
  g.condition = 30; // doubles spoilage
  g.ops!.tended = -1e6; g.builtTick = -1e6; // neglected bins
  console.log('Q4a start items', g.store.items.grain, 'shares', JSON.stringify(g.ops!.shares), 'commons', commonsStock(g, 'grain'));
  let violations = 0;
  for (let i = 0; i < 3 * 2400; i++) {
    stepWorld(w);
    if (sumShares(g) > (g.store.items.grain ?? 0)) violations++;
  }
  console.log('Q4a end items', g.store.items.grain ?? 0, 'shares', JSON.stringify(g.ops!.shares), 'sum', sumShares(g), 'commons', commonsStock(g, 'grain'), 'spoiled ledger', w.ledger.spoiled.grain, 'violations', violations);
  expect(violations).toBe(0);
  expect(sumShares(g)).toBe(g.store.items.grain ?? 0);
  expect((g.store.items.grain ?? 0)).toBeLessThan(40);
});

it('Q4b: with unowned (commons) grain in the bins, whose grain spoils?', () => {
  const { w, g } = granaryScene('review-e-granary-commons', { Ann: 20 }, 20);
  g.condition = 30; g.ops!.tended = -1e6; g.builtTick = -1e6;
  const c0 = commonsStock(g, 'grain');
  console.log('Q4b start items', g.store.items.grain, 'shares', JSON.stringify(g.ops!.shares), 'commons', c0);
  let violations = 0;
  for (let i = 0; i < 3 * 2400; i++) {
    stepWorld(w);
    if (sumShares(g) > (g.store.items.grain ?? 0)) violations++;
  }
  console.log('Q4b end items', g.store.items.grain ?? 0, 'shares', JSON.stringify(g.ops!.shares), 'sum', sumShares(g), 'commons', commonsStock(g, 'grain'), 'spoiled', w.ledger.spoiled.grain, 'violations', violations);
  expect(violations).toBe(0);
});

it('Q4c: eating from a granary one did not fill: share 0, ration only when starving', () => {
  const { w, g, b, c } = granaryScene('review-e-granary-ration', { Ann: 20 }, 0);
  b.needs.hunger = 60;
  console.log('Q4c Bob hunger 60 allowance', withdrawAllowance(w, g, b, 'grain', 5));
  expect(withdrawAllowance(w, g, b, 'grain', 5)).toBe(0);
  b.needs.hunger = 20;
  console.log('Q4c Bob hunger 20 allowance', withdrawAllowance(w, g, b, 'grain', 5));
  expect(withdrawAllowance(w, g, b, 'grain', 5)).toBe(3);
  c.needs.hunger = 10;
  console.log('Q4c Cid hunger 10 allowance', withdrawAllowance(w, g, c, 'grain', 5));
});
