// The counterfactual lab (scripts/lab): a fork is exact, an intervention changes only what it says, and the statistics are deterministic.
import { describe, expect, it } from 'vitest';
import { runLab, parseIntervention } from '../scripts/lab/lab';
import { paired, verdict } from '../scripts/lab/stats';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

const FORK = 0.1;
const DAYS = 0.3;
const TICKS = Math.round((FORK + DAYS) * 2400);

describe('the counterfactual lab', () => {
  const results = runLab(natural('lab-a'), FORK, DAYS, ['nudge:1', 'no-wolf-memory', 'random-choice', 'no-wood'], 60);
  const by = (spec: string) => results.find((r) => r.spec === spec)!;

  it('forks exactly: the control ends in the state the unforked world reaches', () => {
    const plain = natural('lab-a');
    run(plain, TICKS);
    expect(by('control').finalHash).toBe(hashWorld(plain));
    expect(by('control').divergedAfterTicks).toBeNull();
  });

  it('a one-draw nudge parts from the control, and an exact optimisation switched off does not', () => {
    expect(by('nudge:1').finalHash).not.toBe(by('control').finalHash);
    expect(by('nudge:1').divergedAfterTicks).not.toBeNull();
    expect(by('no-wolf-memory').finalHash).toBe(by('control').finalHash);
    expect(by('no-wolf-memory').divergedAfterTicks).toBeNull();
  });

  it('random choice changes the world, and the switch is back afterwards', () => {
    expect(by('random-choice').finalHash).not.toBe(by('control').finalHash);
    const again = runLab(natural('lab-a'), FORK, DAYS, [], 60);
    expect(again[0].finalHash).toBe(by('control').finalHash);
  });

  it('removing sources reports how many it removed', () => {
    expect(by('no-wood').note).toMatch(/^[1-9]\d* sources removed$/);
  });

  it('rejects a branch it does not know', () => {
    expect(() => parseIntervention('no-such-thing')).toThrow(/unknown branch/);
  });
});

describe('the lab statistics', () => {
  it('gives the same interval every time, and a degenerate one for equal differences', () => {
    const d = [2, 3, 1, 4, 2, 3, 5, 2];
    expect(paired(d)).toEqual(paired(d));
    const flat = paired([2, 2, 2, 2]);
    expect(flat.lo).toBe(2);
    expect(flat.hi).toBe(2);
  });

  it('calls an effect larger than chance only when the interval excludes 0 and the mean beats the noise floor', () => {
    const big = paired([5, 6, 4, 7, 5, 6]);
    expect(verdict(big, 2, false)).toBe('larger than chance');
    expect(verdict(big, 9, false)).toBe('systematic, within the noise floor');
    expect(verdict(paired([3, -3, 2, -2, 1, -1]), 1, false)).toBe('not distinguishable from chance');
    expect(verdict(big, 2, true)).toBe('identical');
    expect(verdict(paired([5, 6, 4]), 2, false)).toBe('too few seeds to say');
  });
});
