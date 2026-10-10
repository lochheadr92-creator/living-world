// The cellar (docs/BUILDINGS.md, stage A): cool storage, the household's own tally of what goes off, demand, use, and ordinary worlds unchanged.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { siteConflict } from '../src/sim/act_build';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { buildable } from '../src/sim/expansion';
import { mayDeposit } from '../src/sim/facilities';
import { observe, putBelief, delBelief } from '../src/sim/knowledge';
import { beliefsByKind, makeCtx } from '../src/sim/optutil';
import { facilityWants } from '../src/sim/production';
import { CELLAR_SPOIL, LOSS_HALF_LIFE, LOSS_THRESHOLD, foodLossOf, noteFoodLoss } from '../src/sim/storage';
import type { Belief, Building, Household, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

const home = (w: World): { hh: Household; home: Building } => {
  const hh = w.households.find((h) => h.homeId && w.byId.get(h.homeId)?.ent === 'building')!;
  return { hh, home: w.byId.get(hh.homeId) as Building };
};

describe('the cellar', () => {
  it('keeps food: the same food goes off far more slowly in it than in a home store', () => {
    const w = natural('cellar-spoil', { dynamics: 'rich' });
    const { hh, home: h } = home(w);
    const cellar = createBuilding(w, 'cellar', Math.floor(h.x) + 3, Math.floor(h.y) + 3, hh.id);
    h.store.items = { berries: 200 };
    cellar.store.items = { berries: 200 };
    const before = (b: Building) => b.store.items.berries ?? 0;
    run(w, 1300); // eleven spoilage rounds
    const lostHome = 200 - before(h);
    const lostCellar = 200 - before(cellar);
    expect(lostHome).toBeGreaterThan(40);
    expect(lostCellar).toBeLessThan(lostHome * (CELLAR_SPOIL + 0.2));
  });

  it('takes food and flour only', () => {
    const w = natural('cellar-accept', { dynamics: 'rich' });
    const { hh, home: h } = home(w);
    const cellar = createBuilding(w, 'cellar', Math.floor(h.x) + 3, Math.floor(h.y) + 3, hh.id);
    expect(mayDeposit(cellar, 'berries')).toBe(true);
    expect(mayDeposit(cellar, 'bread')).toBe(true);
    expect(mayDeposit(cellar, 'flour')).toBe(true);
    expect(mayDeposit(cellar, 'wood')).toBe(false);
    expect(mayDeposit(cellar, 'seeds')).toBe(false);
  });

  it('is only ever one a household\'s own: a second cellar for the same household is refused, and a cellar is not built in an ordinary world', () => {
    const w = natural('cellar-one', { dynamics: 'rich' });
    const { hh, home: h } = home(w);
    createBuilding(w, 'cellar', Math.floor(h.x) + 3, Math.floor(h.y) + 3, hh.id);
    expect(siteConflict(w, 'cellar', hh.id, 0, 0, { x: h.x, y: h.y })).toMatch(/already has a cellar/);
    const o = natural('cellar-off');
    expect(buildable(o, 'cellar')).toBe(false);
    expect(siteConflict(o, 'cellar', 1, 0, 0, { x: 10, y: 10 })).toMatch(/not something this world builds/);
  });

  it('is saved and loaded with its food and carries on identically', () => {
    const w = natural('cellar-save', { dynamics: 'rich' });
    const { hh, home: h } = home(w);
    const cellar = createBuilding(w, 'cellar', Math.floor(h.x) + 3, Math.floor(h.y) + 3, hh.id);
    cellar.store.items = { berries: 20, bread: 4 };
    noteFoodLoss(w, hh.id, 5);
    run(w, 200);
    const b = deserializeWorld(serializeWorld(w));
    expect(hashWorld(b)).toBe(hashWorld(w));
    expect(b.households.find((x) => x.id === hh.id)?.lost).toEqual(w.households.find((x) => x.id === hh.id)?.lost);
    run(w, 300);
    run(b, 300);
    expect(serializeWorld(b)).toBe(serializeWorld(w));
  });
});

describe('what a household notices going off', () => {
  it('is a tally that grows with each loss in its own stores and fades by half every two days', () => {
    const w = natural('loss-tally', { dynamics: 'rich' });
    const { hh } = home(w);
    expect(foodLossOf(w, hh)).toBe(0);
    noteFoodLoss(w, hh.id, 6);
    expect(foodLossOf(w, hh)).toBeCloseTo(6, 5);
    w.tick += LOSS_HALF_LIFE;
    expect(foodLossOf(w, hh)).toBeCloseTo(3, 5);
    noteFoodLoss(w, hh.id, 2);
    expect(foodLossOf(w, hh)).toBeCloseTo(5, 5);
  });

  it('really follows spoilage in the household\'s own home store, and an ordinary world keeps no such tally', () => {
    const rich = natural('loss-real', { dynamics: 'rich' });
    const a = home(rich);
    a.home.store.items = { berries: 200 };
    run(rich, 300);
    expect(a.hh.lost?.units ?? 0).toBeGreaterThan(5);
    const plain = natural('loss-real');
    const b = home(plain);
    b.home.store.items = { berries: 200 };
    run(plain, 300);
    expect(b.hh.lost).toBeUndefined();
  });
});

describe('the demand for a cellar and its use', () => {
  function ready(rich: boolean) {
    const w = natural('cellar-demand', rich ? { dynamics: 'rich' } : {});
    run(w, Math.round(DAY * 3.1));
    const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
    const hh = w.households.find((h) => h.id === p.hhId)!;
    const at = w.tick;
    const mk = (id: number, kind: Belief['kind'], x: number, y: number): Belief => ({ id, kind, x, y, amount: 5, max: 5, seen: at, src: 'seen', from: 0, learned: at });
    const h = w.byId.get(hh.homeId) as Building;
    for (let i = 0; i < 4; i++) putBelief(p, mk(900_000 + i, 'tree', h.x - 3, h.y + i));
    putBelief(p, mk(900_010, 'rock', h.x - 4, h.y));
    // there is food in the home store worth protecting, and they have looked at it
    h.store.items = { berries: 12 };
    observe(w, p, h);
    return { w, p, hh, h };
  }

  it('arises in a household that has lately found food gone off, not in one that has not, and not in an ordinary world', () => {
    const r = ready(true);
    r.hh.lost = undefined; // (three days of rich spoilage have already left a tally: start from a household that has noticed nothing)
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'cellar')).toBe(false);
    noteFoodLoss(r.w, r.hh.id, LOSS_THRESHOLD + 1);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'cellar')).toBe(true);
    r.h.store.items = {};
    observe(r.w, r.p, r.h);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'cellar')).toBe(false); // nothing in the store to protect
    const o = ready(false);
    o.hh.lost = { units: 9, tick: o.w.tick };
    expect(facilityWants(makeCtx(o.w, o.p, false)).some((x) => x.type === 'cellar')).toBe(false);
  });

  it('goes away once they know of their own cellar, and is not met by a cellar they know nothing about', () => {
    const r = ready(true);
    noteFoodLoss(r.w, r.hh.id, 6);
    const real = createBuilding(r.w, 'cellar', Math.floor(r.h.x) + 3, Math.floor(r.h.y) + 3, r.hh.id);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'cellar')).toBe(true); // unseen: planning cannot know
    observe(r.w, r.p, real);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'cellar')).toBe(false);
  });

  it('is used: a person with surplus food who knows their cellar considers taking it there, and may eat from it', () => {
    const r = ready(true);
    const real = createBuilding(r.w, 'cellar', Math.floor(r.h.x) + 3, Math.floor(r.h.y) + 3, r.hh.id);
    real.store.items = { fruit: 6 }; // (foodCount does not count bread: a known limitation, docs/SCALING.md)
    r.p.x = real.x + 0.5;
    r.p.y = real.y + 1.5;
    observe(r.w, r.p, real);
    r.p.inv = { berries: 9 };
    r.p.needs.hunger = 80;
    const ctx = generateOptions(r.w, r.p, true);
    expect(ctx.options.some((o) => o.label === 'Put food in the cellar')).toBe(true);
    r.p.inv = {};
    r.p.needs.hunger = 25;
    const hungry = generateOptions(r.w, r.p, true);
    expect(hungry.options.some((o) => o.kind === 'eat_store' && o.targetId === real.id)).toBe(true);
    void beliefsByKind;
    void delBelief;
  });
});
