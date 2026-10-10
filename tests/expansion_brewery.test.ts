// Stage B4, the brewery (docs/BUILDINGS.md): beer is brewed from grain and water, carried to the hall by a brewer, and poured at the
// hall's shared meals, where it brings people together; ordinary worlds unchanged.
import { describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { buildable } from '../src/sim/expansion';
import { facilityTick, startJob, workJob } from '../src/sim/facilities';
import { observe } from '../src/sim/knowledge';
import { finishMeal } from '../src/sim/meals';
import { makeCtx } from '../src/sim/optutil';
import { facilityWants } from '../src/sim/production';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { noteFoodLoss } from '../src/sim/storage';
import type { Building, Meal, Person, World } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';
import { natural, run } from './helpers/util';

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
  p.traits.sociability = 0.9;
  const hall = createBuilding(w, 'hall', Math.floor(h.x) + 6, Math.floor(h.y) + 3, 0);
  observe(w, p, hall);
  return { w, p, hh, h, hall };
}

function meal(w: World, hall: Building, ate: Person[]): Meal {
  const m: Meal = { id: w.nextId++, host: ate[0].id, placeId: hall.id, placeName: 'the communal hall', x: hall.x, y: hall.y + 2, created: w.tick, at: w.tick, invited: ate.slice(1).map((q) => q.id), accepted: ate.slice(1).map((q) => q.id), arrived: ate.map((q) => q.id), ate: ate.map((q) => q.id), missed: {}, table: {}, servings: 0, reserved: 0, status: 'eating', end: '' };
  w.meals.push(m);
  return m;
}

describe('beer', () => {
  it('is brewed from six grain and four water over a long working, the spent mash recorded, nothing unaccounted', () => {
    const s = stage('brew');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'brewery', 49, 50, 0, { grain: 6, water: 4, wood: 1 });
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.brew_beer, p.id, 'test')).toBeNull();
    for (let i = 0; i < 900 && b.ops?.job?.phase === 'work'; i++) {
      w.tick++;
      workJob(w, b, p);
    }
    for (let i = 0; i < 4000 && b.ops?.job; i++) {
      w.tick++;
      facilityTick(w, b);
    }
    expect(b.store.items.beer).toBe(4);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('poured at the hall\'s shared meal: a mug each while it lasts, a thought, and closer ties between those who drank', () => {
    const r = settled('brew-meal');
    const others = r.w.persons.filter((q) => q.alive && q.id !== r.p.id).slice(0, 2);
    const ate = [r.p, ...others];
    r.hall.store.items = { beer: 2 };
    const before = r.p.relations[others[0].id]?.affinity ?? 0;
    finishMeal(r.w, meal(r.w, r.hall, ate));
    expect(r.hall.store.items.beer ?? 0).toBe(0);
    expect(r.w.ledger.reasons['-drunk at a shared meal']).toBe(2);
    expect(r.p.mood?.thoughts.some((t) => t.kind === 'ale')).toBe(true);
    expect(others[1].mood?.thoughts.some((t) => t.kind === 'ale')).toBe(false); // (two mugs, three people: the third went without)
    expect((r.p.relations[others[0].id]?.affinity ?? 0) - before).toBeGreaterThan(1.5);
  });

  it('is not poured in an ordinary world, whatever is in the hall', () => {
    const o = settled('brew-meal-off', false);
    const others = o.w.persons.filter((q) => q.alive && q.id !== o.p.id).slice(0, 1);
    o.hall.store.items = { beer: 2 };
    finishMeal(o.w, meal(o.w, o.hall, [o.p, ...others]));
    expect(o.hall.store.items.beer).toBe(2);
  });
});

describe('the brewery and the brewer', () => {
  it('is wanted by a household with grain going off that knows a hall, not otherwise, and not in an ordinary world', () => {
    const r = settled('brew-want');
    r.h.store.items = { grain: 14, berries: 20, fruit: 10 };
    observe(r.w, r.p, r.h);
    r.hh.lost = undefined;
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'brewery')).toBe(false);
    noteFoodLoss(r.w, r.hh.id, 4);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'brewery')).toBe(true);
    const o = settled('brew-want-off', false);
    o.h.store.items = { grain: 14, berries: 20, fruit: 10 };
    observe(o.w, o.p, o.h);
    o.hh.lost = { units: 6, tick: o.w.tick };
    expect(buildable(o.w, 'brewery')).toBe(false);
    expect(facilityWants(makeCtx(o.w, o.p, false)).some((x) => x.type === 'brewery')).toBe(false);
  });

  it('a brewer carrying beer takes it to the hall', () => {
    const r = settled('brew-carry');
    const br = createBuilding(r.w, 'brewery', Math.floor(r.h.x) - 6, Math.floor(r.h.y) + 3, 0);
    observe(r.w, r.p, br);
    r.p.inv = { beer: 3 };
    const ctx = generateOptions(r.w, r.p, true);
    expect(ctx.options.some((o) => o.targetId === r.hall.id && /shared meals/.test(o.goal))).toBe(true);
  });
});
