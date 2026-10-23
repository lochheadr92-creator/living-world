// A VERSION-8 CONTINUATION REFERENCE, recorded from the revision BEFORE eating at a store with a full pack (version 9) existed.
//
// Same purpose as v1ref/v7ref: a test on the version LABEL cannot catch a gate that leaked, because a leaked gate keeps the label
// and changes the world. This runs a world stamped `rulesVersion: 8`, saves and reloads it through the real save path,
// continues it, and compares hashes and plain counts. Re-recording it to make a change pass would delete the only evidence of
// such a leak.
//
// Unlike v7ref, this reference also carries the number of times somebody reached a store that held food and could not eat it
// because their pack was full. The reference world has to CONTAIN the situation the new rule changes, or a leak could not show:
// if a version-9 rule reached this world, that count would fall and the hash would move.
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { v1Point } from './v1ref';
import { watchStoreMeals } from './storewatch';

/** Pinned to the courier-recovery generation, never to CURRENT_RULES_VERSION. */
export function v8Continuation() {
  let w = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 8 });
  const watch = watchStoreMeals();
  watch.attach(w);
  const step = () => {
    stepWorld(w);
    watch.scan(w);
  };
  while (w.tick < 7200) step();
  w = deserializeWorld(serializeWorld(w));
  if (w.settings.rulesVersion !== 8) throw new Error(`the reference world came back as ${String(w.settings.rulesVersion)}, not version 8`);
  watch.attach(w);
  const point = () => ({
    ...v1Point(w),
    indoors: w.persons.filter((p) => p.indoors).length,
    solidHomes: w.buildings.filter((b) => b.type === 'hut' || b.type === 'house').length,
    homeSites: w.sites.filter((s) => s.type === 'hut' || s.type === 'house' || s.type === 'lean_to').length,
    // cumulative since tick 0, read off the world's own results as they were written
    storeMeals: { ...watch.meals },
  });
  const saved = point();
  while (w.tick < 12000) step();
  return { saved, continued: point() };
}
