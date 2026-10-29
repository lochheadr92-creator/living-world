// Captured from main 7625337 before rules 45 food fetch promises existed.
import { createHash } from 'node:crypto';
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';

export function v44Continuation() {
  const original = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 44 });
  const digest = (w: typeof original) => createHash('sha256').update(serializeWorld(w)).digest('hex');
  while (original.tick < 5280) stepWorld(original);
  const saved = digest(original);
  const restored = deserializeWorld(serializeWorld(original));
  while (original.tick < 9600) { stepWorld(original); stepWorld(restored); }
  return { saved, uninterrupted: digest(original), continued: digest(restored) };
}
