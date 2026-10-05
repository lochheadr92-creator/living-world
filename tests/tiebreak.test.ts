import { describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { TIE_DISTANCE, askFirst } from '../src/sim/options_social';
import { relOf } from '../src/sim/relations';
import { addPerson, done, learn, pin, site, stage } from './helpers/kit';

const cand = (id: number, d: number, aff: number) => ({ q: { id }, d, aff });

describe('whom to ask when several could be asked for the same thing', () => {
  it('the nearest, unless another is about as near: then the friendliest of those', () => {
    // a stranger at 4.0, a friend at 5.0 (within a tile and a half of the nearest): the friend
    expect(askFirst([cand(1, 4.0, 0), cand(2, 5.0, 60)])?.q.id).toBe(2);
    // the same two the other way round in the list: the same answer
    expect(askFirst([cand(2, 5.0, 60), cand(1, 4.0, 0)])?.q.id).toBe(2);
    // a friend further off than that is not worth the walk, however fond: the nearest is asked
    expect(askFirst([cand(1, 4.0, 0), cand(2, 4.0 + TIE_DISTANCE + 0.1, 95)])?.q.id).toBe(1);
    // among friends about as near, the better friend; among equals, the nearer; then the lower id (never the order in the list)
    expect(askFirst([cand(1, 4, 40), cand(2, 4.5, 70), cand(3, 4.2, 55)])?.q.id).toBe(2);
    expect(askFirst([cand(5, 4.4, 30), cand(4, 4.0, 30)])?.q.id).toBe(4);
    expect(askFirst([cand(9, 4, 30), cand(7, 4, 30)])?.q.id).toBe(7);
    // nobody to ask: nobody
    expect(askFirst([])).toBeNull();
  });

  /** STAGED: Mira's house site is short of wood; two people nearby carry some. */
  function scene(name: string, strangerD: number, friendD: number) {
    const s = stage(name);
    const mira = addPerson(s, 'Mira', 44.5, 40.5, { traits: { diligence: 0.9 }, hunger: 90, thirst: 95 });
    const stranger = addPerson(s, 'Sam', 44.5 + strangerD, 40.5, { sex: 'm', inv: { wood: 4 }, hunger: 90, thirst: 95 });
    const friend = addPerson(s, 'Fay', 44.5, 40.5 + friendD, { inv: { wood: 4 }, hunger: 90, thirst: 95 });
    const st = site(s, 'hut', 36, 40, mira.hhId, mira.id, { stone: 6 });
    const w = done(s);
    for (const p of [stranger, friend]) pin(p);
    for (const e of [st]) learn(w, mira, e);
    for (const p of [mira, stranger, friend]) for (const q of [mira, stranger, friend]) if (p !== q) learn(w, p, q);
    const r = relOf(mira, friend.id);
    r.affinity = 55;
    r.trust = 50;
    r.familiarity = 25;
    mira.nextThink = w.tick;
    return { w, mira, stranger, friend };
  }
  const asksFor = (w: ReturnType<typeof scene>['w'], mira: ReturnType<typeof scene>['mira']): string[] => generateOptions(w, mira, true).options.filter((o) => o.kind === 'socialize' && /^Ask .* for wood$/.test(o.label)).map((o) => o.label.replace(/^Ask (\w+) for wood$/, '$1'));

  it('in a real planner: about as near, the friend is asked, and only the friend', () => {
    const { w, mira } = scene('tie-near', 4.0, 4.8);
    expect(asksFor(w, mira)).toEqual(['Fay']);
  });

  it('in a real planner: a friend who is further away than that is not asked; the nearer stranger is', () => {
    const { w, mira } = scene('tie-far', 3.0, 7.5);
    expect(asksFor(w, mira)).toEqual(['Sam']);
  });
});
