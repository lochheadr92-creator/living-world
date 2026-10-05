import { describe, expect, it } from 'vitest';
import { putBelief, waterBeliefId } from '../src/sim/knowledge';
import { relOf } from '../src/sim/relations';
import { createRequest, evaluateRequest } from '../src/sim/social';
import type { Commitment, Person, World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

function friends(a: Person, b: Person): void {
  for (const [x, y] of [[a, b], [b, a]] as [Person, Person][]) {
    const r = relOf(x, y.id);
    r.affinity = 40;
    r.trust = 40;
    r.familiarity = 20;
  }
}

/** the person knows of some water to fetch it from (the first stretch of shore) */
function knowsWater(w: World, p: Person): void {
  for (let i = 0; i < w.accessCell.length; i++) {
    const t = w.accessCell[i];
    if (t < 0) continue;
    putBelief(p, { id: waterBeliefId(i), kind: 'water', x: (t % w.W) + 0.5, y: Math.floor(t / w.W) + 0.5, amount: 0, max: 0, seen: -10, src: 'seen', from: 0, learned: -10 });
    return;
  }
  throw new Error('no water in the test world');
}

function promise(w: World, from: Person, to: Person, item: 'water' | 'berries', amount: number): Commitment {
  const r = createRequest(w, to, from, { kind: item === 'water' ? 'water' : 'food', item, amount });
  r.status = 'promised';
  const c: Commitment = { id: w.nextId++, requestId: r.id, kind: 'deliver', to: to.id, item, amount, siteId: 0, made: w.tick, deadline: w.tick + 1800, status: 'active', delivered: 0, grace: 0 };
  from.commitments.push(c);
  r.commitmentId = c.id;
  return c;
}

// Found by the invariant audit once people were called in a shuffled order: Rafe held two live promises of two water to Vik, made 1,600
// ticks apart, because Vik asked again when the first was slow to arrive and nothing told Rafe he already owed it. (Wood, stone and
// goods were already covered, in commitments.test.ts.)
describe('a promise is not made twice', () => {
  it('asked again for water already promised, a person says so instead of promising it again; asked for something else, or by someone else, they still can', () => {
    const s = stage('duplicate-water');
    const ana = addPerson(s, 'Ana', 44, 44, { thirst: 30 });
    const ben = addPerson(s, 'Ben', 46, 44, { sex: 'm', thirst: 90, hunger: 90, energy: 90, traits: { generosity: 0.95 } });
    const cat = addPerson(s, 'Cat', 47, 44, { thirst: 30 });
    const w = done(s);
    friends(ana, ben);
    friends(cat, ben);
    knowsWater(w, ben);
    // to begin with he will promise to fetch it
    const first = evaluateRequest(w, ben, ana, createRequest(w, ana, ben, { kind: 'water', item: 'water', amount: 2 }));
    expect(first).toMatchObject({ kind: 'promise', item: 'water' });
    promise(w, ben, ana, 'water', 2);
    // Ana asks again: he is already on it
    const again = evaluateRequest(w, ben, ana, createRequest(w, ana, ben, { kind: 'water', item: 'water', amount: 2 }));
    expect(again).toEqual({ kind: 'decline', reason: 'committed' });
    // somebody else's thirst is a different matter
    expect(evaluateRequest(w, ben, cat, createRequest(w, cat, ben, { kind: 'water', item: 'water', amount: 2 }))).toMatchObject({ kind: 'promise', item: 'water' });
  });

  it('once the promise is kept, or has lapsed, the same person can ask again', () => {
    const s = stage('duplicate-water-after');
    const ana = addPerson(s, 'Ana', 44, 44, { thirst: 30 });
    const ben = addPerson(s, 'Ben', 46, 44, { sex: 'm', thirst: 90, hunger: 90, energy: 90, traits: { generosity: 0.95 } });
    const w = done(s);
    friends(ana, ben);
    knowsWater(w, ben);
    const c = promise(w, ben, ana, 'water', 2);
    expect(evaluateRequest(w, ben, ana, createRequest(w, ana, ben, { kind: 'water', item: 'water', amount: 2 }))).toEqual({ kind: 'decline', reason: 'committed' });
    for (const status of ['done', 'expired', 'failed', 'broken'] as const) {
      c.status = status;
      expect(evaluateRequest(w, ben, ana, createRequest(w, ana, ben, { kind: 'water', item: 'water', amount: 2 })), `after the promise ${status}`).toMatchObject({ kind: 'promise' });
    }
  });

  it('the same goes for food: a person who has promised Ana something to eat does not promise her more when she asks again', () => {
    const s = stage('duplicate-food');
    const ana = addPerson(s, 'Ana', 44, 44, { hunger: 25 });
    const ben = addPerson(s, 'Ben', 46, 44, { sex: 'm', thirst: 90, hunger: 90, energy: 90, traits: { generosity: 0.95 } });
    const w = done(s);
    friends(ana, ben);
    promise(w, ben, ana, 'berries', 3);
    expect(evaluateRequest(w, ben, ana, createRequest(w, ana, ben, { kind: 'food' }))).toEqual({ kind: 'decline', reason: 'committed' });
  });
});
