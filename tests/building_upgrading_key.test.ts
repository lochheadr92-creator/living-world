// A key assigned `undefined` at runtime (Building.upgrading) is dropped by JSON; if the field is set again after a load it is
// appended at the END of the object, so the serialized text of a loaded world and of the uninterrupted world differ while the
// state is equal, and a text-digest continuation check would call that a divergence (review B2). The field must be removed,
// not set to undefined, so both worlds write the same text.
import { expect, it } from 'vitest';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { cancelSite, completeSite, createSite } from '../src/sim/buildings';
import { hashWorld } from '../src/sim/world';
import { deepEqualState } from '../scripts/statediff';
import { stage, addPerson, building, done } from './helpers/kit';
import type { Site } from '../src/sim/types';

function staged(name: string) {
  const s = stage(name);
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 115;
  const p = addPerson(s, 'Ada', 40, 40, { age: 30 });
  const hut = building(s, 'hut', 44, 40, p.hhId);
  done(s);
  return { w, p, hut };
}

for (const how of ['completed', 'cancelled'] as const) {
  it(`an upgrade ${how}, the world saved, the home upgraded again: loaded and uninterrupted worlds write the same text`, () => {
    const { w, p, hut } = staged('upgrading-key-' + how);
    const first = createSite(w, 'house', hut.x, hut.y + 4, hut.hhId, p.id, { upgradeOf: hut.id }) as Site;
    expect(hut.upgrading).toBe(first.id);
    if (how === 'completed') completeSite(w, first, p);
    else cancelSite(w, first, 'staged');
    expect(hut.upgrading).toBeUndefined();
    expect('upgrading' in hut).toBe(false);
    const copy = deserializeWorld(serializeWorld(w));
    const hut2 = copy.buildings.find((b) => b.id === hut.id)!;
    const a = createSite(w, 'house', hut.x, hut.y + 4, hut.hhId, p.id, { upgradeOf: hut.id }) as Site;
    const b = createSite(copy, 'house', hut2.x, hut2.y + 4, hut2.hhId, p.id, { upgradeOf: hut2.id }) as Site;
    expect(a.id).toBe(b.id);
    const ta = serializeWorld(w);
    const tb = serializeWorld(copy);
    expect(deepEqualState(JSON.parse(ta), JSON.parse(tb))).toBe(true);
    expect(hashWorld(w)).toBe(hashWorld(copy));
    // the texts, not the key lists: `ops` is created undefined on every non-workshop building and is never set on a home, so it is
    // absent after a load and dropped by JSON before it; only a key that is set AGAIN after being cleared can tell the two apart
    expect(ta).toBe(tb);
  });
}
