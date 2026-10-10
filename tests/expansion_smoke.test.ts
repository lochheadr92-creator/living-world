// Stage B3, the smokehouse (docs/BUILDINGS.md): smoked fish keeps, is the reserve that is eaten last, is wanted by a household with
// more fish than it will eat, and the smokehouse arises where that surplus meets a cellar or the hard season; ordinary worlds unchanged.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { conservationReport, pickFood } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { buildable } from '../src/sim/expansion';
import { facilityTick, startJob, workJob } from '../src/sim/facilities';
import { observe } from '../src/sim/knowledge';
import { foodCount, makeCtx } from '../src/sim/optutil';
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
function burn(w: World, b: Building, max = 4000): void {
  for (let i = 0; i < max && b.ops?.job; i++) {
    w.tick++;
    facilityTick(w, b);
  }
}

/** a rich world some days in; one adult with a home holding plenty of fish, stood by their door */
function settled(seed: string, rich = true) {
  const w = natural(seed, rich ? { dynamics: 'rich' } : {});
  run(w, Math.round(DAY * 6.1));
  const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
  const hh = w.households.find((x) => x.id === p.hhId)!;
  const h = w.byId.get(hh.homeId) as Building;
  p.x = h.x + h.w / 2;
  p.y = h.y + h.h + 0.5;
  p.px = p.x;
  p.py = p.y;
  for (const k of Object.keys(p.needs) as (keyof Person['needs'])[]) p.needs[k] = 100;
  p.health = 100;
  h.store.items = { fish: 12, berries: 10, fruit: 6 };
  observe(w, p, h);
  return { w, p, hh, h };
}

describe('smoked fish', () => {
  it('is made from four fish and a log over a long, slow fire, nothing unaccounted', () => {
    const s = stage('smoke-make');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'smokehouse', 49, 50, 0, { fish: 4, wood: 1 });
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.smoke_fish, p.id, 'test')).toBeNull();
    work(w, b, p);
    burn(w, b);
    expect(b.store.items.smoked).toBe(4);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('keeps: it goes off at a tenth of the pace of fresh fish in the same store', () => {
    const w = natural('smoke-keeps', { dynamics: 'rich' });
    const hh = w.households.find((h) => h.homeId && w.byId.get(h.homeId)?.ent === 'building')!;
    const h = w.byId.get(hh.homeId) as Building;
    h.store.items = { fish: 150, smoked: 150 };
    run(w, 1300);
    const lostFish = 150 - (h.store.items.fish ?? 0);
    const lostSmoked = 150 - (h.store.items.smoked ?? 0);
    expect(lostFish).toBeGreaterThan(40);
    expect(lostSmoked).toBeLessThan(lostFish * 0.2);
  });

  it('is the reserve: eaten only when nothing fresher is there, and counted as food', () => {
    expect(pickFood({ fish: 2, smoked: 3 }, 50)).toBe('fish');
    expect(pickFood({ berries: 1, smoked: 3 }, 50)).toBe('berries');
    expect(pickFood({ smoked: 3 }, 50)).toBe('smoked');
    expect(pickFood({}, 50)).toBeNull();
    expect(foodCount({ smoked: 3, fish: 1 })).toBe(4);
  });

  it('is saved and loaded mid-smoke and carries on identically', () => {
    const s = stage('smoke-save');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'smokehouse', 49, 50, 0, { fish: 4, wood: 1 });
    const w = done(s);
    startJob(w, b, p, RECIPE_BY_ID.smoke_fish, p.id, 'test');
    work(w, b, p);
    for (let i = 0; i < 120; i++) {
      w.tick++;
      facilityTick(w, b);
    }
    const c = deserializeWorld(serializeWorld(w));
    expect(hashWorld(c)).toBe(hashWorld(w));
    burn(w, b);
    burn(c, c.byId.get(b.id) as Building);
    expect(serializeWorld(c)).toBe(serializeWorld(w));
    expect((c.byId.get(b.id) as Building).store.items.smoked).toBe(4);
  });
});

describe('the smokehouse', () => {
  it('is wanted by a household with fish to spare once a cellar stands or the hard season is here, not otherwise, and not in an ordinary world', () => {
    const r = settled('smoke-want');
    delete r.w.hardship; // (a lean season may already be running in this seed: it is one of the triggers, so start without it)
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'smokehouse')).toBe(false);
    r.w.hardship = { kind: 'lean', since: r.w.tick, until: r.w.tick + DAY * 3 };
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'smokehouse')).toBe(true);
    delete r.w.hardship;
    const cellar = createBuilding(r.w, 'cellar', Math.floor(r.h.x) + 3, Math.floor(r.h.y) + 3, r.hh.id);
    observe(r.w, r.p, cellar);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'smokehouse')).toBe(true);
    r.h.store.items = { fish: 3, berries: 10 };
    observe(r.w, r.p, r.h);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'smokehouse')).toBe(false);
    const o = settled('smoke-want-off', false);
    o.w.hardship = { kind: 'lean', since: o.w.tick, until: o.w.tick + DAY * 3 };
    expect(buildable(o.w, 'smokehouse')).toBe(false);
    expect(facilityWants(makeCtx(o.w, o.p, false)).some((x) => x.type === 'smokehouse')).toBe(false);
  });

  it('is used: a household with fish to spare that knows a smokehouse plans to smoke it, in a rich world only', () => {
    for (const rich of [true, false]) {
      const r = settled(rich ? 'smoke-use' : 'smoke-use-off', rich);
      const sh = createBuilding(r.w, 'smokehouse', Math.floor(r.h.x) + 5, Math.floor(r.h.y) + 3, 0);
      sh.store.items = { wood: 2 };
      observe(r.w, r.p, sh);
      const ctx = generateOptions(r.w, r.p, true);
      const planned = ctx.options.some((o) => /smoke our spare fish/.test(o.goal));
      expect(planned).toBe(rich);
    }
  });
});
