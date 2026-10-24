// A VERSION-8 CONTINUATION REFERENCE, recorded from the revision BEFORE the warmth-and-shelter change (version 9) existed.
//
// Same purpose as v4ref/v6ref: a test on the version LABEL cannot catch a gate that leaked, because a leaked gate keeps the
// label and changes the world. This runs a world stamped `rulesVersion: 8`, saves and reloads it through the real save path,
// continues it, and compares hashes and plain counts. Re-recording it to make a change pass would delete the only evidence
// of such a leak.
import { createWorld } from '../../src/sim/factory';
import { settingsForProfile } from '../../src/sim/profiles';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { stepWorld } from '../../src/sim/world';
import { v1Point } from './v1ref';

/** Pinned to the iron-chain-fix generation (version 8), never to CURRENT_RULES_VERSION. */
export function v8Continuation() {
  let w = createWorld({ ...settingsForProfile('normal', 'river', { dynamics: 'rich', immigration: false }), rulesVersion: 8 });
  while (w.tick < 7200) stepWorld(w);
  w = deserializeWorld(serializeWorld(w));
  if (w.settings.rulesVersion !== 8) throw new Error(`the reference world came back as ${String(w.settings.rulesVersion)}, not version 8`);
  // Beside the version-1 counts, the things the next change (version 9: warmth and shelter) could move: how many people
  // know an ore vein, what workshops stand (a smithy, a kiln), iron and charcoal in the world, and how many solid homes stand.
  const point = () => ({
    ...v1Point(w),
    oreKnowers: w.persons.filter((p) => p.alive && Object.values(p.beliefs).some((b) => b.btype === 'source' && b.kind === 'ore_vein')).length,
    smithies: w.buildings.filter((b) => b.type === 'smithy').length,
    kilns: w.buildings.filter((b) => b.type === 'kiln').length,
    iron: w.persons.reduce((n, p) => n + (p.inv.iron ?? 0), 0),
    charcoal: w.persons.reduce((n, p) => n + (p.inv.charcoal ?? 0), 0),
    ironTools: w.persons.reduce((n, p) => n + ((p.bykind as Record<string, number[]>).tool ?? []).filter((id) => ((w.byId.get(id) as { tier?: number } | undefined)?.tier ?? 0) === 1).length, 0),
    homes: w.buildings.filter((b) => b.type === 'hut' || b.type === 'house').length,
  });
  const saved = point();
  while (w.tick < 9600) stepWorld(w);
  return { saved, continued: point() };
}
