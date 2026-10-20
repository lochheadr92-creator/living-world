import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { v1Point } from './v1ref';

// Pinned to integrated wolf-defence generation, never to CURRENT_RULES_VERSION.
export function v4Continuation() {
  let w = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 4 });
  while (w.tick < 7200) stepWorld(w);
  w = deserializeWorld(serializeWorld(w));
  const point = () => ({ ...v1Point(w), indoors: w.persons.filter(p => p.indoors).length });
  const saved = point();
  while (w.tick < 9600) stepWorld(w);
  return { saved, continued: point() };
}
