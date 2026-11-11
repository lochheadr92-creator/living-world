// Rules 203: a household's first roof does not wait for the settlement's site cap, and two life-stream parts are retired
// (src/sim/home_first.ts; optPlanBuild in options_work.ts, siteConflict in act_build.ts). Every situation here is STAGED: it checks a
// rule, it is not an example of spontaneous behaviour; the ordinary-world origin is an elder refused a hut three times in two lived days
// at rules 202, and docs/LIFE_STREAM.md for the two retired parts. Each check has the rules-202 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { siteConflict } from '../src/sim/act_build';
import { startActivity } from '../src/sim/activities';
import { generateOptions } from '../src/sim/decision';
import { HOME_FIRST_PARTS, firstHomePassesCap, householdFirstHomePassesCap, retiresYardAndSwap, setHomeFirst } from '../src/sim/home_first';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { hasSharedYard } from '../src/sim/shared_yard';
import { makeSource } from '../src/sim/sources';
import { hasSwapWorth } from '../src/sim/swap_and_fire';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, learn, pin, site, stage } from './helpers/kit';
import type { Person, World } from '../src/sim/types';

afterEach(() => setHomeFirst(true));

const CAP_TEXT = 'too much already being built here at once';
/**
 * Fay lives alone in a lean-to and knows three trees and a rock, in a settlement old enough for huts. Four other households each
 * have a hut laid out, which is the whole of the settlement's allowance of open sites.
 */
function scene(version: number, opts: { dynamics?: 'rich' | 'authored'; openSites?: number; home?: 'lean_to' | 'hut' | 'none'; tag?: string } = {}) {
  const s = stage(`home-first-${version}-${opts.dynamics ?? 'rich'}-${opts.openSites ?? 4}-${opts.home ?? 'lean_to'}-${opts.tag ?? ''}`);
  s.w.settings = { ...s.w.settings, dynamics: opts.dynamics ?? 'rich', rulesVersion: version };
  const fay = addPerson(s, 'Fay', 40.5, 26.5, { age: 74, hunger: 95, thirst: 95, energy: 95 });
  const others: Person[] = [];
  for (let i = 0; i < (opts.openSites ?? 4); i++) {
    const q = addPerson(s, `N${i}`, 60.5 + i * 2, 30.5, { age: 30, hunger: 95, thirst: 95, energy: 95 });
    others.push(q);
    site(s, 'hut', 58 + i * 6, 44, q.hhId, q.id);
  }
  const home = opts.home === 'none' ? null : building(s, opts.home ?? 'lean_to', 40, 24, fay.hhId);
  if (home) s.w.households.find((h) => h.id === fay.hhId)!.homeId = home.id;
  const trees = [0, 1, 2].map((i) => makeSource(s.w, 'tree', 48 + i, 30, 8));
  const rock = makeSource(s.w, 'rock', 50, 33, 6);
  const w = done(s);
  w.tick = 2000;
  for (const q of others) pin(q);
  if (home) learn(w, fay, home);
  learn(w, fay, ...trees, rock);
  return { w, fay, home };
}
const hutOption = (w: World, p: Person) => generateOptions(w, p, true, true).options.find((o) => o.key === 'plan_site:hut');
const hutBlock = (w: World, p: Person) => generateOptions(w, p, true, true).blocked.find((o) => o.kind === 'plan_site' && o.label === 'Lay out a hut')?.blocked ?? '';

describe('rules 203 is registered', () => {
  it('is registered and supported (the current version may be later), with two parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(203);
    expect(SUPPORTED_RULES_VERSIONS).toContain(203);
    expect(HOME_FIRST_PARTS).toEqual(['cap', 'retire']);
  });
});

describe('the rule: which layout passes the cap', () => {
  it('nothing at 202; at 203 a hut for a household without a solid home and a lean-to for the homeless, and nothing else', () => {
    const old = scene(202).w, now = scene(203).w;
    expect(firstHomePassesCap(old, 'hut', 'lean_to')).toBe(false);
    expect(firstHomePassesCap(now, 'hut', 'lean_to')).toBe(true);
    expect(firstHomePassesCap(now, 'hut', undefined)).toBe(true);
    expect(firstHomePassesCap(now, 'lean_to', undefined)).toBe(true);
    expect(firstHomePassesCap(now, 'lean_to', 'lean_to')).toBe(false);
    expect(firstHomePassesCap(now, 'hut', 'hut')).toBe(false);
    expect(firstHomePassesCap(now, 'hut', 'house')).toBe(false);
    for (const other of ['cellar', 'well', 'storehouse', 'timber_yard'] as const) expect(firstHomePassesCap(now, other, 'lean_to')).toBe(false);
    setHomeFirst(false, 'cap');
    expect(firstHomePassesCap(now, 'hut', 'lean_to')).toBe(false);
    setHomeFirst(true, 'cap');
    expect(firstHomePassesCap(scene(203, { dynamics: 'authored' }).w, 'hut', 'lean_to')).toBe(false);
  });
});

describe('a lean-to household when the settlement already has its four open sites', () => {
  it('at 202 the hut is withheld and the card says the settlement is building too much; at 203 it is offered', () => {
    const old = scene(202);
    expect(hutOption(old.w, old.fay)).toBeUndefined();
    expect(hutBlock(old.w, old.fay)).toBe(CAP_TEXT);
    const now = scene(203);
    expect(hutOption(now.w, now.fay)).toBeTruthy();
    expect(hutBlock(now.w, now.fay)).toBe('');
  });

  it('under the cap nothing changes: with three open sites the hut is offered at both versions', () => {
    for (const version of [202, 203]) {
      const f = scene(version, { openSites: 3 });
      expect(hutOption(f.w, f.fay), `offered at rules ${version}`).toBeTruthy();
    }
  });

  it('where it is marked out: the same layout is refused at 202 and accepted at 203, and a household that already has a hut is still refused', () => {
    const old = scene(202), now = scene(203);
    expect(siteConflict(old.w, 'hut', old.fay.hhId, 0, 0, { x: 44, y: 34 })).toBe('too many projects under way already');
    expect(siteConflict(now.w, 'hut', now.fay.hhId, 0, 0, { x: 44, y: 34 })).toBeNull();
    expect(householdFirstHomePassesCap(now.w, 'hut', now.fay.hhId)).toBe(true);
    const housed = scene(203, { home: 'hut' });
    expect(householdFirstHomePassesCap(housed.w, 'hut', housed.fay.hhId)).toBe(false);
    expect(siteConflict(housed.w, 'hut', housed.fay.hhId, 0, 0, { x: 44, y: 34 })).not.toBeNull();
  });

  it('through to the ground: at 203 the layout she is offered is marked out as her household’s hut site, a fifth open site', () => {
    const f = scene(203, { tag: 'ground' });
    const o = hutOption(f.w, f.fay);
    const a = o?.make?.();
    expect(a, 'the option makes a layout').toBeTruthy();
    a!.minCommit = f.w.tick + 4000; // staged: she sees the layout through
    startActivity(f.w, f.fay, a!);
    for (let i = 0; i < 900 && !f.w.sites.some((x) => x.hhId === f.fay.hhId); i++) stepWorld(f.w);
    const mine = f.w.sites.find((x) => x.hhId === f.fay.hhId);
    expect(mine?.type, `last result ${JSON.stringify(f.fay.lastResult)}`).toBe('hut');
    expect(f.w.sites.length).toBe(5);
  });

  it('with the switch off a rules-203 world holds the first home to the cap again', () => {
    setHomeFirst(false, 'cap');
    const f = scene(203);
    expect(hutOption(f.w, f.fay)).toBeUndefined();
    expect(hutBlock(f.w, f.fay)).toBe(CAP_TEXT);
    expect(siteConflict(f.w, 'hut', f.fay.hhId, 0, 0, { x: 44, y: 34 })).toBe('too many projects under way already');
  });
});

describe('the two retired parts', () => {
  it('the shared first yard applies at 201 and 202 and not at 203; the swap’s saved walk at 202 and not at 203; the switch keeps them', () => {
    const at = (version: number) => scene(version, { openSites: 0 }).w;
    expect(hasSharedYard(at(201))).toBe(true);
    expect(hasSharedYard(at(202))).toBe(true);
    expect(hasSwapWorth(at(202))).toBe(true);
    const now = at(203);
    expect(retiresYardAndSwap(now)).toBe(true);
    expect(hasSharedYard(now)).toBe(false);
    expect(hasSwapWorth(now)).toBe(false);
    setHomeFirst(false, 'retire');
    expect(hasSharedYard(now)).toBe(true);
    expect(hasSwapWorth(now)).toBe(true);
  });
});
