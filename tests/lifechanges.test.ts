// Life changes with social consequences (src/sim/lifechanges.ts): losing a partner brings kin and friends to look in and makes
// them readier to help; a birth draws the parents together; a move shifts the old home away and the new one nearer; taking in
// an orphan is remembered by the neighbours. None of it in an authored world.
import { describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { createWorld } from '../src/sim/factory';
import { killPerson } from '../src/sim/lifecycle';
import { companyPull, leanOn, lifeEventOf, onBecameParent, onMovedHousehold, onOrphanTaken } from '../src/sim/lifechanges';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { heardBy } from '../src/sim/reputation';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));

describe('losing a partner', () => {
  it('leaves the bereaved leaning on those close, who come to look in and help more readily; nothing of it authored', () => {
    for (const dyn of ['rich', 'authored'] as const) {
      const w = world(dyn);
      for (let i = 0; i < 100; i++) stepWorld(w);
      const p = w.persons.find((x) => x.alive && x.partnerId && stageOf(w, x) === 'adult')!;
      const partner = w.byId.get(p.partnerId)!;
      if (partner.ent !== 'person') throw new Error('no partner');
      const friend = w.persons.find((x) => x.alive && x !== p && x !== partner && !x.relations[p.id]?.kin && stageOf(w, x) === 'adult')!;
      const blank = { affinity: 0, trust: 0, familiarity: 0, lastMet: 0, kin: '' as const, avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 };
      friend.relations[p.id] = { ...(friend.relations[p.id] ?? blank), affinity: 45 };
      p.relations[friend.id] = { ...(p.relations[friend.id] ?? blank), affinity: 45 };
      const willBefore = leanOn(w, friend, p);
      killPerson(w, partner, 'a fall');
      if (dyn === 'authored') {
        expect(p.lifeEvent).toBeUndefined();
        expect(friend.concerns.some((c) => c.kind === 'bereaved')).toBe(false);
        continue;
      }
      expect(lifeEventOf(w, p)?.kind).toBe('bereaved');
      expect(leanOn(w, friend, p)).toBeGreaterThan(willBefore);
      expect(companyPull(w, p, friend)).toBeGreaterThan(0);
      expect(friend.concerns.some((c) => c.about === p.id && c.kind === 'bereaved')).toBe(true);
      // the friend, away from them, sees the visit as an option
      friend.x = p.x + 20;
      friend.y = p.y;
      friend.seen = [];
      friend.whereabouts[p.id] = { x: p.x, y: p.y, tick: w.tick };
      friend.needs.hunger = friend.needs.thirst = friend.needs.energy = 90;
      friend.cooldowns['check' + p.id] = 0;
      const ctx = generateOptions(w, friend, true);
      expect(ctx.options.some((o) => o.kind === 'visit' && o.targetId === p.id)).toBe(true);
    }
  });
});

describe('the other changes', () => {
  it('a birth draws the parents together, a move shifts both homes, taking in an orphan is remembered', () => {
    const w = world('rich');
    for (let i = 0; i < 100; i++) stepWorld(w);
    const adults = w.persons.filter((x) => x.alive && stageOf(w, x) === 'adult');
    const [a, b, c] = adults;
    const child = w.persons.find((x) => x.alive && stageOf(w, x) === 'child')!;
    const before = a.relations[b.id]?.affinity ?? 0;
    onBecameParent(w, a, child, b);
    expect(lifeEventOf(w, a)?.kind).toBe('new_parent');
    expect(a.relations[b.id].affinity).toBeGreaterThan(before);
    const from = w.households.find((h) => h.id === c.hhId);
    const to = w.households.find((h) => h.id !== c.hhId)!;
    const oldMate = w.persons.find((x) => x.alive && x !== c && x.hhId === c.hhId);
    const newMate = w.persons.find((x) => x.alive && x.hhId === to.id)!;
    const oldAff = oldMate ? oldMate.relations[c.id]?.affinity ?? 0 : 0;
    const newFam = newMate.relations[c.id]?.familiarity ?? 0;
    onMovedHousehold(w, c, from, to);
    expect(lifeEventOf(w, c)?.kind).toBe('moved');
    if (oldMate) expect(oldMate.relations[c.id].affinity).toBeLessThan(oldAff);
    expect(newMate.relations[c.id].familiarity).toBeGreaterThan(newFam);
    const neighbour = adults[3];
    neighbour.x = b.x + 3;
    neighbour.y = b.y;
    neighbour.pose = 'stand';
    onOrphanTaken(w, b, child);
    expect(lifeEventOf(w, b)?.kind).toBe('took_in');
    expect(heardBy(neighbour).some((r) => r.about === b.id && r.kind === 'generous' && r.text.includes('took in'))).toBe(true);
  });
});
