// Recorded from main 1448583 before any rules-60 behaviour. Never regenerate for a successor.
import { createHash } from 'node:crypto';
import { createWorld } from '../../src/sim/factory';
import { currentWorldSettings } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { cartPrerequisiteScene, selectPrerequisite } from './tool_prerequisite';
import { give, pin } from './kit';
import { ledgerCreate } from '../../src/sim/economy';
import { generateOptions } from '../../src/sim/decision';
import { reviewIntentions } from '../../src/sim/intent';
import type { World } from '../../src/sim/types';

export function v59Continuation() {
  const digest = (w: World) => createHash('sha256').update(serializeWorld(w)).digest('hex');
  const w = createWorld({ ...currentWorldSettings('normal', 'river', { immigration: false }), rulesVersion: 59 });
  while (w.tick < 5680) stepWorld(w);
  const saved = digest(w), copy = deserializeWorld(serializeWorld(w));
  while (w.tick < 9600) { stepWorld(w); stepWorld(copy); }
  const f = cartPrerequisiteScene(59);
  give(f.w, f.p, 'hammer'); ledgerCreate(f.w, 'hammer', 1, 'test equipment'); pin(f.p);
  reviewIntentions(generateOptions(f.w, f.p, true));
  const { restore } = selectPrerequisite(f.w, f.p, `operate:${f.yard.id}:build_cart`);
  try {
    for (let n = 0; n < 8; n++) stepWorld(f.w);
    const cartSaved = digest(f.w), cartCopy = deserializeWorld(serializeWorld(f.w));
    for (let n = 0; n < 1200; n++) { stepWorld(f.w); stepWorld(cartCopy); }
    return { saved, uninterrupted: digest(w), continued: digest(copy), cartSaved, cartUninterrupted: digest(f.w), cartContinued: digest(cartCopy) };
  } finally { restore(); }
}
