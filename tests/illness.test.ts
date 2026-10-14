// Illness (src/sim/illness.ts): a fever is caught, passes between people, costs health, is slept off, and leaves a while of
// immunity; an authored world never has one.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { IMMUNE_FOR, expose, fallIll, illnessTick } from '../src/sim/illness';
import { settingsForProfile } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));

describe('a fever', () => {
  it('is caught, worsens through the first day, costs health, and is slept off faster than worked through', () => {
    const w = world('rich');
    const p = w.persons[0];
    expect(fallIll(w, p, 'after the cold')).toBe(true);
    expect(fallIll(w, p, '')).toBe(false); // not twice at once
    expect(w.events.some((e) => e.text.includes('come down with a fever'))).toBe(true);
    const h0 = p.health;
    // a day of it, awake, fed and warm: severity rises and health falls
    p.pose = 'stand';
    for (let t = 0; t < DAY; t++) {
      w.tick++;
      p.needs.hunger = 80;
      p.needs.warmth = 80;
      illnessTick(w, p);
    }
    expect(p.illness).toBeTruthy();
    expect(p.illness!.severity).toBeGreaterThan(0.5);
    expect(p.health).toBeLessThan(h0);
    // then asleep until it passes: rest counts double
    p.pose = 'sleep';
    let ticks = 0;
    while (p.illness && ticks < 6 * DAY) {
      w.tick++;
      ticks++;
      p.needs.hunger = 80;
      p.needs.warmth = 80;
      illnessTick(w, p);
    }
    expect(p.illness).toBeUndefined();
    expect(ticks).toBeLessThan(2.5 * DAY);
    expect(p.immuneUntil).toBe(w.tick + IMMUNE_FOR);
    expect(fallIll(w, p, '')).toBe(false); // immune for a while
    expect(w.events.some((e) => e.text.includes('over the fever'))).toBe(true);
  });

  it('passes from one person to another by exposure, by a chance that depends on how bad it is', () => {
    const w = world('rich');
    const [a, b] = w.persons;
    fallIll(w, a, '');
    a.illness!.severity = 1;
    let passed = 0;
    for (let i = 0; i < 200 && !passed; i++) {
      w.tick++;
      if (expose(w, a, b, 0.12)) passed++;
    }
    expect(passed).toBe(1);
    expect(b.illness?.how).toBe(`caught from ${a.name}`);
    // the well pass nothing
    expect(expose(w, b, w.persons[2], 1)).toBe(true);
    expect(expose(w, w.persons[3], w.persons[4], 1)).toBe(false);
  });

  it('never happens in an authored world, and in a rich one the ill rest', () => {
    const a = world('authored');
    for (let i = 0; i < 2 * DAY; i++) stepWorld(a);
    expect(a.persons.every((p) => p.illness === undefined && p.immuneUntil === undefined)).toBe(true);
    expect(fallIll(a, a.persons[0], '')).toBe(false);
    const r = world('rich');
    for (let i = 0; i < 300; i++) stepWorld(r);
    const p = r.persons.find((x) => x.alive && x.needs.energy > 60)!;
    fallIll(r, p, '');
    p.illness!.severity = 1;
    let rested = 0;
    for (let i = 0; i < DAY; i++) {
      stepWorld(r);
      if (p.pose === 'sleep' || p.pose === 'sit') rested++;
    }
    expect(rested).toBeGreaterThan(DAY * 0.3);
  });
});
