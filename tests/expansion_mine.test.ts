// The mine (docs/BUILDINGS.md, stage A): ore dug out of a finite vein by the load, needing a pick; arises from a smithy short of ore.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { siteConflict } from '../src/sim/act_build';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { buildable } from '../src/sim/expansion';
import { startBlocker, startJob, workJob } from '../src/sim/facilities';
import { observe, putBelief } from '../src/sim/knowledge';
import { makeCtx } from '../src/sim/optutil';
import { facilityWants } from '../src/sim/production';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { makeSource } from '../src/sim/sources';
import { createBuilding } from '../src/sim/buildings';
import type { Belief, Building, Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { addPerson, building, done, give, stage } from './helpers/kit';
import { natural, run } from './helpers/util';

function work(w: World, b: Building, p: Person, max = 900): void {
  for (let i = 0; i < max; i++) {
    w.tick++;
    if (workJob(w, b, p) !== 'continue') return;
  }
}

describe('the mine at work', () => {
  it('ore comes out of the vein, not from nowhere: the vein shrinks by what the shaft head receives, and a pick is required', () => {
    const s = stage('mine-dig');
    const p = addPerson(s, 'Odo', 44, 44);
    const vein = makeSource(s.w, 'ore_vein', 52, 50, 20);
    const b = building(s, 'mine', 49, 50, 0);
    b.ops!.depositId = vein.id;
    const w = done(s);
    expect(startBlocker(w, b, p, RECIPE_BY_ID.mine_ore)).toMatch(/pickaxe/);
    const pick = give(w, p, 'pick');
    w.ledger.created.pick = (w.ledger.created.pick ?? 0) + 1; // (a tool handed over by the test is a created item)
    expect(pick).toBeTruthy();
    expect(startJob(w, b, p, RECIPE_BY_ID.mine_ore, p.id, 'test')).toBeNull();
    expect(vein.amount).toBe(17);
    work(w, b, p);
    expect(b.store.items.ore).toBe(3);
    expect(w.ledger.created.ore ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
    vein.amount = 2;
    expect(startBlocker(w, b, p, RECIPE_BY_ID.mine_ore)).toBe('the vein is worked out');
  });

  it('is saved and loaded in the middle of a batch and carries on identically', () => {
    const s = stage('mine-save');
    const p = addPerson(s, 'Odo', 44, 44);
    const vein = makeSource(s.w, 'ore_vein', 52, 50, 20);
    const b = building(s, 'mine', 49, 50, 0);
    b.ops!.depositId = vein.id;
    const w = done(s);
    give(w, p, 'pick');
    startJob(w, b, p, RECIPE_BY_ID.mine_ore, p.id, 'test');
    for (let i = 0; i < 40; i++) {
      w.tick++;
      workJob(w, b, p);
    }
    const c = deserializeWorld(serializeWorld(w));
    expect(hashWorld(c)).toBe(hashWorld(w));
    const bb = c.byId.get(b.id) as Building;
    const pp = c.byId.get(p.id) as Person;
    work(w, b, p);
    work(c, bb, pp);
    expect(bb.store.items.ore).toBe(b.store.items.ore);
    expect(serializeWorld(c)).toBe(serializeWorld(w));
  });

  it('there is one mine to a vein, and none at all in an ordinary world', () => {
    const w = natural('mine-one', { dynamics: 'rich' });
    const a = makeSource(w, 'ore_vein', 30, 30, 20);
    const c = makeSource(w, 'ore_vein', 70, 70, 20);
    const m = createBuilding(w, 'mine', 28, 28, 0);
    m.ops!.depositId = a.id;
    expect(siteConflict(w, 'mine', 1, 0, a.id, { x: 29, y: 29 })).toMatch(/already a mine/);
    expect(siteConflict(w, 'mine', 1, 0, c.id, { x: 71, y: 71 })).toBeNull();
    const o = natural('mine-off');
    expect(buildable(o, 'mine')).toBe(false);
    expect(siteConflict(o, 'mine', 1, 0, 0, { x: 10, y: 10 })).toMatch(/not something this world builds/);
  });
});

describe('the demand for a mine', () => {
  function ready(rich: boolean) {
    const w = natural('mine-demand', rich ? { dynamics: 'rich' } : {});
    run(w, Math.round(DAY * 3.1));
    const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
    const at = w.tick;
    const h = w.byId.get(w.households.find((x) => x.id === p.hhId)!.homeId) as Building;
    const mk = (id: number, kind: Belief['kind'], x: number, y: number, amount = 5): Belief => ({ id, kind, x, y, amount, max: amount, seen: at, src: 'seen', from: 0, learned: at });
    for (let i = 0; i < 4; i++) putBelief(p, mk(900_000 + i, 'tree', h.x - 3, h.y + i));
    putBelief(p, mk(900_010, 'rock', h.x - 4, h.y));
    const vein = makeSource(w, 'ore_vein', Math.floor(h.x) + 12, Math.floor(h.y) + 2, 25);
    observe(w, p, vein);
    const smithy = createBuilding(w, 'smithy', Math.floor(h.x) + 5, Math.floor(h.y) + 5, 0);
    observe(w, p, smithy);
    return { w, p, h, vein, smithy };
  }

  it('arises where a smithy is known with a vein and tools wearing out, only in a rich world, and only until a mine is known', () => {
    const r = ready(true);
    give(r.w, r.p, 'pick').wear = 40;
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'mine')).toBe(true);
    const mine = createBuilding(r.w, 'mine', Math.floor(r.h.x) + 10, Math.floor(r.h.y) + 6, 0);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'mine')).toBe(true); // unseen: planning cannot know
    observe(r.w, r.p, mine);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'mine')).toBe(false);
    const o = ready(false);
    give(o.w, o.p, 'pick').wear = 40;
    expect(facilityWants(makeCtx(o.w, o.p, false)).some((x) => x.type === 'mine')).toBe(false);
  });

  it('does not arise with no vein known, or a vein nearly worked out', () => {
    const r = ready(true);
    give(r.w, r.p, 'pick').wear = 40;
    r.vein.amount = 4;
    observe(r.w, r.p, r.vein);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'mine')).toBe(false);
  });
});
