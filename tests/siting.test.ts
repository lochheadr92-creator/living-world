import { describe, expect, it } from 'vitest';
import { doorStaysConnected, findBuildSpot } from '../src/sim/buildings';
import { BUILD_DEF } from '../src/sim/constants';
import { makeSource } from '../src/sim/sources';
import type { BuildingType } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

// STAGED, after seed cedar (default settings), where Una stood on the doorway of the quarry she marked out at t29,197, the
// quarry's footprint closed the only way out of the little nook she was standing in (477 reachable tiles became 2), and she
// died of thirst there. Here: a 2×2 spot at (52,50) whose doorway row (52..53, 52) is walled in by rocks on three sides, so
// the only way out of the nook runs north across the footprint itself.
function nook(name: string) {
  const s = stage(name);
  for (const [x, y] of [[51, 50], [51, 51], [54, 50], [54, 51], [51, 52], [54, 52], [51, 53], [52, 53], [53, 53], [54, 53]]) makeSource(s.w, 'rock', x, y);
  const una = addPerson(s, 'Una', 52.5, 52.5);
  const w = done(s);
  return { w, una };
}

const twoByTwo = (Object.keys(BUILD_DEF) as BuildingType[]).filter((t) => BUILD_DEF[t].w === 2 && BUILD_DEF[t].h === 2);

describe('a new building never shuts anyone in', () => {
  it('a spot whose footprint would close the only way out of the doorway is recognised as such', () => {
    const { w, una } = nook('door-nook');
    expect(twoByTwo.length).toBeGreaterThan(3);
    for (const type of twoByTwo) {
      expect(doorStaysConnected(w, una, type, 52, 50), type).toBe(false);
      expect(doorStaysConnected(w, una, type, 60, 46), `${type} out in the open`).toBe(true);
    }
  });

  it('is never chosen: with nothing else nearby there is no spot, and with room to look a connected one is found', () => {
    const { w, una } = nook('door-nook-choice');
    for (const type of twoByTwo) {
      // looking only right here, the nook's spot is the best (and only) candidate, and it is turned down
      expect(findBuildSpot(w, una, type, 53, 51, 0, 1.2, 0), type).toBeNull();
      // looking a little further, the spot found keeps its doorway connected to the camp and to Una
      const spot = findBuildSpot(w, una, type, 53, 51, 0, 6, 0);
      expect(spot, type).not.toBeNull();
      expect(spot, type).not.toEqual({ x: 52, y: 50 });
      expect(doorStaysConnected(w, una, type, spot!.x, spot!.y), type).toBe(true);
    }
  });
});
