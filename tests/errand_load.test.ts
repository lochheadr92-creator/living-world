// Rules 247: a load on an errand is not put down on the way (src/sim/errand_load.ts; read in communal_stock.ts, leave_heaviest.ts,
// pack_materials.ts and seed_storage.ts). Person.errand was never set, so the five guards that read it were always false; from 247 a
// person on a haul to a building site, or on a deposit made for a promise, is on an errand and the kinds in that activity's items are
// its load. STAGED: a flat world and one person with wood, stone and seeds in the pack.
// Every test that names a rules-246 contrast fails if the rule is taken out (or the world is 246); "kept" ones guard what 247 must NOT
// change and pass at both versions by design.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { communalSpare } from '../src/sim/communal_stock';
import { errandCarries, errandLoadOn, hasErrandLoad, onErrand, setErrandLoad } from '../src/sim/errand_load';
import { heaviestLeftover } from '../src/sim/leave_heaviest';
import { makeCtx } from '../src/sim/optutil';
import { spareMaterial } from '../src/sim/pack_materials';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { spareSeed } from '../src/sim/seed_storage';
import type { Activity, World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => setErrandLoad(true));

function world(rulesVersion: number) {
  const s = stage('errand');
  const w = s.w;
  w.settings = { ...w.settings, dynamics: 'rich', rulesVersion };
  const p = addPerson(s, 'Ada', 40.5, 40.5, { inv: { wood: 5, stone: 3, seeds: 9 } });
  done(s);
  return { w, p };
}
const on = (p: { activity: Activity | null }, a: Partial<Activity>): void => { p.activity = { kind: 'haul', data: {}, ...a } as unknown as Activity; };

describe('rules 247: the errand is read from what the person is doing', () => {
  it('a haul to a site carries what its items name, and that load is not spare', () => {
    const { w, p } = world(247);
    on(p, { kind: 'haul', data: { items: { wood: 5 } } });
    expect(hasErrandLoad(w)).toBe(true);
    expect(onErrand(w, p)).toBe(true);
    expect(errandCarries(w, p, 'wood')).toBe(true);
    expect(errandCarries(w, p, 'stone')).toBe(false);
    const ctx = makeCtx(w, p, true, true);
    expect(spareMaterial(ctx, 'wood')).toBe(0);
    expect(spareMaterial(ctx, 'stone')).toBe(3);
    expect(communalSpare(w, p, 'wood')).toBe(0);
    expect(communalSpare(w, p, 'stone')).toBeGreaterThan(0);
    expect(heaviestLeftover(p, new Set(), w)).toBe('stone');
  });
  it('the same pack at rules 246 counts the load as spare, as before (the contrast)', () => {
    const { w, p } = world(246);
    on(p, { kind: 'haul', data: { items: { wood: 5 } } });
    expect(hasErrandLoad(w)).toBe(false);
    expect(onErrand(w, p)).toBe(false);
    expect(errandCarries(w, p, 'wood')).toBe(false);
    const ctx = makeCtx(w, p, true, true);
    expect(spareMaterial(ctx, 'wood')).toBeGreaterThan(0);
    expect(communalSpare(w, p, 'wood')).toBeGreaterThan(0);
    expect(heaviestLeftover(p, new Set(), w)).toBe('wood');
  });
  it('a deposit made for a promise is an errand, a deposit of their own is not', () => {
    const { w, p } = world(247);
    on(p, { kind: 'deposit', data: { items: { stone: 3 }, mode: 'promise', commitmentId: 1 } });
    expect(errandCarries(w, p, 'stone')).toBe(true);
    expect(onErrand(w, p)).toBe(true);
    on(p, { kind: 'deposit', data: { items: { stone: 3 } } });
    expect(errandCarries(w, p, 'stone')).toBe(false);
    expect(onErrand(w, p)).toBe(false);
  });
  it('kept: no activity, gathering, or a kind that is not in the load is no errand', () => {
    const { w, p } = world(247);
    p.activity = null;
    expect(onErrand(w, p)).toBe(false);
    expect(errandCarries(w, p, 'wood')).toBe(false);
    on(p, { kind: 'gather', data: { items: { wood: 5 } } });
    expect(onErrand(w, p)).toBe(false);
    on(p, { kind: 'haul', data: { items: { wood: 5 } } });
    expect(errandCarries(w, p, 'stone')).toBe(false);
    p.inv.wood = 0;
    expect(errandCarries(w, p, 'wood')).toBe(false); // nothing left in the pack: nothing to protect
  });
  it('seeds on an errand are not spare either', () => {
    const { w, p } = world(247);
    on(p, { kind: 'haul', data: { items: { seeds: 4 } } });
    expect(spareSeed(p, w)).toBe(0);
    on(p, { kind: 'gather', data: {} });
    expect(spareSeed(p, w)).toBeGreaterThan(0);
    const old = world(246);
    on(old.p, { kind: 'haul', data: { items: { seeds: 4 } } });
    expect(spareSeed(old.p, old.w)).toBeGreaterThan(0);
  });
  it('kept: the stored field stays what it was and nothing is saved', () => {
    const { w, p } = world(247);
    on(p, { kind: 'haul', data: { items: { wood: 5 } } });
    expect(p.errand).toBeNull();
    // an old caller that has no world still reads the field
    expect(heaviestLeftover(p, new Set())).toBe('wood');
    expect(spareSeed(p)).toBeGreaterThan(0);
    expect(w.settings.rulesVersion).toBe(247);
  });
  it('the lab arm rich-no-errand-load reads the old field again and restores the switch', () => {
    const { w, p } = world(247);
    on(p, { kind: 'haul', data: { items: { wood: 5 } } });
    const arm = parseIntervention('rich-no-errand-load');
    const restore = arm.install!();
    expect(errandLoadOn()).toBe(false);
    expect(errandCarries(w, p, 'wood')).toBe(false);
    restore();
    expect(errandLoadOn()).toBe(true);
    expect(errandCarries(w, p, 'wood')).toBe(true);
  });
  it('247 is supported, 246 is left unused for the oven, and the current version is at least 247', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(247);
    expect(SUPPORTED_RULES_VERSIONS).not.toContain(246);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(247);
    const w: World = world(247).w;
    expect(w.settings.rulesVersion).toBe(247);
  });
});
