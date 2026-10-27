// Recorded before rules 33; preserves rules 32 observer-facing truth and never re-recorded.
// Meadow with no immigration reaches people who are short of a raw material, with a full pack of leftover material and a
// storehouse they know, from about tick 10500: the situation rules 33 acts on, so a leak of the new rule would show here.
import { createHash } from 'node:crypto';
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';

export function v32Continuation() {
  const original = createWorld({ ...settingsForProfile('normal', 'meadow', { dynamics: 'rich', immigration: false }), rulesVersion: 32 });
  const digest = (w: typeof original) => createHash('sha256').update(serializeWorld(w)).digest('hex');
  while (original.tick < 9600) stepWorld(original);
  const saved = digest(original);
  const restored = deserializeWorld(serializeWorld(original));
  while (original.tick < 14400) { stepWorld(original); stepWorld(restored); }
  return { saved, uninterrupted: digest(original), continued: digest(restored) };
}
