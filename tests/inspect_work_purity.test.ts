import { expect, it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { createWorld } from '../src/sim/factory';
import { describeFacility, describeSiteSections } from '../src/sim/inspect_work';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';

// The observer material note (inspect_work.ts) is read-only: describing every site and workplace every tick must
// leave the world byte-for-byte what an unobserved twin is. The note reads world truth (nearest source/stock, the
// recipe, who knows a source) but never writes, so this is a pure-observer guarantee, not a decision.
it('reading the observer material note for every site and workplace every tick changes nothing', () => {
  const make = () => createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  const looked = make();
  const twin = make();
  for (let t = 0; t < 4800; t++) {
    stepWorld(looked);
    stepWorld(twin);
    for (const s of looked.sites) describeSiteSections(looked, s);
    for (const b of looked.buildings) describeFacility(looked, b);
  }
  expect(hashWorld(looked)).toBe(hashWorld(twin));
  expect(serializeWorld(looked)).toBe(serializeWorld(twin));
}, 120000);
