// The settlement's record (events.ts chronicle, buildings that remember, world.ts roads) and the ask worth making
// (options_social.ts): rich worlds only.
import { describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { CHRONICLE_MAX, addEvent, chronicleWorthy } from '../src/sim/events';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));

describe('the chronicle', () => {
  it('keeps what is worth remembering in a rich world, bounded, and nothing in an authored one', () => {
    const r = world('rich');
    addEvent(r, 'life', 'Sven has died.');
    addEvent(r, 'work', 'Bea finished sawing planks at the timber yard.');
    addEvent(r, 'build', 'Kai finished a hut for the Ash household.');
    expect(r.chronicle!.map((e) => e.text)).toEqual(['Sven has died.', 'Kai finished a hut for the Ash household.']);
    expect(chronicleWorthy('nature', 'A lean season begins')).toBe(true);
    expect(chronicleWorthy('work', 'routine')).toBe(false);
    for (let i = 0; i < CHRONICLE_MAX + 20; i++) addEvent(r, 'life', `event ${i}`);
    expect(r.chronicle!.length).toBe(CHRONICLE_MAX);
    expect(r.chronicle![0].text).toBe('event 20');
    const a = world('authored');
    addEvent(a, 'life', 'Sven has died.');
    for (let i = 0; i < DAY; i++) stepWorld(a);
    expect(a.chronicle).toBeUndefined();
  });
});

describe('roads', () => {
  it('harden where the wear stays high for two days, stay worn, and never form in an authored world', () => {
    const r = world('rich');
    const i = Math.floor(r.camp.y) * r.W + Math.floor(r.camp.x) + 2;
    for (let t = 0; t < 9 * 600 + 10; t++) {
      r.wear[i] = 1;
      stepWorld(r);
    }
    expect(r.roads![i]).toBe(1);
    for (let t = 0; t < 200; t++) stepWorld(r);
    expect(r.wear[i]).toBeGreaterThanOrEqual(0.7);
    const a = world('authored');
    for (let t = 0; t < 9 * 600 + 10; t++) {
      a.wear[i] = 1;
      stepWorld(a);
    }
    expect(a.roads).toBeUndefined();
  });
});

describe('a building remembers', () => {
  it('who finished it, in a rich world only', () => {
    const r = world('rich');
    const a = world('authored');
    expect(createBuilding(r, 'hut', 2, 2, 0, { condition: 90 }).builtBy).toBeUndefined(); // placed by hand: nobody built it
    for (let t = 0; t < 2 * DAY; t++) {
      stepWorld(r);
      stepWorld(a);
    }
    const built = r.buildings.filter((b) => b.builtBy);
    for (const b of built) expect(b.built).toBeGreaterThan(0);
    expect(a.buildings.every((b) => b.builtBy === undefined && b.built === undefined)).toBe(true);
  });
});
