import { describe, expect, it } from 'vitest';
import { conservationReport, weightOf } from '../src/sim/economy';
import { carryCap, stageOf } from '../src/sim/people';
import { createRequest } from '../src/sim/social';
import type { Commitment, Items, Person } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';
import { run } from './helpers/util';

// STAGED: a hungry person whose pack is full of things that are not food, a few steps from a store with food in it.
function fullPackBesideFood(name: string, who: { age: number; inv: Items }, store: 'hut' | 'storehouse') {
  const s = stage(name);
  const p = addPerson(s, 'Viktor', 44.5, 40.5, { age: who.age, hunger: 30, thirst: 92, energy: 90, inv: who.inv });
  const b = building(s, store, 42, 35, store === 'hut' ? p.hhId : 0, { berries: 6, fish: 2 });
  const w = done(s);
  return { w, p, b };
}

/** every time the person's last result or memory claims there is no food at a store that has food in it */
function falseNoFoodClaims(p: Person, storeHasFood: () => boolean, seen: Set<string>): string[] {
  const out: string[] = [];
  const texts = [p.lastResult ? `${p.lastResult.tick}:${p.lastResult.detail}` : '', ...p.log.map((l) => `${l.tick}:${l.text}`)];
  for (const t of texts) if (/no food there/.test(t) && storeHasFood() && !seen.has(t)) out.push(t);
  for (const t of texts) seen.add(t);
  return out;
}

describe('eating at a store needs no room in the pack', () => {
  const cases: [string, { age: number; inv: Items }, 'hut' | 'storehouse'][] = [
    ['a child carrying a brick and some wood (5 of 5)', { age: 8, inv: { bricks: 1, wood: 1 } }, 'hut'],
    ['an elder carrying seeds and wood (8 of 8)', { age: 70, inv: { seeds: 8, wood: 3 } }, 'storehouse'],
  ];
  for (const [label, who, store] of cases) {
    it(`${label} eats from the ${store} beside them`, () => {
      const { w, p, b } = fullPackBesideFood(`full-pack-${store}`, who, store);
      expect(weightOf(p.inv), 'the pack really is full').toBeGreaterThanOrEqual(carryCap(w, p));
      expect(stageOf(w, p)).toBe(who.age < 12 ? 'child' : 'elder');
      const eaten0 = w.ledger.consumed.berries ?? 0;
      const hunger0 = p.needs.hunger;
      const claims: string[] = [];
      const seen = new Set<string>();
      let ateBy = -1;
      run(w, 300, () => {
        claims.push(...falseNoFoodClaims(p, () => (b.store.items.berries ?? 0) + (b.store.items.fish ?? 0) > 0, seen));
        if (ateBy < 0 && p.needs.hunger > hunger0 + 10) ateBy = w.tick;
      });
      expect(ateBy, 'ate within 300 ticks').toBeGreaterThan(0);
      expect(p.needs.hunger).toBeGreaterThan(70);
      // what was eaten came out of the store and is on the books as eaten, and the pack still holds what it held
      expect((w.ledger.consumed.berries ?? 0) + (w.ledger.consumed.fish ?? 0)).toBeGreaterThan(eaten0);
      expect((b.store.items.berries ?? 0) + (b.store.items.fish ?? 0)).toBeLessThan(8);
      for (const k of Object.keys(who.inv) as (keyof Items)[]) expect(p.inv[k]).toBe(who.inv[k]);
      expect(conservationReport(w).ok).toBe(true);
      // and nobody was told there was no food at a store that had food in it
      expect(claims).toEqual([]);
      expect(p.failures[b.id], 'the store is not written off').toBeUndefined();
    });
  }
});

// STAGED: Kaia, a child, has promised Bea two water while her pack is nearly full of wood (2 wood and a seed: 4.25 of 5),
// so she cannot carry even one (1.5). Traced in seed birch, where both broken water promises in 30 days were like this.
function promisedWaterWithFullPack(name: string, withHome: boolean) {
  const s = stage(name);
  const bea = addPerson(s, 'Bea', 40.5, 24.5, { thirst: 90 });
  const kaia = addPerson(s, 'Kaia', 44.5, 24.5, { age: 9, inv: { wood: 2, seeds: 1 } });
  const hut = withHome ? building(s, 'hut', 47, 20, kaia.hhId) : null;
  const w = done(s);
  const req = createRequest(w, bea, kaia, { kind: 'water', item: 'water', amount: 2 });
  req.status = 'promised';
  const cm: Commitment = { id: w.nextId++, requestId: req.id, kind: 'deliver', to: bea.id, item: 'water', amount: 2, siteId: 0, made: w.tick, deadline: w.tick + 1800, status: 'active', delivered: 0, grace: 0 };
  kaia.commitments.push(cm);
  return { w, bea, kaia, hut, cm };
}

describe('a promised pickup with a full pack', () => {
  it('puts the heaviest thing that is not needed down at home first, then fetches and delivers', () => {
    const { w, bea, kaia, hut, cm } = promisedWaterWithFullPack('promise-make-room', true);
    expect(weightOf(kaia.inv)).toBeCloseTo(4.25);
    const water0 = bea.inv.water ?? 0;
    run(w, 1800);
    expect(hut!.store.items.wood, 'the wood went into her home store').toBe(2);
    expect(cm.status, cm.reason).toBe('done');
    expect(cm.delivered).toBe(2);
    expect((bea.inv.water ?? 0) + (w.ledger.consumed.water ?? 0)).toBeGreaterThanOrEqual(water0 + 2); // handed over (and maybe drunk)
    expect(kaia.inv.seeds, 'the light seed stayed in her pack').toBe(1);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('with nowhere to put things down, the promise ends as one that could not be kept, not as one ignored', () => {
    const { w, kaia, cm } = promisedWaterWithFullPack('promise-no-room', false);
    cm.deadline = w.tick + 400;
    run(w, 1600);
    expect(cm.status).toBe('failed');
    expect(cm.reason).toMatch(/pack was full/);
    expect(kaia.inv.wood).toBe(2);
    expect(conservationReport(w).ok).toBe(true);
  });
});
