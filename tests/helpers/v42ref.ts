// Captured from main 809e567 before rules 43 heard local demand existed.
import { createHash } from 'node:crypto';
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';

export function v42Continuation() {
  const original = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 42 });
  const digest = (w: typeof original) => createHash('sha256').update(serializeWorld(w)).digest('hex');
  while (original.tick < 5280) stepWorld(original);
  const saved = digest(original);
  const restored = deserializeWorld(serializeWorld(original));
  while (original.tick < 9600) { stepWorld(original); stepWorld(restored); }
  return { saved, uninterrupted: digest(original), continued: digest(restored) };
}
