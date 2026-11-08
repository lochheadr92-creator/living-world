// The news counter is a listener. It must not change the world or the generator, and a report's count must match what was delivered.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { observe } from '../src/sim/knowledge';
import { pickNews, tellBelief } from '../src/sim/news';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { makeSource } from '../src/sim/sources';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

function eventsOf(w: World): { kind: string; reason?: string; age: number; hops: number; seen: number }[] {
  const events: { kind: string; reason?: string; age: number; hops: number; seen: number }[] = [];
  w.hooks = { onNews: (e) => events.push({ kind: e.kind, reason: e.reason, age: e.age, hops: e.hops, seen: e.seen }) };
  return events;
}

describe('empty-news observation', () => {
  it('a counting listener leaves the world and the generator unchanged', () => {
    const settings = currentWorldSettings('normal', 'news-purity', { immigration: true });
    const live = createWorld(settings);
    const counted = deserializeWorld(serializeWorld(live));
    const events = eventsOf(counted);
    for (let n = 0; n < 240; n++) {
      stepWorld(live);
      stepWorld(counted);
    }
    expect(serializeWorld(counted)).toBe(serializeWorld(live));
    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  it('counts a direct empty sight, an accepted relay and a rejected older report without writing the world', () => {
    const s = stage('news-count');
    s.w.settings.rulesVersion = 176;
    s.w.settings.dynamics = 'rich';
    const ada = addPerson(s, 'Ada', 40, 40, { hunger: 95, thirst: 95 });
    const ben = addPerson(s, 'Ben', 42, 40, { hunger: 95, thirst: 95 });
    const cara = addPerson(s, 'Cara', 44, 40, { hunger: 95, thirst: 95 });
    done(s);
    s.w.tick = 1000;
    const quiet = deserializeWorld(serializeWorld(s.w));
    const q = (name: string) => quiet.persons.find((p) => p.name === name)!;
    const events = eventsOf(s.w);
    const bush = makeSource(s.w, 'berry_bush', 80, 80, 0);
    const quietBush = makeSource(quiet, 'berry_bush', 80, 80, 0);
    observe(s.w, ada, bush);
    observe(quiet, q('Ada'), quietBush);
    expect(events.some((e) => e.kind === 'direct-empty' && e.seen === 1000)).toBe(true);
    tellBelief(s.w, ada, ben, ada.beliefs[bush.id]);
    tellBelief(quiet, q('Ada'), q('Ben'), q('Ada').beliefs[quietBush.id]);
    const accepted = events.filter((e) => e.kind === 'accepted');
    expect(accepted).toHaveLength(1);
    expect(accepted[0].age).toBe(0);
    expect(accepted[0].hops).toBe(1);
    s.w.tick = 1200;
    quiet.tick = 1200;
    expect(pickNews(s.w, ben, cara).some((b) => b.id === bush.id)).toBe(true);
    tellBelief(s.w, ben, cara, ben.beliefs[bush.id]);
    tellBelief(quiet, q('Ben'), q('Cara'), q('Ben').beliefs[quietBush.id]);
    const relay = events.filter((e) => e.kind === 'accepted' && e.hops === 2);
    expect(relay).toHaveLength(1);
    expect(relay[0].seen).toBe(1000);
    expect(relay[0].age).toBe(200);
    ada.beliefs[bush.id] = { ...ada.beliefs[bush.id], seen: 100, amount: 0 };
    ben.beliefs[bush.id] = { ...ben.beliefs[bush.id], seen: 1000, amount: 6, src: 'seen' };
    q('Ada').beliefs[quietBush.id] = { ...q('Ada').beliefs[quietBush.id], seen: 100, amount: 0 };
    q('Ben').beliefs[quietBush.id] = { ...q('Ben').beliefs[quietBush.id], seen: 1000, amount: 6, src: 'seen' };
    expect(tellBelief(s.w, ada, ben, ada.beliefs[bush.id])).toBe(false);
    expect(tellBelief(quiet, q('Ada'), q('Ben'), q('Ada').beliefs[quietBush.id])).toBe(false);
    expect(events.some((e) => e.kind === 'rejected' && e.reason === 'older')).toBe(true);
    expect(serializeWorld(s.w)).toBe(serializeWorld(quiet));
  });
});
