// The lab's `deaths` outcome is documented as the deaths SINCE THE FORK (scripts/lab/lab.ts, outcomeOf). It counted everyone who ever
// died in the world, so a branch forked from a world with earlier deaths reported them as its own.
import { describe, expect, it } from 'vitest';
import { outcomeOf, runLab } from '../scripts/lab/lab';
import { DAY } from '../src/sim/constants';
import { stepWorld } from '../src/sim/world';
import { natural } from './helpers/util';

const record = (id: number, tick: number) => ({ id, name: `gone-${id}`, tick, cause: 'test', age: 40 });

describe('the lab counts deaths since the fork', () => {
  it('outcomeOf counts a death at or after the fork tick, and not one before it', () => {
    const w = natural('lab-deaths-a');
    const from = 2 * DAY;
    w.deceased.push(record(9001, from - 1), record(9002, from), record(9003, from + 500));
    expect(outcomeOf(w, from, from + DAY).outcome.deaths).toBe(2);
    expect(outcomeOf(w, 0, DAY).outcome.deaths, 'a fork at tick 0 sees them all').toBe(3);
  });

  it('a branch forked from a world that already had deaths reports none of them as its own', () => {
    const FORK = 0.1;
    const DAYS = 0.1;
    const seed = (w: ReturnType<typeof natural>) => w.deceased.push(record(9101, 3), record(9102, 7), record(9103, 11));
    const w = natural('lab-deaths-b');
    seed(w);
    const [control] = runLab(w, FORK, DAYS, [], 60);
    // the same world run straight through, counting by hand what happened after the fork tick
    const plain = natural('lab-deaths-b');
    seed(plain);
    while (plain.tick < Math.round((FORK + DAYS) * DAY)) stepWorld(plain);
    const fork = Math.round(FORK * DAY);
    const expected = plain.deceased.filter((d) => d.tick >= fork).length;
    expect(control.outcome.deaths).toBe(expected);
    expect(plain.deceased.length - expected, 'the three earlier ones are really there to be miscounted').toBeGreaterThanOrEqual(3);
  });
});
