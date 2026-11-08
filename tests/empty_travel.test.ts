// Rules 176: a fresh empty food sight, and a report of one, can be told without a personal failed gather.
// The original observation time stays the age. Rules 175 still requires the failure.
import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { setEmptyTravel } from '../src/sim/empty_news';
import { delBelief, learn, observe } from '../src/sim/knowledge';
import { pickNews, tellBelief } from '../src/sim/news';
import { relOf } from '../src/sim/relations';
import { makeSource } from '../src/sim/sources';
import type { Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { addPerson, done, pin, stage } from './helpers/kit';

function worldAt(name: string, rules: number, names: string[]): { w: World; people: Person[] } {
  const s = stage(name);
  s.w.settings.rulesVersion = rules;
  s.w.settings.dynamics = 'rich';
  const people = names.map((n, i) => addPerson(s, n, 40 + i * 1.6, 40, { hunger: 95, thirst: 95 }));
  done(s);
  s.w.tick = 1000;
  for (const p of people) {
    p.needs.hunger = 95;
    p.needs.thirst = 95;
    p.needs.warmth = 95;
    p.needs.energy = 95;
    p.traits.sociability = 1;
  }
  return { w: s.w, people };
}

function only(p: Person, id: number): void {
  for (const key of Object.keys(p.beliefs)) if (Number(key) !== id) delBelief(p, Number(key));
}

describe('empty food can travel', () => {
  it('rules 175 does not share a direct empty sight, or a received empty report, without a failure', () => {
    const { w, people } = worldAt('gate-175', 175, ['Ada', 'Ben', 'Cara']);
    const [ada, ben, cara] = people;
    const bush = makeSource(w, 'berry_bush', 80, 80, 0);
    bush.regrowTimer = 0;
    observe(w, ada, bush);
    expect(ada.failures[bush.id]).toBeUndefined();
    only(ada, bush.id);
    expect(pickNews(w, ada, ben).some((b) => b.id === bush.id)).toBe(false);
    expect(tellBelief(w, ada, ben, ada.beliefs[bush.id])).toBe(true);
    expect(ben.failures[bush.id]).toBeUndefined();
    only(ben, bush.id);
    expect(pickNews(w, ben, cara).some((b) => b.id === bush.id)).toBe(false);
    ben.failures[bush.id] = { tick: w.tick, reason: 'nothing left', count: 1 };
    expect(pickNews(w, ben, cara).some((b) => b.id === bush.id)).toBe(true);
  });

  it('rules 176 shares a fresh direct empty sight with no failed gather', () => {
    const { w, people } = worldAt('direct-176', 176, ['Ada', 'Ben']);
    const [ada, ben] = people;
    const bush = makeSource(w, 'fruit_tree', 80, 80, 0);
    bush.regrowTimer = 0;
    observe(w, ada, bush);
    expect(ada.failures[bush.id]).toBeUndefined();
    only(ada, bush.id);
    expect(pickNews(w, ada, ben).some((b) => b.id === bush.id)).toBe(true);
    expect(tellBelief(w, ada, ben, ada.beliefs[bush.id])).toBe(true);
    const got = ben.beliefs[bush.id];
    expect(got.amount).toBe(0);
    expect(got.seen).toBe(1000);
    expect(got.learned).toBe(1000);
    expect(got.src).toBe('told');
    expect(got.from).toBe(ada.id);
    expect(got.origin).toBe(ada.id);
    expect(got.hops).toBe(1);
    expect(ben.failures[bush.id]).toBeUndefined();
  });

  it('a received empty report can be relayed, and forwarding does not renew its age', () => {
    const { w, people } = worldAt('relay-176', 176, ['Ada', 'Ben', 'Cara']);
    const [ada, ben, cara] = people;
    const bush = makeSource(w, 'wild_grain', 80, 80, 0);
    bush.regrowTimer = 0;
    observe(w, ada, bush);
    tellBelief(w, ada, ben, ada.beliefs[bush.id]);
    w.tick = 1400;
    only(ben, bush.id);
    expect(ben.failures[bush.id]).toBeUndefined();
    expect(pickNews(w, ben, cara).some((b) => b.id === bush.id)).toBe(true);
    expect(tellBelief(w, ben, cara, ben.beliefs[bush.id])).toBe(true);
    const got = cara.beliefs[bush.id];
    expect(got.amount).toBe(0);
    expect(got.seen).toBe(1000);
    expect(got.learned).toBe(1400);
    expect(got.src).toBe('told');
    expect(got.from).toBe(ben.id);
    expect(got.origin).toBe(ada.id);
    expect(got.hops).toBe(2);
    w.tick = 2100;
    expect(w.tick - got.seen).toBe(1100);
    expect(pickNews(w, cara, ada).some((b) => b.id === bush.id)).toBe(false);
  });

  it('an empty report one tick inside the horizon still qualifies, including beside the listener', () => {
    const { w, people } = worldAt('horizon-176', 176, ['Ada', 'Ben']);
    const [ada, ben] = people;
    w.camp = { x: 41, y: 41 };
    const b = {
      id: 90, kind: 'fish_spot' as const, x: 41, y: 41, amount: 0, max: 8, seen: w.tick - 1099, src: 'seen' as const,
      from: 0, learned: w.tick - 1099, origin: ada.id, hops: 0,
    };
    learn(ada, b);
    only(ada, 90);
    expect(pickNews(w, ada, ben).some((x) => x.id === 90)).toBe(true);
    ada.beliefs[90].seen = w.tick - 1100;
    ada.beliefs[90].learned = w.tick - 1100;
    expect(pickNews(w, ada, ben).some((x) => x.id === 90)).toBe(false);
  });

  it('positive food hearsay is unchanged, and a newer direct regrowth replaces the empty report', () => {
    const { w, people } = worldAt('regrow-176', 176, ['Ada', 'Ben']);
    const [ada, ben] = people;
    const bush = makeSource(w, 'berry_bush', 80, 80, 6);
    observe(w, ada, bush);
    expect(ada.failures[bush.id]).toBeUndefined();
    only(ada, bush.id);
    expect(pickNews(w, ada, ben).some((b) => b.id === bush.id)).toBe(true);
    bush.amount = 0;
    bush.regrowTimer = 0;
    w.tick = 1100;
    observe(w, ada, bush);
    tellBelief(w, ada, ben, ada.beliefs[bush.id]);
    expect(ben.beliefs[bush.id].amount).toBe(0);
    expect(ben.beliefs[bush.id].src).toBe('told');
    w.tick = 1300;
    bush.amount = 4;
    observe(w, ben, bush);
    expect(ben.beliefs[bush.id].amount).toBe(4);
    expect(ben.beliefs[bush.id].seen).toBe(1300);
    expect(ben.beliefs[bush.id].src).toBe('seen');
    expect(ben.beliefs[bush.id].origin).toBe(ben.id);
    expect(ben.beliefs[bush.id].hops).toBe(0);
  });

  it('the travel switch restores the personal-failure gate', () => {
    const { w, people } = worldAt('travel-switch', 176, ['Ada', 'Ben']);
    const [ada, ben] = people;
    const bush = makeSource(w, 'berry_bush', 80, 80, 0);
    bush.regrowTimer = 0;
    observe(w, ada, bush);
    only(ada, bush.id);
    setEmptyTravel(false);
    try {
      expect(pickNews(w, ada, ben).some((b) => b.id === bush.id)).toBe(false);
      ada.failures[bush.id] = { tick: w.tick, reason: 'nothing left', count: 1 };
      expect(pickNews(w, ada, ben).some((b) => b.id === bush.id)).toBe(true);
    } finally {
      setEmptyTravel(true);
    }
  });

  it('conversation carries a positive telling, the empty correction, the relay, and then a direct regrowth', () => {
    const { w, people } = worldAt('sequence-176', 176, ['Ada', 'Ben', 'Cara']);
    const [ada, ben, cara] = people;
    relOf(ben, ada.id).affinity = 80;
    relOf(ada, ben.id).affinity = 80;
    relOf(cara, ben.id).affinity = 80;
    relOf(ben, cara.id).affinity = 80;
    const bush = makeSource(w, 'berry_bush', 90, 90, 6);
    bush.regrowTimer = 0;
    observe(w, ada, bush);
    only(ada, bush.id);
    const chat = (speaker: Person, listener: Person) => {
      pin(listener);
      startActivity(w, speaker, newActivity(w, speaker, {
        kind: 'socialize', label: `Chat with ${listener.name}`, goal: 'a chat', targetId: listener.id, targetType: 'person', here: true,
        minCommit: 400, maxTicks: 600, data: { purpose: 'chat' },
      }));
    };
    chat(ada, ben);
    let toldPositive = false;
    for (let n = 0; n < 180 && !toldPositive; n++) {
      stepWorld(w);
      const got = ben.beliefs[bush.id];
      toldPositive = !!got && got.amount === 6 && got.seen === 1000 && got.src === 'told';
    }
    expect(toldPositive).toBe(true);
    ada.cooldowns.pause = 0;
    ben.cooldowns.pause = 0;
    w.tick += 50;
    bush.amount = 0;
    observe(w, ada, bush);
    expect(ada.failures[bush.id]).toBeUndefined();
    const emptySeen = ada.beliefs[bush.id].seen;
    only(ada, bush.id);
    expect(pickNews(w, ada, ben).some((b) => b.id === bush.id)).toBe(true);
    chat(ada, ben);
    let corrected = false;
    for (let n = 0; n < 180 && !corrected; n++) {
      stepWorld(w);
      const got = ben.beliefs[bush.id];
      corrected = got.amount === 0 && got.seen === emptySeen && got.src === 'told' && got.origin === ada.id;
    }
    expect(corrected).toBe(true);
    expect(ben.failures[bush.id]).toBeUndefined();
    for (let n = 0; n < 80 && (ada.convId || ben.convId); n++) stepWorld(w);
    for (const p of [ada, ben, cara]) {
      p.needs.hunger = 95;
      p.needs.thirst = 95;
      p.needs.warmth = 95;
    }
    cara.x = ben.x + 1.2; // news still needs ordinary contact; the third person may have been left behind
    cara.y = ben.y;
    ada.cooldowns.pause = 1e12;
    ben.cooldowns.pause = 0;
    only(ben, bush.id);
    expect(pickNews(w, ben, cara).some((b) => b.id === bush.id)).toBe(true);
    chat(ben, cara);
    let relayed = false;
    for (let n = 0; n < 180 && !relayed; n++) {
      stepWorld(w);
      const got = cara.beliefs[bush.id];
      relayed = !!got && got.amount === 0 && got.seen === emptySeen && got.src === 'told' && got.from === ben.id && got.origin === ada.id && got.hops === 2;
    }
    expect(relayed, `${ben.activity?.kind ?? 'idle'} ${ben.lastResult?.detail ?? ''} conv ${ben.convId}/${cara.convId}`).toBe(true);
    expect(cara.beliefs[bush.id].learned).toBeGreaterThan(emptySeen);
    w.tick += 20;
    bush.amount = 3;
    observe(w, cara, bush);
    expect(cara.beliefs[bush.id].amount).toBe(3);
    expect(cara.beliefs[bush.id].seen).toBe(w.tick);
    expect(cara.beliefs[bush.id].src).toBe('seen');
    expect(cara.beliefs[bush.id].origin).toBe(cara.id);
  });
});
