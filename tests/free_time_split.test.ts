// The free-time watcher (scripts/observers/free_time.ts) only reads: a world watched every tick ends where the same world unwatched ends.
// And the report's grouping keeps its meaning for the labels it was written against (scripts/free_time_report.ts).
import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import { emptyTally, observeFreeTime, template } from '../scripts/observers/free_time';
import { groupOf } from '../scripts/free_time_report';

describe('free-time split', () => {
  it('watching changes nothing in the world', () => {
    const make = () => createWorld(currentWorldSettings('normal', 'meadow', { immigration: true }));
    const a = make(), b = make(), t = emptyTally();
    for (let n = 0; n < 1200; n++) { observeFreeTime(a, t); stepWorld(a); stepWorld(b); }
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(t.samples).toBe(1200);
    expect(t.awake.a12 + t.asleep.a12).toBeGreaterThan(0);
    expect(Object.keys(t.kinds).length).toBeGreaterThan(5);
  });

  it('labels become templates and fall into their groups', () => {
    expect(template('Talking with Edda III')).toBe('Talking with @');
    expect(template('At the harvest feast')).toBe('At the harvest feast');
    expect(groupOf('converse', 'Talking with @')).toBe('chosen talk');
    expect(groupOf('converse', 'Family time with @')).toBe('family time');
    expect(groupOf('converse', 'Foraging practice with @')).toBe('teaching and practice');
    expect(groupOf('wander', 'Sitting by the fire')).toBe('evening at the fire');
    expect(groupOf('rest', 'Staying at the fire')).toBe('evening at the fire');
    expect(groupOf('rest', 'Settling @ for the night')).toBe('care of others');
    expect(groupOf('rest', 'Staying at my lean-to')).toBe('rest at home');
    expect(groupOf('attend', 'At the harvest feast')).toBe('called gatherings');
    expect(groupOf('gather', 'Chopping wood')).toBe('work');
  });
});
