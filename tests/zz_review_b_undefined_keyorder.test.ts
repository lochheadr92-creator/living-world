// Regression from review B: completing an upgrade deletes its temporary key.
// A later upgrade must then have the same key order and exact saved state with or without an intervening load.
import { expect, it } from 'vitest';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { completeSite, createSite } from '../src/sim/buildings';
import { hashWorld } from '../src/sim/world';
import { deepEqualState, firstDiffs } from '../scripts/statediff';
import { stage, addPerson, building, done } from './helpers/kit';
import type { Site } from '../src/sim/types';

it('completed upgrade keys stay absent, and a later upgrade continues exactly across a load', () => {
  const s = stage('review-upgrading');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = 115;
  const p = addPerson(s, 'Ada', 40, 40, { age: 30 });
  const hut = building(s, 'hut', 44, 40, p.hhId);
  done(s);
  // first upgrade through the real engine path: lay the upgrade site, complete it
  const first = createSite(w, 'house', hut.x, hut.y + 4, hut.hhId, p.id, { upgradeOf: hut.id }) as Site;
  expect(hut.upgrading).toBe(first.id);
  completeSite(w, first, p);
  expect('upgrading' in hut).toBe(false);
  expect(hut.upgrading).toBeUndefined();
  const keysBefore = Object.keys(hut);
  const text = serializeWorld(w);
  const copy = deserializeWorld(text);
  const hut2 = copy.buildings.find((b) => b.id === hut.id)!;
  expect('upgrading' in hut2, 'the cleared upgrade key stays absent after loading').toBe(false);
  // the same later event in both worlds: another upgrade site on the same home
  const a = createSite(w, 'house', hut.x, hut.y + 4, hut.hhId, p.id, { upgradeOf: hut.id }) as Site;
  const b = createSite(copy, 'house', hut2.x, hut2.y + 4, hut2.hhId, p.id, { upgradeOf: hut2.id }) as Site;
  expect(a.id).toBe(b.id);
  const ta = serializeWorld(w);
  const tb = serializeWorld(copy);
  const pa = JSON.parse(ta), pb = JSON.parse(tb);
  const equal = deepEqualState(pa, pb);
  const diffs = firstDiffs(pa, pb, 5);
  const orderA = Object.keys(hut).join(','), orderB = Object.keys(hut2).join(',');
  console.log(`keys before: ${keysBefore.join(',')}\nuninterrupted: ${orderA}\nloaded:        ${orderB}\nhash equal: ${hashWorld(w) === hashWorld(copy)}; deepEqualState: ${equal}; text equal: ${ta === tb}; diffs: ${diffs.join(' | ')}`);
  // Both structural state and exact serialized text must agree.
  expect(equal).toBe(true);
  expect(hashWorld(w)).toBe(hashWorld(copy));
  expect(ta === tb, `serialized text should be identical but key order differs:\n${orderA}\n${orderB}`).toBe(true);
});
