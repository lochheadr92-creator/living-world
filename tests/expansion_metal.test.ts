// Stage B, the iron chain (docs/BUILDINGS.md): the charcoal clamp, the smith who keeps iron on the shelf, iron tools preferred when iron
// is there, and ordinary worlds unchanged.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { buildable } from '../src/sim/expansion';
import { facilityTick, startJob, workJob } from '../src/sim/facilities';
import { delBelief, observe, putBelief } from '../src/sim/knowledge';
import { beliefsByKind, makeCtx } from '../src/sim/optutil';
import { facilityWants } from '../src/sim/production';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { toolsHeldBy } from '../src/sim/toolreg';
import type { Belief, Building, Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { addPerson, building, done, give, stage } from './helpers/kit';
import { natural, run } from './helpers/util';

const belief = (w: World, id: number, kind: Belief['kind'], x: number, y: number, amount = 5): Belief => ({ id, kind, x, y, amount, max: amount, seen: w.tick, src: 'seen', from: 0, learned: w.tick });

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

/** a rich world some days in; one diligent adult with a home, stood by their door, needs met, knowing a smithy nearby */
function settled(seed: string, rich = true, days = 6.1) {
  const w = natural(seed, rich ? { dynamics: 'rich' } : {});
  run(w, Math.round(DAY * days));
  const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
  const h = w.byId.get(w.households.find((x) => x.id === p.hhId)!.homeId) as Building;
  p.x = h.x + h.w / 2;
  p.y = h.y + h.h + 0.5;
  p.px = p.x;
  p.py = p.y;
  for (const k of Object.keys(p.needs) as (keyof Person['needs'])[]) p.needs[k] = 100;
  p.traits.diligence = 0.95;
  p.health = 100;
  const smithy = createBuilding(w, 'smithy', Math.floor(h.x) + 5, Math.floor(h.y) + 3, 0);
  observe(w, p, smithy);
  for (let i = 0; i < 4; i++) putBelief(p, belief(w, 960_000 + i, 'tree', h.x - 3, h.y + i));
  putBelief(p, belief(w, 960_010, 'rock', h.x - 4, h.y));
  return { w, p, h, smithy };
}

/** generate options over a few 400-tick spells (the smith's turn is spread over the day) until one matches */
function findOption(w: World, p: Person, test: (o: ReturnType<typeof generateOptions>['options'][number]) => boolean, refresh: () => void) {
  for (let t = 0; t < 5; t++) {
    refresh();
    const o = generateOptions(w, p, true).options.find(test);
    if (o) return o;
    run(w, 400);
    p.x = p.px;
    for (const k of Object.keys(p.needs) as (keyof Person['needs'])[]) p.needs[k] = 100;
  }
  return null;
}

describe('the charcoal clamp', () => {
  it('turns a stack of logs into charcoal over a long burn, with the ash recorded as waste and nothing unaccounted', () => {
    const s = stage('clamp-burn');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'clamp', 49, 50, 0, { wood: 10 });
    const w = done(s);
    expect(startJob(w, b, p, RECIPE_BY_ID.burn_charcoal_clamp, p.id, 'test')).toBeNull();
    work(w, b, p);
    burn(w, b);
    expect(b.ops?.job).toBeNull();
    expect(b.store.items.charcoal).toBe(6);
    expect(b.ops?.wasted['smoke and ash']).toBe(4); // the ash is recorded, by its reason
    expect(w.ledger.reasons['-wasted: smoke and ash']).toBe(4);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('is saved and loaded mid-burn and carries on identically', () => {
    const s = stage('clamp-save');
    const p = addPerson(s, 'Odo', 44, 44);
    const b = building(s, 'clamp', 49, 50, 0, { wood: 10 });
    const w = done(s);
    startJob(w, b, p, RECIPE_BY_ID.burn_charcoal_clamp, p.id, 'test');
    work(w, b, p);
    for (let i = 0; i < 300; i++) {
      w.tick++;
      facilityTick(w, b);
    }
    const c = deserializeWorld(serializeWorld(w));
    expect(hashWorld(c)).toBe(hashWorld(w));
    burn(w, b);
    burn(c, c.byId.get(b.id) as Building);
    expect(serializeWorld(c)).toBe(serializeWorld(w));
    expect((c.byId.get(b.id) as Building).store.items.charcoal).toBe(6);
  });

  it('is wanted where a known smithy has no charcoal, not where it has some, and not in an ordinary world', () => {
    const r = settled('clamp-want');
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'clamp')).toBe(true);
    r.smithy.store.items = { charcoal: 3 };
    observe(r.w, r.p, r.smithy);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'clamp')).toBe(false);
    const o = settled('clamp-want-off', false);
    expect(buildable(o.w, 'clamp')).toBe(false);
    expect(facilityWants(makeCtx(o.w, o.p, false)).some((x) => x.type === 'clamp')).toBe(false);
  });
});

describe('the smith', () => {
  it('smelts for the shelf when ore and charcoal are at the smithy, and that batch belongs to nobody', () => {
    const r = settled('smith-shelf');
    r.smithy.store.items = { ore: 3, charcoal: 2 };
    const o = findOption(r.w, r.p, (x) => x.kind === 'operate' && /shelf/.test(x.goal), () => observe(r.w, r.p, r.smithy));
    expect(o).toBeTruthy();
    const act = o!.make!()!;
    expect(act.data.recipe).toBe('smelt_iron');
    expect(act.data.client).toBe(0);
  });

  it('fetches what the shelf needs when the smithy is bare: ore and charcoal through the ordinary supply planning', () => {
    const r = settled('smith-fetch');
    const vein = r.w.sources.find((s) => s.type === 'ore_vein');
    if (vein) observe(r.w, r.p, vein);
    else putBelief(r.p, belief(r.w, 960_020, 'ore_vein', r.h.x + 9, r.h.y + 9, 20));
    const kiln = createBuilding(r.w, 'kiln', Math.floor(r.h.x) + 8, Math.floor(r.h.y) - 2, 0);
    observe(r.w, r.p, kiln);
    const o = findOption(r.w, r.p, (x) => /shelf/.test(x.goal), () => observe(r.w, r.p, r.smithy));
    expect(o).toBeTruthy();
    expect(['gather', 'operate', 'withdraw', 'deposit']).toContain(o!.kind);
  });

  it('does not exist in an ordinary world', () => {
    const o = settled('smith-off', false);
    o.smithy.store.items = { ore: 3, charcoal: 2 };
    expect(findOption(o.w, o.p, (x) => /shelf/.test(x.goal), () => observe(o.w, o.p, o.smithy))).toBeNull();
  });
});

describe('iron tools', () => {
  it('are wanted in place of a stone one when iron and a handle are on a known smithy\'s shelf: the forge is planned', () => {
    const r = settled('iron-prefer');
    for (const t of toolsHeldBy(r.w, r.p.id)) if (t.kind === 'axe') t.holder = 0;
    r.p.inv.axe = 0;
    r.p.stats.gathered = 12;
    give(r.w, r.p, 'hammer');
    r.smithy.store.items = { iron: 1, handles: 1, charcoal: 1 };
    const o = findOption(r.w, r.p, (x) => x.kind === 'operate' && /Forging an iron/.test(x.label), () => observe(r.w, r.p, r.smithy));
    expect(o).toBeTruthy();
    expect(o!.goal).toMatch(/iron .*faster/);
  });

  it('are not preferred in an ordinary world with no worn tool', () => {
    const o = settled('iron-prefer-off', false);
    for (const t of toolsHeldBy(o.w, o.p.id)) if (t.kind === 'axe') t.holder = 0;
    o.p.inv.axe = 0;
    o.p.stats.gathered = 12;
    give(o.w, o.p, 'hammer');
    o.smithy.store.items = { iron: 1, handles: 1, charcoal: 1 };
    expect(findOption(o.w, o.p, (x) => x.kind === 'operate' && /Forging an iron/.test(x.label), () => observe(o.w, o.p, o.smithy))).toBeNull();
    void beliefsByKind;
    void delBelief;
  });
});
