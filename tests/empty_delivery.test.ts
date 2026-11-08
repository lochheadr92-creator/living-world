// Rules 175: a rejected empty correction is not recorded as delivered, and a newer empty correction can be
// offered inside the cooldown of an earlier positive telling. Rules 174 still lets that cooldown suppress it.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { setCorrectionDelivery } from '../src/sim/empty_news';
import { delBelief, learn } from '../src/sim/knowledge';
import { pickNews, tellBelief } from '../src/sim/news';
import { relOf } from '../src/sim/relations';
import type { Belief, BeliefKind, Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, pin, stage } from './helpers/kit';

const KEY = (listener: number, belief: number) => listener * 1_000_000 + belief;

function worldAt(name: string, rules: number): { w: World; ada: Person; ben: Person } {
  const s = stage(name);
  s.w.settings.rulesVersion = rules;
  s.w.settings.dynamics = 'rich';
  const ada = addPerson(s, 'Ada', 40, 40, { hunger: 95, thirst: 95 });
  const ben = addPerson(s, 'Ben', 42, 40, { hunger: 95, thirst: 95 });
  done(s);
  s.w.tick = 1000;
  return { w: s.w, ada, ben };
}

function memory(p: Person, id: number, kind: BeliefKind, amount: number, seen: number): Belief {
  const b: Belief = { id, kind, x: 80, y: 80, amount, max: 8, seen, src: 'seen', from: 0, learned: seen, origin: p.id, hops: 0 };
  learn(p, b);
  return p.beliefs[id];
}

function emptyNow(w: World, p: Person, id: number, seen: number): void {
  const b = p.beliefs[id];
  b.amount = 0;
  b.seen = seen;
  b.learned = seen;
  p.failures[id] = { tick: w.tick, reason: 'nothing left', count: 1 };
}

describe('empty correction delivery', () => {
  it('rules 174 lets an earlier positive telling suppress the newer empty correction', () => {
    const { w, ada, ben } = worldAt('cooldown-174', 174);
    memory(ada, 70, 'berry_bush', 6, 100);
    expect(tellBelief(w, ada, ben, ada.beliefs[70])).toBe(true);
    expect(ada.told[KEY(ben.id, 70)]).toBe(w.tick);
    emptyNow(w, ada, 70, 900);
    expect(pickNews(w, ada, ben).some((b) => b.id === 70)).toBe(false);
    expect(ben.beliefs[70].amount).toBe(6);
  });

  it('rules 175 selects a newer empty correction inside that cooldown, and delivery matches acceptance', () => {
    const { w, ada, ben } = worldAt('cooldown-175', 175);
    memory(ada, 71, 'fruit_tree', 6, 100);
    expect(tellBelief(w, ada, ben, ada.beliefs[71])).toBe(true);
    expect(ada.newsTold?.[KEY(ben.id, 71)]).toBe(100);
    emptyNow(w, ada, 71, 950);
    const selected = pickNews(w, ada, ben);
    expect(selected.some((b) => b.id === 71)).toBe(true);
    expect(tellBelief(w, ada, ben, ada.beliefs[71])).toBe(true);
    expect(ben.beliefs[71].amount).toBe(0);
    expect(ben.beliefs[71].seen).toBe(950);
    expect(ben.beliefs[71].src).toBe('told');
    expect(ben.beliefs[71].origin).toBe(ada.id);
    expect(ada.told[KEY(ben.id, 71)]).toBe(w.tick);
    expect(ada.newsTold?.[KEY(ben.id, 71)]).toBe(950);
    expect(ada.newsHeld).toBeUndefined();
    expect(pickNews(w, ada, ben).some((b) => b.id === 71)).toBe(false);
  });

  it('a rejected empty correction records no successful delivery and is not offered again immediately', () => {
    const { w, ada, ben } = worldAt('rejected-175', 175);
    memory(ben, 72, 'wild_grain', 5, 1000);
    memory(ada, 72, 'wild_grain', 0, 960);
    ada.failures[72] = { tick: w.tick, reason: 'nothing left', count: 1 };
    expect(pickNews(w, ada, ben).some((b) => b.id === 72)).toBe(true);
    expect(tellBelief(w, ada, ben, ada.beliefs[72])).toBe(false);
    expect(ben.beliefs[72].amount).toBe(5);
    expect(ben.beliefs[72].seen).toBe(1000);
    expect(ada.told[KEY(ben.id, 72)]).toBeUndefined();
    expect(ada.newsTold).toBeUndefined();
    expect(ada.newsHeld?.[KEY(ben.id, 72)]).toEqual({ tick: w.tick, seen: 960 });
    expect(pickNews(w, ada, ben).some((b) => b.id === 72)).toBe(false);
  });

  it('a stale empty report does not take a news slot from a positive report', () => {
    const { w, ada, ben } = worldAt('stale-slot', 175);
    memory(ada, 73, 'berry_bush', 0, 100);
    memory(ada, 74, 'fish_spot', 6, w.tick);
    expect(pickNews(w, ada, ben).map((b) => b.id)).toEqual([74]);
  });

  it('speaker selection ignores the listener private beliefs', () => {
    const { w, ada, ben } = worldAt('speaker-side', 175);
    memory(ada, 75, 'berry_bush', 6, w.tick);
    const before = pickNews(w, ada, ben).map((b) => b.id);
    ben.beliefs[75] = { ...ada.beliefs[75], amount: 0, seen: w.tick + 50, src: 'seen' };
    ben.failures[75] = { tick: w.tick, reason: 'nothing left', count: 9 };
    ben.newsTold = { [KEY(ada.id, 75)]: 1 };
    expect(pickNews(w, ada, ben).map((b) => b.id)).toEqual(before);
  });

  it('the delivery switch keeps the earlier positive cooldown', () => {
    const { w, ada, ben } = worldAt('delivery-switch', 175);
    memory(ada, 76, 'berry_bush', 6, 100);
    tellBelief(w, ada, ben, ada.beliefs[76]);
    emptyNow(w, ada, 76, 950);
    setCorrectionDelivery(false);
    try {
      expect(pickNews(w, ada, ben).some((b) => b.id === 76)).toBe(false);
    } finally {
      setCorrectionDelivery(true);
    }
  });

  it('a conversation can carry the newer empty correction after the positive telling', () => {
    const { w, ada, ben } = worldAt('converse-175', 175);
    for (const p of [ada, ben]) {
      p.needs.hunger = 95;
      p.needs.thirst = 95;
      p.needs.warmth = 95;
      p.needs.energy = 95;
      p.traits.sociability = 1;
    }
    relOf(ben, ada.id).affinity = 80;
    relOf(ada, ben.id).affinity = 80;
    memory(ada, 79, 'berry_bush', 6, 1000);
    expect(tellBelief(w, ada, ben, ada.beliefs[79])).toBe(true);
    w.tick = 1040;
    ada.beliefs[79].amount = 0;
    ada.beliefs[79].seen = 1020;
    ada.beliefs[79].learned = 1020;
    ada.failures[79] = { tick: w.tick, reason: 'nothing left', count: 1 };
    for (const id of Object.keys(ada.beliefs)) if (Number(id) !== 79) delBelief(ada, Number(id));
    expect(pickNews(w, ada, ben).some((b) => b.id === 79)).toBe(true);
    pin(ben);
    startActivity(w, ada, newActivity(w, ada, {
      kind: 'socialize', label: 'Chat with Ben', goal: 'a chat', targetId: ben.id, targetType: 'person', here: true,
      minCommit: 400, maxTicks: 600, data: { purpose: 'chat' },
    }));
    let delivered = false;
    for (let n = 0; n < 180 && !delivered; n++) {
      stepWorld(w);
      const got = ben.beliefs[79];
      delivered = got.amount === 0 && got.seen === 1020 && got.src === 'told' && got.origin === ada.id;
    }
    expect(delivered).toBe(true);
    expect(ben.beliefs[79].hops).toBe(1);
    expect(ben.beliefs[79].learned).toBeGreaterThan(1040);
  });

  it('save and load keeps an accepted observation time and a rejected attempt, and refuses a malformed record', () => {
    const { w, ada, ben } = worldAt('save-175', 175);
    memory(ada, 77, 'berry_bush', 6, 100);
    tellBelief(w, ada, ben, ada.beliefs[77]);
    memory(ada, 78, 'fruit_tree', 0, 400);
    ada.failures[78] = { tick: w.tick, reason: 'nothing left', count: 1 };
    memory(ben, 78, 'fruit_tree', 4, 900);
    expect(tellBelief(w, ada, ben, ada.beliefs[78])).toBe(false);
    const back = deserializeWorld(serializeWorld(w));
    const a = back.persons.find((p) => p.name === 'Ada')!;
    const b = back.persons.find((p) => p.name === 'Ben')!;
    expect(a.newsTold?.[KEY(b.id, 77)]).toBe(100);
    expect(a.newsHeld?.[KEY(b.id, 78)]).toEqual({ tick: w.tick, seen: 400 });
    expect(b.newsTold).toBeUndefined();
    const older = JSON.parse(serializeWorld(w)) as { world: { settings: { rulesVersion: number }; persons: Array<Record<string, unknown>> } };
    older.world.settings.rulesVersion = 174;
    expect(() => deserializeWorld(JSON.stringify(older))).toThrow(/empty-food telling record/i);
    const broken = JSON.parse(serializeWorld(w)) as { world: { persons: Array<Record<string, unknown>> } };
    const carrier = broken.world.persons.find((p) => p.name === 'Ada')!;
    carrier.newsHeld = { [String(KEY(b.id, 78))]: { tick: w.tick + 5, seen: 400 } };
    expect(() => deserializeWorld(JSON.stringify(broken))).toThrow(/empty-food telling record/i);
  });

  it('a loaded world continues identically to the world that was saved', () => {
    const { w, ada, ben } = worldAt('continue-175', 175);
    memory(ada, 80, 'berry_bush', 6, 200);
    tellBelief(w, ada, ben, ada.beliefs[80]);
    emptyNow(w, ada, 80, 950);
    tellBelief(w, ada, ben, ada.beliefs[80]);
    const copy = deserializeWorld(serializeWorld(w));
    for (let n = 0; n < 40; n++) {
      stepWorld(w);
      stepWorld(copy);
    }
    expect(serializeWorld(copy)).toBe(serializeWorld(w));
  });
});
