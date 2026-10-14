// Stories, traditions and rituals (src/sim/traditions.ts): a harvest feast many came to is held again next year on its day; a
// well-attended funeral becomes a remembrance; the first winter lived through becomes a midwinter fire; a tradition nobody
// comes to twice falls out of use; the chronicle is retold as stories. None of it in an authored world.
import { describe, expect, it } from 'vitest';
import { DAY, DAYS_PER_YEAR } from '../src/sim/constants';
import { addEvent } from '../src/sim/events';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import { noteOccasionOver, noteWinterOver, pickStory, traditionsOf } from '../src/sim/traditions';
import { occasionsOf, occasionsTick } from '../src/sim/occasions';
import { stepWorld } from '../src/sim/world';
import type { Occasion, World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const over = (w: World, kind: Occasion['kind'], attended: number[], about: number[] = []): Occasion => ({ id: w.nextId++, kind, placeId: 0, placeName: 'the fire', x: w.camp.x, y: w.camp.y, called: w.tick, at: w.tick, until: w.tick, about, attended, status: 'done', end: '' });

describe('traditions', () => {
  it('form from a well-attended harvest feast, are called again on their day, and lapse when nobody comes twice', () => {
    const w = world('rich');
    for (let i = 0; i < 2 * DAY + 100; i++) stepWorld(w);
    const many = w.persons.slice(0, 10).map((p) => p.id);
    noteOccasionOver(w, over(w, 'harvest', many.slice(0, 5)));
    expect(traditionsOf(w)).toHaveLength(0); // too few came
    noteOccasionOver(w, over(w, 'harvest', many));
    const t = traditionsOf(w)[0];
    expect(t).toMatchObject({ kind: 'harvest', status: 'kept', held: 1 });
    expect(w.events.some((e) => e.text.includes('has become a tradition'))).toBe(true);
    // a year on, at the tick traditions are called, it is called again
    const day = Math.floor(w.tick / DAY);
    w.tick = (day + DAYS_PER_YEAR) * DAY + 11;
    occasionsTick(w);
    const called = occasionsOf(w).find((o) => o.kind === 'harvest' && o.status !== 'done');
    expect(called).toBeTruthy();
    expect(t.lastHeld).toBe(day + DAYS_PER_YEAR);
    // nobody comes, twice: it falls out of use
    called!.status = 'done';
    noteOccasionOver(w, { ...called!, attended: [] });
    expect(t.skipped).toBe(1);
    t.lastHeld = t.lastHeld + DAYS_PER_YEAR;
    w.tick = t.lastHeld * DAY + 20;
    noteOccasionOver(w, over(w, 'harvest', []));
    expect(t.status).toBe('lapsed');
    expect(w.events.some((e) => e.text.includes('fallen out of use'))).toBe(true);
  });

  it('a well-attended funeral becomes a remembrance of the dead, and a winter survived a midwinter fire; nothing authored', () => {
    const w = world('rich');
    for (let i = 0; i < 300; i++) stepWorld(w);
    const dead = w.persons[0];
    w.deceased.push({ id: dead.id, name: dead.name, tick: w.tick, cause: 'a fall', age: 40 });
    noteOccasionOver(w, over(w, 'funeral', w.persons.slice(1, 10).map((p) => p.id), [dead.id]));
    expect(traditionsOf(w).some((t) => t.kind === 'remembrance' && t.about === dead.id && t.name.includes(dead.name))).toBe(true);
    noteWinterOver(w);
    expect(traditionsOf(w).some((t) => t.kind === 'midwinter')).toBe(true);
    const a = world('authored');
    noteOccasionOver(a, over(a, 'harvest', a.persons.slice(0, 10).map((p) => p.id)));
    noteWinterOver(a);
    for (let i = 0; i < DAY; i++) stepWorld(a);
    expect(a.traditions).toBeUndefined();
  });

  it('retells the chronicle as stories, old ones only and never about the listener', () => {
    const w = world('rich');
    const [a, b, c] = w.persons;
    addEvent(w, 'life', `${c.name} was born to someone.`, [c.id]);
    expect(pickStory(w, a.id, b.id)).toBeNull(); // too fresh
    w.tick += 4 * DAY;
    const s = pickStory(w, a.id, b.id);
    expect(s).toBeTruthy();
    expect(s!.about).toBe(c.id);
    expect(s!.text).toContain('they still tell how');
    expect(pickStory(w, a.id, c.id)).toBeNull(); // not about the listener
  });
});
