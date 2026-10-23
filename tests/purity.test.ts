// OBSERVER PURITY: opening a person's card must not change what the world does next.
//
// `describePerson(..., { opportunities: true })` runs the same option planner the person uses to decide. That planner notes a few
// things as it goes (a held-up promise, a request already considered); those notes are for the person's own deciding and must not
// be written for an onlooker. A check that looks at one moment can miss it, so this looks at every person, often, and compares the
// world that is looked at with a twin nobody looks at. The profile is the product one (rich, current rules, Normal size).
import { describe, expect, it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { createWorld } from '../src/sim/factory';
import { describePerson } from '../src/sim/inspect';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld } from '../src/sim/world';
import { run } from './helpers/util';

/** The path of the first place two plain values differ, or null. */
function firstDifference(a: unknown, b: unknown, path = ''): string | null {
  if (Object.is(a, b)) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return `${path || '(root)'}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs object`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = firstDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
    if (d) return d;
  }
  return null;
}

describe('asking what a person could do changes nothing in the world', () => {
  for (const seed of ['river', 'meadow']) {
    it(`${seed}: every person looked at every 250 ticks leaves them, and the world, exactly as an unwatched twin`, () => {
      const make = () => createWorld(currentWorldSettings('normal', seed, { immigration: false }));
      const looked = make();
      const twin = make();
      let looks = 0;
      for (let t = 0; t < 5000; t += 250) {
        run(looked, 250);
        run(twin, 250);
        for (const p of looked.persons) {
          if (!p.alive) continue;
          const before = JSON.stringify(p);
          const hash = hashWorld(looked);
          expect(describePerson(looked, p.id, { opportunities: true }), `a card for ${p.name}`).not.toBeNull();
          const after = JSON.stringify(p);
          if (after !== before) expect(firstDifference(JSON.parse(before), JSON.parse(after)), `asking about ${p.name} at tick ${looked.tick} changed them`).toBeNull();
          expect(hashWorld(looked), `asking about ${p.name} at tick ${looked.tick} changed the world hash`).toBe(hash);
          looks++;
        }
        const a = serializeWorld(looked);
        const b = serializeWorld(twin);
        if (a !== b) expect(firstDifference(JSON.parse(a), JSON.parse(b)), `the looked-at world has drifted from its twin by tick ${looked.tick}`).toBeNull();
      }
      expect(looks).toBeGreaterThan(300);
    }, 600_000);
  }
});
