// Stage B5, the bed (docs/BUILDINGS.md): made at the timber yard, wanted by a household that woke cold or keeps a child or an elder,
// carried home, and warmer to sleep in; ordinary worlds unchanged.
import { describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { startJob, workJob } from '../src/sim/facilities';
import { observe } from '../src/sim/knowledge';
import { BED_WARMTH, inOwnBed, shelterAt } from '../src/sim/needs';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { makeCtx } from '../src/sim/optutil';
import { stageOf } from '../src/sim/people';
import { demandsOf } from '../src/sim/production';
import type { Building, Person } from '../src/sim/types';
import { addPerson, building, done, give, stage } from './helpers/kit';
import { natural, run } from './helpers/util';

function settled(seed: string, rich = true) {
  const w = natural(seed, rich ? { dynamics: 'rich' } : {});
  run(w, Math.round(DAY * 6.1));
  const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
  const hh = w.households.find((x) => x.id === p.hhId)!;
  const h = w.byId.get(hh.homeId) as Building;
  h.type = 'hut'; // (a solid home)
  p.x = h.x + h.w / 2;
  p.y = h.y + h.h + 0.5;
  p.px = p.x;
  p.py = p.y;
  for (const k of Object.keys(p.needs) as (keyof Person['needs'])[]) p.needs[k] = 100;
  p.health = 100;
  observe(w, p, h);
  const yard = createBuilding(w, 'timber_yard', Math.floor(h.x) + 6, Math.floor(h.y) + 3, 0);
  yard.store.items = { planks: 6, handles: 2 };
  observe(w, p, yard);
  return { w, p, hh, h, yard };
}

describe('the bed', () => {
  it('is made at the timber yard from four planks and a handle, with a hammer, nothing unaccounted', () => {
    const s = stage('bed-make');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'timber_yard', 49, 50, 0, { planks: 4, handles: 1 });
    give(s.w, p, 'hammer');
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.make_bed, p.id, 'test')).toBeNull();
    for (let i = 0; i < 900 && b.ops?.job; i++) {
      w.tick++;
      workJob(w, b, p);
    }
    expect(b.store.items.furniture).toBe(1);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('keeps its sleeper warmer in their own home, in a rich world only', () => {
    for (const rich of [true, false]) {
      const r = settled(rich ? 'bed-warm' : 'bed-warm-off', rich);
      r.h.store.items = { furniture: 1 };
      r.p.x = r.h.x + r.h.w / 2;
      r.p.y = r.h.y + r.h.h / 2;
      expect(inOwnBed(r.w, r.p, shelterAt(r.w, r.p.x, r.p.y))).toBe(rich);
    }
    expect(BED_WARMTH).toBeGreaterThan(3);
  });

  it('is wanted by a household that woke cold lately, and the want goes once a bed is home', () => {
    const r = settled('bed-want');
    for (const id of r.hh.members) {
      const q = r.w.byId.get(id) as Person;
      if (q) q.cooldowns.coldNight = -1e9;
    }
    const wanted = () => demandsOf(makeCtx(r.w, r.p, false)).some((d) => d.item === 'furniture');
    const frail = r.hh.members.some((id) => {
      const q = r.w.byId.get(id) as Person;
      return q && q.alive && (stageOf(r.w, q) === 'child' || stageOf(r.w, q) === 'elder');
    });
    if (!frail) expect(wanted()).toBe(false);
    r.p.cooldowns.coldNight = r.w.tick;
    expect(wanted()).toBe(true);
    // and it is a plan, not only a wish: with a hammer in hand the bed is planned at the yard
    give(r.w, r.p, 'hammer');
    expect(generateOptions(r.w, r.p, true).options.some((o) => o.kind === 'operate' && o.label === 'Making a bed')).toBe(true);
    r.h.store.items = { ...r.h.store.items, furniture: 1 };
    observe(r.w, r.p, r.h);
    expect(wanted()).toBe(false);
  });

  it('carried, is taken home', () => {
    const r = settled('bed-home');
    r.p.inv = { furniture: 1 };
    expect(generateOptions(r.w, r.p, true).options.some((o) => o.label === 'Take the bed home')).toBe(true);
    const o = settled('bed-home-off', false);
    o.p.inv = { furniture: 1 };
    expect(generateOptions(o.w, o.p, true).options.some((x) => x.label === 'Take the bed home')).toBe(false);
  });
});
