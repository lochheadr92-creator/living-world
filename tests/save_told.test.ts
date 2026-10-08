// A belief learned by word of mouth used to carry keys set to undefined, which a save drops: the saved world and the live one then
// serialised differently (packed rows against a plain record) although nothing in them differed. They must serialise the same.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { natural, run } from './helpers/util';

describe('beliefs passed on by word of mouth', () => {
  it('carry no undefined fields, so a world and its reloaded copy serialise to the same bytes after running on', () => {
    const w = natural('told-beliefs');
    run(w, Math.round(DAY * 5.1));
    let told = 0;
    for (const p of w.persons) {
      for (const k of Object.keys(p.beliefs)) {
        const b = p.beliefs[Number(k)] as unknown as Record<string, unknown>;
        if (b.src === 'told') told++;
        for (const f of Object.keys(b)) expect(b[f], `${p.name} ${k} ${f}`).not.toBeUndefined();
      }
    }
    expect(told).toBeGreaterThan(0); // (the case only means something once somebody has been told something)
    const c = deserializeWorld(serializeWorld(w));
    run(w, 200);
    run(c, 200);
    expect(serializeWorld(c)).toBe(serializeWorld(w));
  });
});
