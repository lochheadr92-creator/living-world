// Recorded from local main version 26 BEFORE inhabitant audit repairs; never re-record.
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { v1Point } from './v1ref';
export function v26Continuation() {
 let w = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 26 });
 while (w.tick < 2500) stepWorld(w);
 w = deserializeWorld(serializeWorld(w));
 const saved = v1Point(w);
 while (w.tick < 4800) stepWorld(w);
 return { saved, continued: v1Point(w) };
}

