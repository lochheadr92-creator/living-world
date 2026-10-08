// Stage B2, the windmill (docs/BUILDINGS.md): flour ground by the wind, preferred to the quern where one is known, wanted by whoever
// found the bakery busy when they came with grain, and ordinary worlds unchanged.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { siteConflict } from '../src/sim/act_build';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { buildable } from '../src/sim/expansion';
import { startJob, workJob } from '../src/sim/facilities';
import { noteFailure, observe, recentFailure } from '../src/sim/knowledge';
import { makeCtx } from '../src/sim/optutil';
import { facilityWants } from '../src/sim/production';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import type { Building, Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { addPerson, building, done, stage } from './helpers/kit';
import { natural, run } from './helpers/util';

function work(w: World, b: Building, p: Person, max = 900): void {
  for (let i = 0; i < max; i++) {
    w.tick++;
    if (workJob(w, b, p) !== 'continue') return;
  }
}

/** a rich world some days in; one adult with a home full of grain, stood by their door, knowing a bakery */
function settled(seed: string, rich = true) {
  const w = natural(seed, rich ? { dynamics: 'rich' } : {});
  run(w, Math.round(DAY * 6.1));
  const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
  const h = w.byId.get(w.households.find((x) => x.id === p.hhId)!.homeId) as Building;
  p.x = h.x + h.w / 2;
  p.y = h.y + h.h + 0.5;
  p.px = p.x;
  p.py = p.y;
  for (const k of Object.keys(p.needs) as (keyof Person['needs'])[]) p.needs[k] = 100;
  p.health = 100;
  h.store.items = { grain: 30, berries: 12, fruit: 8 };
  observe(w, p, h);
  const bakery = createBuilding(w, 'bakery', Math.floor(h.x) + 5, Math.floor(h.y) + 3, 0);
  bakery.store.items = { grain: 8, wood: 2, water: 4 };
  observe(w, p, bakery);
  return { w, p, h, bakery };
}

describe('the windmill', () => {
  it('grinds six grain to five flour, the bran recorded as waste, nothing unaccounted', () => {
    const s = stage('mill-grind');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'mill', 49, 50, 0, { grain: 6 });
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.mill_flour_wind, p.id, 'test')).toBeNull();
    work(w, b, p);
    expect(b.store.items.flour).toBe(5);
    expect(b.ops?.wasted['bran and dust']).toBe(1);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('is saved and loaded mid-batch and carries on identically', () => {
    const s = stage('mill-save');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'mill', 49, 50, 0, { grain: 6 });
    const w = done(s);
    startJob(w, b, p, RECIPE_BY_ID.mill_flour_wind, p.id, 'test');
    for (let i = 0; i < 12; i++) {
      w.tick++;
      workJob(w, b, p);
    }
    const c = deserializeWorld(serializeWorld(w));
    expect(hashWorld(c)).toBe(hashWorld(w));
    work(w, b, p);
    work(c, c.byId.get(b.id) as Building, c.byId.get(p.id) as Person);
    expect(serializeWorld(c)).toBe(serializeWorld(w));
  });

  it('is preferred to the quern where one is known: the flour for bread is planned at the windmill, not the bakery', () => {
    const r = settled('mill-prefer');
    const mill = createBuilding(r.w, 'mill', Math.floor(r.h.x) + 9, Math.floor(r.h.y) + 1, 0);
    mill.store.items = { grain: 8 };
    observe(r.w, r.p, mill);
    const ctx = generateOptions(r.w, r.p, true);
    expect(ctx.options.some((o) => o.kind === 'operate' && o.label === 'Milling at the windmill' && o.targetId === mill.id)).toBe(true);
    expect(ctx.options.some((o) => o.kind === 'operate' && o.label === 'Milling flour')).toBe(false);
    // and with no mill known, the quern is what is planned
    const q = settled('mill-prefer-quern');
    expect(generateOptions(q.w, q.p, true).options.some((o) => o.kind === 'operate' && o.label === 'Milling flour')).toBe(true);
  });

  it('is wanted by whoever found the bakery busy when they came with grain, not otherwise, and not in an ordinary world', () => {
    const r = settled('mill-want');
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'mill')).toBe(false);
    noteFailure(r.w, r.p, r.bakery.id, 'busy: a batch is already under way');
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'mill')).toBe(true);
    const o = settled('mill-want-off', false);
    noteFailure(o.w, o.p, o.bakery.id, 'busy: a batch is already under way');
    expect(buildable(o.w, 'mill')).toBe(false);
    expect(facilityWants(makeCtx(o.w, o.p, false)).some((x) => x.type === 'mill')).toBe(false);
    expect(siteConflict(o.w, 'mill', 1, 0, 0, { x: 10, y: 10 })).toMatch(/not something this world builds/);
  });

  it('a bakery found busy is remembered as such in a rich world and not in an ordinary one', () => {
    for (const rich of [true, false]) {
      const r = settled(rich ? 'mill-busy' : 'mill-busy-off', rich);
      const other = r.w.persons.find((q) => q.alive && q.id !== r.p.id)!;
      // (somebody else is baking: a batch of another recipe, so this person is turned away rather than lending a hand)
      r.bakery.store.items.flour = 3;
      expect(startJob(r.w, r.bakery, other, RECIPE_BY_ID.bake_bread, other.id, 'test')).toBeNull();
      // (the loaves are in the oven: nothing to lend a hand at, the bakery is simply taken)
      r.bakery.ops!.job!.phase = 'burn';
      r.bakery.ops!.job!.burnLeft = 150;
      r.p.x = r.bakery.x + 1;
      r.p.y = r.bakery.y + 2.5;
      const act = newActivity(r.w, r.p, { kind: 'operate', label: 'Milling flour', goal: 't', targetId: r.bakery.id, targetType: 'building', tx: r.bakery.x, ty: r.bakery.y, spotX: r.p.x, spotY: r.p.y, here: true, maxTicks: 300, data: { recipe: 'mill_flour', client: r.p.id, purpose: 't' } });
      startActivity(r.w, r.p, act);
      run(r.w, 2);
      const f = recentFailure(r.w, r.p, r.bakery.id, 50);
      if (rich) expect(f?.reason ?? '').toMatch(/busy/);
      else expect(f).toBeFalsy();
    }
  });
});
