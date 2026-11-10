// Rules 192: the settlement's first storehouse is wanted from what the person knows (src/sim/shared_stone.ts, firstStorehouseWanted in
// options_work.ts; gap G32). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour; the
// ordinary-world origin is docs/END_TO_END_TRACE.md, links 2, 9, 18, 21 and 24. Each check has the rules-191 contrast so the older,
// world-reading gate is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { startActivity, stepActivity } from '../src/sim/activities';
import { cancelSite } from '../src/sim/buildings';
import { generateOptions } from '../src/sim/decision';
import { refreshBeliefs } from '../src/sim/perception';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { setKnownFirstStorehouse, setSharedStone } from '../src/sim/shared_stone';
import { makeSource } from '../src/sim/sources';
import { addPerson, building, done, learn, site, stage } from './helpers/kit';
import type { Person, World } from '../src/sim/types';

afterEach(() => { setKnownFirstStorehouse(true); setSharedStone(true); });

/** Ada knows three trees and a rock. Ben's hut stands in the settlement; Ada has not seen it unless the scene says so. */
function scene(version: number, opts: { seeHut?: boolean; storeSite?: 'seen' | 'unseen' } = {}) {
  const s = stage(`known-first-storehouse-${version}-${opts.seeHut ?? false}-${opts.storeSite ?? 'none'}`);
  s.w.settings = { ...s.w.settings, dynamics: 'rich', rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40.5, 26.5, { hunger: 95, thirst: 95, energy: 95 });
  const ben = addPerson(s, 'Ben', 44.5, 26.5, { hunger: 95, thirst: 95, energy: 95 });
  const hut = building(s, 'hut', 20, 48, ben.hhId); // out of her sight, inside the settlement
  const trees = [0, 1, 2].map((i) => makeSource(s.w, 'tree', 48 + i, 30, 8));
  const rock = makeSource(s.w, 'rock', 50, 33, 6);
  const store = opts.storeSite ? site(s, 'storehouse', 62, 50, 0, ben.id) : null; // out of her sight too
  done(s);
  learn(s.w, ada, ...trees, rock);
  if (opts.seeHut) learn(s.w, ada, hut);
  if (store && opts.storeSite === 'seen') learn(s.w, ada, store);
  ben.cooldowns.pause = 1e9;
  return { s, w: s.w, ada, ben, hut, store };
}
const storehouseOption = (w: World, p: Person) => generateOptions(w, p, true, true).options.find((o) => o.key === 'plan_site:storehouse');

describe('rules 192 is registered', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(192);
    expect(SUPPORTED_RULES_VERSIONS).toContain(192);
  });
});

describe('the first storehouse is wanted from what the person knows', () => {
  it('a hut she has never seen: at 191 the world register offers her the first storehouse; at 192 it does not, until she sees the hut', () => {
    for (const version of [191, 192]) {
      const f = scene(version);
      expect(!!storehouseOption(f.w, f.ada), `offered unseen at rules ${version}`).toBe(version < 192);
      learn(f.w, f.ada, f.hut);
      expect(!!storehouseOption(f.w, f.ada), `offered once seen at rules ${version}`).toBe(true);
    }
  });

  it('at 192 the reason says why now: the hut she knows of, and that she knows of no store; at 191 it is the purpose alone', () => {
    const old = scene(191, { seeHut: true });
    expect(storehouseOption(old.w, old.ada)!.goal).toBe('the first shared storehouse, a place to keep stone, wood and tools for everyone');
    const f = scene(192, { seeHut: true });
    expect(storehouseOption(f.w, f.ada)!.goal).toBe('the first shared storehouse, a place to keep stone, wood and tools for everyone, now that a hut stands here and I know of no store');
  });

  it('a storehouse site she still believes in, though it is gone: at 192 it holds her back until she sees the spot again; at 191 the world reopens the want at once', () => {
    for (const version of [191, 192]) {
      const f = scene(version, { seeHut: true, storeSite: 'seen' });
      expect(storehouseOption(f.w, f.ada), `a known site stops her at rules ${version}`).toBeUndefined();
      cancelSite(f.w, f.store!, 'staged abandonment');
      expect(!!storehouseOption(f.w, f.ada), `reopened at rules ${version} before she has looked`).toBe(version < 192);
      // she walks to where the site was and sees that it is gone
      f.ada.x = 63.5; f.ada.y = 53.5; refreshBeliefs(f.w, f.ada);
      expect(f.ada.beliefs[f.store!.id]).toBeUndefined();
      expect(!!storehouseOption(f.w, f.ada), `offered once she has seen the spot at rules ${version}`).toBe(true);
    }
  });

  it('a storehouse site she has not seen: at 192 she may try, and the world refuses at the spot; at 191 the register stops her beforehand', () => {
    const old = scene(191, { seeHut: true, storeSite: 'unseen' });
    expect(storehouseOption(old.w, old.ada)).toBeUndefined();
    const f = scene(192, { seeHut: true, storeSite: 'unseen' });
    const o = storehouseOption(f.w, f.ada);
    expect(o).toBeTruthy();
    const a = o!.make!()!;
    startActivity(f.w, f.ada, a);
    for (let i = 0; i < 2400 && f.ada.activity; i++) { f.w.tick++; stepActivity(f.w, f.ada); }
    expect(f.w.sites.filter((s) => s.type === 'storehouse')).toHaveLength(1);
    expect(f.ada.log.some((l) => /storehouse is already being built|too many projects/.test(l.text))).toBe(true);
  });

  it('with the switch off a rules-192 world reads the register as before', () => {
    setKnownFirstStorehouse(false);
    const f = scene(192);
    expect(storehouseOption(f.w, f.ada)).toBeTruthy();
  });
});
