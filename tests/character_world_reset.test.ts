// Review of 28 November 2026, finding 6: the character renderer keeps each person's animation history by id; a different world shown in its place
// (a load of an earlier save) must start that history afresh, or a person keeps the old world's pose clock (poseT0 in the future: no blend).
import { describe, expect, it } from 'vitest';
import { CharacterRenderer } from '../src/render/characters';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';

const stateOf = (r: CharacterRenderer, id: number) => (r as unknown as { states: Map<number, { poseT0: number }> }).states.get(id)!;

describe('the character renderer and a different world', () => {
  it('after resetWorld a person of the new world starts a fresh pose clock; without it the old clock is kept', () => {
    const a = createWorld(currentWorldSettings('normal', 'meadow', { immigration: false }));
    const b = createWorld(currentWorldSettings('normal', 'meadow', { immigration: false }));
    const id = a.persons[0].id;
    expect(b.persons[0].id).toBe(id);
    const kept = new CharacterRenderer();
    kept.updateAll(a, 0, 1000);
    kept.updateAll(b, 0, 10);
    expect(stateOf(kept, id).poseT0).toBe(990); // the stale clock: later than the new world's time
    const fresh = new CharacterRenderer();
    fresh.updateAll(a, 0, 1000);
    fresh.resetWorld();
    fresh.updateAll(b, 0, 10);
    expect(stateOf(fresh, id).poseT0).toBe(0);
  });
});
