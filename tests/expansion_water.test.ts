// The well (docs/BUILDINGS.md, stage A): supply, drawing, accounting, demand, and that ordinary worlds never see it.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { siteConflict } from '../src/sim/act_build';
import { DAY } from '../src/sim/constants';
import { conservationReport, snapshotInitial } from '../src/sim/economy';
import { createBuilding } from '../src/sim/buildings';
import { delBelief, putBelief, WATER_ID_BASE } from '../src/sim/knowledge';
import { beliefsByKind, makeCtx } from '../src/sim/optutil';
import { facilityWants } from '../src/sim/production';
import { buildable } from '../src/sim/expansion';
import { WELL_CAP, WELL_REFILL } from '../src/sim/water';
import type { Belief, Building, Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

/** a rich world with only two people left, standing beside a well, so that nothing else interferes */
function stage(seed: string, water: number): { w: World; well: Building; a: Person; b: Person } {
  const w = natural(seed, { dynamics: 'rich' });
  const [a, b] = w.persons.filter((p) => p.alive);
  for (const q of [...w.persons]) {
    if (q === a || q === b) continue;
    w.persons.splice(w.persons.indexOf(q), 1);
    w.byId.delete(q.id);
  }
  const well = createBuilding(w, 'well', Math.floor(a.x) + 2, Math.floor(a.y) + 2, 0);
  well.store.items.water = water;
  a.x = well.x - 0.5;
  a.y = well.y + 0.5;
  b.x = well.x + 1.5;
  b.y = well.y + 0.5;
  for (const p of [a, b]) {
    p.px = p.x;
    p.py = p.y;
  }
  snapshotInitial(w);
  return { w, well, a, b };
}

const thirstyAt = (w: World, p: Person, well: Building, kind: 'drink' | 'fetch_water') => {
  const act = newActivity(w, p, { kind, label: kind, goal: 'test', targetId: well.id, targetType: 'building', tx: well.x, ty: well.y, spotX: p.x, spotY: p.y, need: kind === 'drink' ? 'thirst' : null, amount: 3, maxTicks: 600 });
  startActivity(w, p, act);
};

describe('the well', () => {
  it('seeps slowly, up to a limit, and every unit is recorded when it appears', () => {
    const { w, well } = stage('well-fill', 0);
    run(w, WELL_REFILL * 4 + 5);
    const got = well.store.items.water ?? 0;
    expect(got).toBeGreaterThanOrEqual(3);
    expect(got).toBeLessThanOrEqual(4);
    expect(w.ledger.created.water ?? 0).toBe(got);
    expect(w.ledger.reasons['+seepage into a well']).toBe(got);
    run(w, WELL_REFILL * 40);
    expect(well.store.items.water ?? 0).toBe(WELL_CAP);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('is drunk from: thirst eases and exactly the water that leaves the well is recorded as drunk', () => {
    const { w, well, a, b } = stage('well-drink', 6);
    b.needs.thirst = 100;
    a.needs.thirst = 20;
    thirstyAt(w, a, well, 'drink');
    run(w, 40); // less than a refill, so the stock only goes down
    // what is in the well now is what was there, plus what seeped in, minus what was drunk
    const seeped = w.ledger.created.water ?? 0;
    const drawn = 6 + seeped - (well.store.items.water ?? 0);
    expect(drawn).toBeGreaterThanOrEqual(1);
    expect(a.needs.thirst).toBeGreaterThan(20 + 36 * drawn * 0.5);
    expect(w.ledger.reasons['-drunk at a well']).toBe(drawn);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('cannot be overdrawn: with one unit in it, two thirsty people cannot between them take more than one', () => {
    const { w, well, a, b } = stage('well-contest', 1);
    a.needs.thirst = 15;
    b.needs.thirst = 15;
    thirstyAt(w, a, well, 'drink');
    thirstyAt(w, b, well, 'drink');
    run(w, 30); // before the next seep
    expect(well.store.items.water ?? 0).toBeGreaterThanOrEqual(0);
    expect(w.ledger.reasons['-drunk at a well'] ?? 0).toBeLessThanOrEqual(1);
    expect(conservationReport(w).ok).toBe(true);
    expect([a, b].filter((p) => p.needs.thirst > 40).length).toBeLessThanOrEqual(1);
  });

  it('fills a pack: water moves from the well to the person, with nothing created or lost', () => {
    const { w, well, a, b } = stage('well-fetch', 5);
    // nobody else drinks, and nobody drinks from the pack, so that what the pack gains is exactly what the well loses
    for (const q of [a, b]) q.needs = { hunger: 100, thirst: 100, energy: 100, warmth: 100, safety: 100, social: 100 };
    a.inv.water = 0;
    thirstyAt(w, a, well, 'fetch_water');
    run(w, 120);
    const took = a.inv.water ?? 0;
    expect(took).toBeGreaterThanOrEqual(1);
    // the well lost exactly what the pack gained, apart from what seeped in meanwhile (which the ledger shows)
    expect(5 + (w.ledger.created.water ?? 0) - (well.store.items.water ?? 0)).toBe(took);
    expect(w.ledger.reasons['-drunk at a well'] ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('refuses anything but its own water, and a dry well is reported rather than drunk from', () => {
    const { w, well, a } = stage('well-dry', 0);
    a.needs.thirst = 30;
    thirstyAt(w, a, well, 'drink');
    run(w, 5);
    expect(w.ledger.reasons['-drunk at a well'] ?? 0).toBe(0);
    expect(a.failures[well.id]?.reason).toMatch(/dry/);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('is saved and loaded with its stock and carries on identically', () => {
    const { w, well } = stage('well-save', 4);
    run(w, 120);
    const b = deserializeWorld(serializeWorld(w));
    expect(hashWorld(b)).toBe(hashWorld(w));
    expect(b.byId.get(well.id)).toBeDefined();
    run(w, 200);
    run(b, 200);
    expect(hashWorld(b)).toBe(hashWorld(w));
    expect(serializeWorld(b)).toBe(serializeWorld(w));
  });
});

describe('the well in ordinary worlds', () => {
  it('is never buildable, planned or built in a world without rich dynamics', () => {
    const w = natural('well-authored');
    expect(buildable(w, 'well')).toBe(false);
    expect(siteConflict(w, 'well', 0, 0, 0, { x: 10, y: 10 })).toMatch(/not something this world builds/);
    run(w, DAY * 3);
    expect(w.buildings.some((b) => b.type === 'well') || w.sites.some((s) => s.type === 'well')).toBe(false);
  });
});

describe('the demand for a well', () => {
  /** a rich (or ordinary) world at day 3.2 whose first adult with a home believes the only water is `far` tiles away */
  function homeLooking(rich: boolean, far: number) {
    const w = natural('well-demand', rich ? { dynamics: 'rich' } : {});
    run(w, Math.round(DAY * 3.1));
    const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
    const hh = w.households.find((h) => h.id === p.hhId)!;
    const home = w.byId.get(hh.homeId) as Building;
    for (const b of beliefsByKind(p, ['water'])) delBelief(p, b.id);
    for (const b of beliefsByKind(p, ['building', 'site'])) if (b.btype === 'well') delBelief(p, b.id);
    const at = w.tick;
    const mk = (id: number, kind: Belief['kind'], x: number, y: number): Belief => ({ id, kind, x, y, amount: 5, max: 5, seen: at, src: 'seen', from: 0, learned: at });
    putBelief(p, mk(WATER_ID_BASE + 777, 'water', home.x + far, home.y));
    // they know the trees and rocks that stage-A buildings need
    for (let i = 0; i < 4; i++) putBelief(p, mk(900_000 + i, 'tree', home.x - 3, home.y + i));
    putBelief(p, mk(900_010, 'rock', home.x - 4, home.y));
    return { w, p, home };
  }

  it('arises when the nearest water a household knows is a long way off, and not when it is near', () => {
    const far = homeLooking(true, 20);
    expect(facilityWants(makeCtx(far.w, far.p, false)).some((x) => x.type === 'well')).toBe(true);
    const near = homeLooking(true, 4);
    expect(facilityWants(makeCtx(near.w, near.p, false)).some((x) => x.type === 'well')).toBe(false);
  });

  it('does not arise in an ordinary world however far the water is', () => {
    const far = homeLooking(false, 20);
    expect(facilityWants(makeCtx(far.w, far.p, false)).some((x) => x.type === 'well')).toBe(false);
  });

  it('goes away when they know of a well close to home, but not because of one they know nothing about', () => {
    const { w, p, home } = homeLooking(true, 20);
    // a real well exists, a few tiles from home, that this person has never seen: planning must not know of it
    createBuilding(w, 'well', Math.floor(home.x) + 3, Math.floor(home.y) + 3, 0);
    expect(facilityWants(makeCtx(w, p, false)).some((x) => x.type === 'well')).toBe(true);
    // once they have seen it, they no longer want one
    const real = w.buildings.find((b) => b.type === 'well')!;
    const at = w.tick;
    putBelief(p, { id: real.id, kind: 'building', x: real.x + 0.5, y: real.y + 0.5, amount: 0, max: 0, seen: at, src: 'seen', from: 0, learned: at, btype: 'well', hh: 0, cond: 100, items: { water: 6 } });
    expect(facilityWants(makeCtx(w, p, false)).some((x) => x.type === 'well')).toBe(false);
  });
});
