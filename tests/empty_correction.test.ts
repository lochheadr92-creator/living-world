// Rules 174: a strictly newer empty food report can correct a positive belief without the 200-tick gap.
// Rules 173 still refuses that report. These are staged beliefs, not an ordinary conversation.
import { describe, expect, it } from 'vitest';
import { setEmptyCorrection } from '../src/sim/empty_news';
import { learn, observe } from '../src/sim/knowledge';
import { tellBelief } from '../src/sim/news';
import { makeSource } from '../src/sim/sources';
import type { Belief, BeliefKind, Person, World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

const FOOD: BeliefKind[] = ['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot'];

function worldAt(name: string, rules: number | undefined, dynamics: 'rich' | 'authored' = 'rich'): { w: World; ada: Person; ben: Person } {
  const s = stage(name);
  if (rules !== undefined) s.w.settings.rulesVersion = rules;
  s.w.settings.dynamics = dynamics;
  const ada = addPerson(s, 'Ada', 40, 40, { hunger: 95, thirst: 95 });
  const ben = addPerson(s, 'Ben', 42, 40, { hunger: 95, thirst: 95 });
  done(s);
  s.w.tick = 500;
  return { w: s.w, ada, ben };
}

function memory(p: Person, id: number, kind: BeliefKind, amount: number, seen: number, extra: Partial<Belief> = {}): Belief {
  const b: Belief = {
    id, kind, x: 12, y: 70, amount, max: 8, seen, src: 'seen', from: 0, learned: seen, origin: p.id, hops: 0, ...extra,
  };
  learn(p, b);
  return p.beliefs[id];
}

describe('empty food corrections', () => {
  it('rules 173 rejects a zero observation 100 ticks newer than six berries', () => {
    const { w, ada, ben } = worldAt('reject-100', 173);
    memory(ben, 50, 'berry_bush', 6, 100);
    memory(ada, 50, 'berry_bush', 0, 200);
    expect(tellBelief(w, ada, ben, ada.beliefs[50])).toBe(false);
    expect(ben.beliefs[50].amount).toBe(6);
    expect(ben.beliefs[50].seen).toBe(100);
    expect(ben.beliefs[50].src).toBe('seen');
  });

  it('rules 173 rejects a zero observation one tick newer', () => {
    const { w, ada, ben } = worldAt('reject-1', 173);
    memory(ben, 51, 'berry_bush', 6, 100);
    memory(ada, 51, 'berry_bush', 0, 101);
    expect(tellBelief(w, ada, ben, ada.beliefs[51])).toBe(false);
    expect(ben.beliefs[51].amount).toBe(6);
  });

  it.each(FOOD)('rules 174 accepts a %s observation one tick newer than a positive memory', (kind) => {
    const { w, ada, ben } = worldAt('accept-1-' + kind, 174);
    memory(ben, 60, kind, 6, 100);
    memory(ada, 60, kind, 0, 101, { origin: 7, hops: 2, src: 'told', from: 7 });
    expect(tellBelief(w, ada, ben, ada.beliefs[60])).toBe(true);
    const got = ben.beliefs[60];
    expect(got.amount).toBe(0);
    expect(got.seen).toBe(101);
    expect(got.learned).toBe(w.tick);
    expect(got.src).toBe('told');
    expect(got.from).toBe(ada.id);
    expect(got.origin).toBe(7);
    expect(got.hops).toBe(3);
  });

  it('rules 174 accepts a zero observation 100 ticks newer and keeps the original sighting', () => {
    const { w, ada, ben } = worldAt('accept-100', 174);
    memory(ben, 61, 'berry_bush', 6, 100);
    memory(ada, 61, 'berry_bush', 0, 200);
    expect(tellBelief(w, ada, ben, ada.beliefs[61])).toBe(true);
    expect(ben.beliefs[61].amount).toBe(0);
    expect(ben.beliefs[61].seen).toBe(200);
    expect(ben.beliefs[61].src).toBe('told');
    expect(ben.beliefs[61].origin).toBe(ada.id);
    expect(ben.beliefs[61].hops).toBe(1);
  });

  it('an older empty report cannot overwrite newer evidence', () => {
    const { w, ada, ben } = worldAt('older-empty', 174);
    memory(ben, 62, 'fruit_tree', 5, 300);
    memory(ada, 62, 'fruit_tree', 0, 200);
    expect(tellBelief(w, ada, ben, ada.beliefs[62])).toBe(false);
    expect(ben.beliefs[62].amount).toBe(5);
    expect(ben.beliefs[62].seen).toBe(300);
    expect(ben.beliefs[62].src).toBe('seen');
  });

  it('equal-time conflicting accounts preserve the existing belief', () => {
    const { w, ada, ben } = worldAt('equal-time', 174);
    memory(ben, 63, 'wild_grain', 4, 200);
    memory(ada, 63, 'wild_grain', 0, 200);
    expect(tellBelief(w, ada, ben, ada.beliefs[63])).toBe(false);
    expect(ben.beliefs[63].amount).toBe(4);
    expect(ben.beliefs[63].seen).toBe(200);
    expect(ben.beliefs[63].src).toBe('seen');
  });

  it('a positive report still needs more than 200 ticks', () => {
    const { w, ada, ben } = worldAt('positive-gap', 174);
    memory(ben, 64, 'berry_bush', 6, 100);
    memory(ada, 64, 'berry_bush', 8, 200);
    expect(tellBelief(w, ada, ben, ada.beliefs[64])).toBe(false);
    expect(ben.beliefs[64].amount).toBe(6);
    memory(ada, 65, 'fish_spot', 3, 301);
    memory(ben, 65, 'fish_spot', 1, 100);
    expect(tellBelief(w, ada, ben, ada.beliefs[65])).toBe(true);
    expect(ben.beliefs[65].amount).toBe(3);
    expect(ben.beliefs[65].seen).toBe(301);
    expect(ben.beliefs[65].src).toBe('told');
  });

  it('an empty report does not refresh another empty memory inside the ordinary gap', () => {
    const { w, ada, ben } = worldAt('empty-to-empty', 174);
    memory(ben, 66, 'berry_bush', 0, 100);
    memory(ada, 66, 'berry_bush', 0, 150);
    expect(tellBelief(w, ada, ben, ada.beliefs[66])).toBe(false);
    expect(ben.beliefs[66].seen).toBe(100);
    expect(ben.beliefs[66].src).toBe('seen');
  });

  it('rules 174 does not apply to an unversioned world or to authored dynamics', () => {
    const unversioned = worldAt('unversioned', undefined);
    memory(unversioned.ben, 67, 'berry_bush', 6, 100);
    memory(unversioned.ada, 67, 'berry_bush', 0, 200);
    expect(tellBelief(unversioned.w, unversioned.ada, unversioned.ben, unversioned.ada.beliefs[67])).toBe(false);
    expect(unversioned.ben.beliefs[67].amount).toBe(6);
    const authored = worldAt('authored', 174, 'authored');
    memory(authored.ben, 68, 'berry_bush', 6, 100);
    memory(authored.ada, 68, 'berry_bush', 0, 200);
    expect(tellBelief(authored.w, authored.ada, authored.ben, authored.ada.beliefs[68])).toBe(false);
    expect(authored.ben.beliefs[68].amount).toBe(6);
  });

  it('the correction switch restores the 200-tick gap without removing the rules version', () => {
    const { w, ada, ben } = worldAt('switch-off', 174);
    memory(ben, 69, 'berry_bush', 6, 100);
    memory(ada, 69, 'berry_bush', 0, 200);
    setEmptyCorrection(false);
    try {
      expect(tellBelief(w, ada, ben, ada.beliefs[69])).toBe(false);
      expect(ben.beliefs[69].amount).toBe(6);
    } finally {
      setEmptyCorrection(true);
    }
  });

  it('a newer direct sighting of regrowth replaces a stale empty memory', () => {
    const { w, ben } = worldAt('regrowth', 174);
    w.tick = 10;
    const bush = makeSource(w, 'berry_bush', 80, 80, 0);
    expect(observe(w, ben, bush)).toBe(true);
    expect(ben.beliefs[bush.id].amount).toBe(0);
    expect(ben.beliefs[bush.id].src).toBe('seen');
    w.tick = 400;
    bush.amount = 4;
    observe(w, ben, bush);
    const got = ben.beliefs[bush.id];
    expect(got.amount).toBe(4);
    expect(got.seen).toBe(400);
    expect(got.src).toBe('seen');
    expect(got.origin).toBe(ben.id);
    expect(got.hops).toBe(0);
  });
});
