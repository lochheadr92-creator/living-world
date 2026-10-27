// Recorded before rules 30; preserves the pre-claim layout semantics and never re-recorded.
import { createHash } from 'node:crypto';
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';

export function v29Continuation() {
  const original = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 29 });
  // Preserve the exact pre-provenance envelope for the immutable reference hash.
  // Only the newly required envelope marker is omitted; every world byte remains covered.
  // Actual save/load below still uses and validates the marked envelope.
  const digest = (w: typeof original) => {
    const envelope = JSON.parse(serializeWorld(w));
    delete envelope.rulesGeneration;
    return createHash('sha256').update(JSON.stringify(envelope)).digest('hex');
  };
  while (original.tick < 5280) stepWorld(original);
  const saved = digest(original);
  const restored = deserializeWorld(serializeWorld(original));
  while (original.tick < 9600) { stepWorld(original); stepWorld(restored); }
  return { saved, uninterrupted: digest(original), continued: digest(restored) };
}
