// A belief learned by word of mouth used to carry keys set to undefined (news.ts copied `items`/`need` as undefined when the original
// had none). A save drops such keys, and the packed belief rows refuse any belief holding one, so the live world was written one
// way and its reloaded copy another: different bytes although nothing in them differed. They must serialise the same, and a save
// written by the code from before the fix must still load and carry on exactly as the live world does.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import type { World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { deepHash } from './helpers/golden';
import { natural, run } from './helpers/util';

const told = (w: World) => w.persons.flatMap((p) => Object.values(p.beliefs)).filter((b) => b.src === 'told');

// Two kinds of world. The default one (unversioned, authored) is where packed belief rows are written, so it is where live and
// reloaded bytes could part. The product one (rich, current rules) never packs today, because other person fields are undefined; the
// same invariants must hold there, and would matter the day that changes.
const CONFIGS: Array<{ name: string; make: (seed: string) => World; packs: boolean }> = [
  { name: 'default world', make: (seed) => natural(seed), packs: true },
  { name: 'product world', make: (seed) => createWorld(currentWorldSettings('normal', seed, { immigration: false })), packs: false },
];

for (const { name, make, packs } of CONFIGS) {
  describe(`beliefs passed on by word of mouth (${name})`, () => {
    it('carry no undefined fields, so a world and its reloaded copy serialise to the same bytes and carry on identically', () => {
      const w = make('told-beliefs');
      run(w, Math.round(DAY * 5.1));
      expect(told(w).length, 'the case only means something once somebody has been told something').toBeGreaterThan(0);
      expect(serializeWorld(w).includes('"__bel"'), 'packed belief rows are written in this kind of world').toBe(packs);
      for (const p of w.persons) {
        for (const b of Object.values(p.beliefs)) {
          for (const [f, v] of Object.entries(b)) expect(v, `${p.name} belief ${b.id} field ${f}`).not.toBeUndefined();
        }
      }
      // reload at several moments and keep going: the live world and the copy never part (bytes, compact hash, deep hash)
      let c = deserializeWorld(serializeWorld(w));
      expect(serializeWorld(c)).toBe(serializeWorld(w));
      for (let i = 0; i < 4; i++) {
        run(w, 300);
        run(c, 300);
        expect(serializeWorld(c), `bytes after ${(i + 1) * 300} more ticks`).toBe(serializeWorld(w));
        expect(hashWorld(c)).toBe(hashWorld(w));
        expect(deepHash(c)).toBe(deepHash(w));
        c = deserializeWorld(serializeWorld(w));
      }
    }, 240_000);

    it('a save written before the fix (told beliefs holding undefined keys) loads and replays exactly as the fixed world does', () => {
      const w = make('told-beliefs-legacy');
      run(w, Math.round(DAY * 5.1));
      const fixed = serializeWorld(w);
      // what the old code would have held in memory and written: the absent fields present as undefined, on told beliefs only
      let restored = 0;
      for (const b of told(w)) {
        if (b.items === undefined) {
          b.items = undefined;
          restored++;
        }
        if (b.need === undefined) {
          b.need = undefined;
          restored++;
        }
      }
      expect(restored, 'some told belief lacked items or need, so the old code would have written undefined for it').toBeGreaterThan(0);
      const legacy = serializeWorld(w);
      if (packs) expect(legacy, 'the old bytes were written another way (plain beliefs, not packed rows)').not.toBe(fixed);
      // the same world either way: the meaning of the two saves is identical, and they replay identically
      const fromLegacy = deserializeWorld(legacy);
      const fromFixed = deserializeWorld(fixed);
      expect(deepHash(fromLegacy)).toBe(deepHash(fromFixed));
      expect(hashWorld(fromLegacy)).toBe(hashWorld(fromFixed));
      run(fromLegacy, 600);
      run(fromFixed, 600);
      expect(hashWorld(fromLegacy)).toBe(hashWorld(fromFixed));
      expect(serializeWorld(fromLegacy)).toBe(serializeWorld(fromFixed));
    }, 240_000);
  });
}
