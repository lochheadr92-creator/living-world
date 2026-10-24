// Recorded from local main 4ad23f1 BEFORE reconciliation; never re-record.
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { v1Point } from './v1ref';
export function v10Continuation() {
 let w = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 10 });
 while (w.tick < 2400) stepWorld(w);
 w = deserializeWorld(serializeWorld(w));
 const saved = v1Point(w);
 while (w.tick < 4800) stepWorld(w);
 return { saved, continued: v1Point(w) };
}
