import { describe, expect, it } from 'vitest';
import { natural, run } from './helpers/util';
import { expectSameWorld, reloaded } from './helpers/resume';

describe('saving half way and carrying on gives exactly the world that was never saved', () => {
  // Each seed runs T ticks straight; a second copy runs T/2, is saved and loaded, and runs the other T/2.
  // The whole serialised world is compared, not only hashWorld (which skips relation details, beliefs, promise and
  // request contents, cooldowns and reservations).
  for (const [seed, T] of [['meadow', 9000], ['river', 16000]] as const) {
    it(`${seed}: ${T / 2} + save/load + ${T / 2} ticks equals ${T} ticks`, () => {
      const straight = natural(seed);
      run(straight, T);
      let resumed = natural(seed);
      run(resumed, T / 2);
      resumed = reloaded(resumed);
      run(resumed, T / 2);
      expect(resumed.tick).toBe(T);
      expectSameWorld(straight, resumed);
    }, 240_000);
  }
});
