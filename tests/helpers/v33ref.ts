// Recorded before rules 34 (winter shelter preparation); preserves rules 33 leave-heaviest and never re-recorded.
// Meadow with no immigration reaches the pre-winter window (tick 14400, two days before winter) and continues
// through the first winter (tick 21600, one winter day in): exactly the window rules 34 acts on, so a leak of the
// winter cue, the shelter/repair score boosts or the site exemptions would change a decision or a site's life and
// show here.
import { createHash } from 'node:crypto';
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';

export function v33Continuation() {
  const original = createWorld({ ...settingsForProfile('normal', 'meadow', { dynamics: 'rich', immigration: false }), rulesVersion: 33 });
  const digest = (w: typeof original) => createHash('sha256').update(serializeWorld(w)).digest('hex');
  while (original.tick < 14400) stepWorld(original);
  const saved = digest(original);
  const restored = deserializeWorld(serializeWorld(original));
  while (original.tick < 21600) { stepWorld(original); stepWorld(restored); }
  return { saved, uninterrupted: digest(original), continued: digest(restored) };
}
