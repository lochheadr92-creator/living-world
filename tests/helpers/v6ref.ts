// A VERSION-6 CONTINUATION REFERENCE, recorded from the revision BEFORE household shelter plans (version 7) existed.
//
// Same purpose as v1ref/v4ref: a test on the version LABEL cannot catch a gate that leaked, because a leaked gate keeps the
// label and changes the world. This runs a world stamped `rulesVersion: 6`, saves and reloads it through the real save path,
// continues it, and compares hashes and plain counts. Re-recording it to make a change pass would delete the only evidence
// of such a leak.
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { v1Point } from './v1ref';

/** Pinned to fatal-injury finality's generation, never to CURRENT_RULES_VERSION. */
export function v6Continuation() {
  let w = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 6 });
  while (w.tick < 7200) stepWorld(w);
  w = deserializeWorld(serializeWorld(w));
  if (w.settings.rulesVersion !== 6) throw new Error(`the reference world came back as ${String(w.settings.rulesVersion)}, not version 6`);
  // Beside the version-1 counts, the two things household shelter plans would move: who is indoors, and how many solid homes
  // and open home sites there are. A leak into version 6 would show here in words, not only in the hash.
  const point = () => ({
    ...v1Point(w),
    indoors: w.persons.filter((p) => p.indoors).length,
    solidHomes: w.buildings.filter((b) => b.type === 'hut' || b.type === 'house').length,
    homeSites: w.sites.filter((s) => s.type === 'hut' || s.type === 'house' || s.type === 'lean_to').length,
  });
  const saved = point();
  while (w.tick < 9600) stepWorld(w);
  return { saved, continued: point() };
}
