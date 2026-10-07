// The random chooser is an experiment: it must be off by default, change a world when on, and be switchable back.
import { afterEach, describe, expect, it } from 'vitest';
import { setOptionChooser } from '../src/sim/decision';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

afterEach(() => setOptionChooser('utility'));

describe('the option chooser', () => {
  it('ranks by utility unless asked otherwise, deterministically', () => {
    const a = natural('chooser-a');
    run(a, 600);
    const b = natural('chooser-a');
    run(b, 600);
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  it('changes what people do when set to random, the same way every time, and goes back', () => {
    const base = natural('chooser-b');
    run(base, 600);
    setOptionChooser('random');
    const r1 = natural('chooser-b');
    run(r1, 600);
    const r2 = natural('chooser-b');
    run(r2, 600);
    expect(hashWorld(r1)).toBe(hashWorld(r2));
    expect(hashWorld(r1)).not.toBe(hashWorld(base));
    setOptionChooser('utility');
    const again = natural('chooser-b');
    run(again, 600);
    expect(hashWorld(again)).toBe(hashWorld(base));
  });
});
