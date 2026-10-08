// What the critical review after stage A found (docs/BUILDINGS.md, "Review after stage A"), each pinned by a test: common buildings are
// mended, their sites are everyone's project, planting walks to the spot and needs a grown tree, the yard does not ping-pong, a well is
// not wanted where one stands nearby, a well is drawn lazily, an orphaned cellar goes with the house, the loss tally is fingerprinted,
// and the failure modes the brief lists (a silted well, a lodge in disrepair, a full yard, a full cellar) behave as stated.
import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { siteConflict } from '../src/sim/act_build';
import { createBuilding, createSite } from '../src/sim/buildings';
import { BUILD_DEF, DAY, WEIGHT } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { mayDeposit } from '../src/sim/facilities';
import { FOREST_REACH, seedTreeNear } from '../src/sim/forestry';
import { dissolveHousehold } from '../src/sim/households';
import { delBelief, observe, putBelief } from '../src/sim/knowledge';
import { beliefsByKind, makeCtx } from '../src/sim/optutil';
import { repairStake, siteRelation } from '../src/sim/options_work';
import { facilityWants } from '../src/sim/production';
import { makeSource } from '../src/sim/sources';
import { YARD_TARGET } from '../src/sim/stockyard';
import type { Belief, Building, Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { WELL_CAP, WELL_MIN_CONDITION, WELL_REACH } from '../src/sim/water';
import { hyp } from '../src/sim/util';
import { natural, run } from './helpers/util';

const belief = (w: World, id: number, kind: Belief['kind'], x: number, y: number, amount = 5): Belief => ({ id, kind, x, y, amount, max: amount, seen: w.tick, src: 'seen', from: 0, learned: w.tick });

/** a rich world some days in; one adult with a home, stood by their door, needs met */
function settled(seed: string, days = 6.1) {
  const w = natural(seed, { dynamics: 'rich' });
  run(w, Math.round(DAY * days));
  const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
  const hh = w.households.find((x) => x.id === p.hhId)!;
  const h = w.byId.get(hh.homeId) as Building;
  p.x = h.x + h.w / 2;
  p.y = h.y + h.h + 0.5;
  p.px = p.x;
  p.py = p.y;
  for (const k of Object.keys(p.needs) as (keyof Person['needs'])[]) p.needs[k] = 100;
  return { w, p, hh, h };
}

describe('common buildings are kept up', () => {
  it('a well, a yard and a lodge with nobody on the title have a repair stake for anyone, and a worn well draws a repair option', () => {
    const { w, p, h } = settled('review-repair');
    const well = createBuilding(w, 'well', Math.floor(h.x) + 4, Math.floor(h.y) + 2, 0);
    const yard = createBuilding(w, 'stockyard', Math.floor(h.x) + 6, Math.floor(h.y) + 4, 0);
    const lodge = createBuilding(w, 'forester', Math.floor(h.x) - 4, Math.floor(h.y) + 4, 0);
    for (const b of [well, yard, lodge]) {
      b.condition = 30;
      observe(w, p, b);
      expect(repairStake(makeCtx(w, p, false), p.beliefs[b.id]), b.type).toBeGreaterThan(0);
    }
    p.inv = { stone: 3, wood: 3 };
    const ctx = generateOptions(w, p, true);
    expect(ctx.options.some((o) => o.kind === 'repair' && o.targetId === well.id)).toBe(true);
  });

  it('a well site is a shared project to a stranger, as a granary site is', () => {
    const { w, p, h } = settled('review-shared');
    const other = w.households.find((x) => x.id !== p.hhId)!;
    const site = createSite(w, 'well', Math.floor(h.x) + 9, Math.floor(h.y) + 1, other.id, other.members[0] ?? 0);
    observe(w, p, site);
    const rel = siteRelation(makeCtx(w, p, false), p.beliefs[site.id]);
    expect(rel.ok).toBe(true);
    expect(rel.why).toBe('a shared project');
  });
});

describe('planting walks to the spot and comes from a grown tree', () => {
  function lodgeWorld(seed: string) {
    const r = settled(seed, 4.1);
    const { w, p, h } = r;
    p.explored.fill(1);
    // the wood near home is thin by what they know; a lodge stands 12 tiles away with grown trees beside it
    for (const b of beliefsByKind(p, ['tree'])) delBelief(p, b.id);
    const lodge = createBuilding(w, 'forester', Math.floor(h.x) + 12, Math.floor(h.y) + 2, 0);
    observe(w, p, lodge);
    for (let i = 0; i < 3; i++) {
      const t = makeSource(w, 'tree', lodge.x + 4 + i, lodge.y + 4, 5, 1);
      observe(w, p, t);
    }
    putBelief(p, belief(w, 940_000, 'rock', h.x - 4, h.y));
    return { ...r, lodge };
  }

  it('the option walks the person to a stand beside the tile; the tree then stands where they planted, not where they were', () => {
    const { w, p, lodge } = lodgeWorld('review-plant-walk');
    let found = null as ReturnType<typeof generateOptions>['options'][number] | null;
    for (let t = 0; t < 6 && !found; t++) {
      found = generateOptions(w, p, true).options.find((o) => o.kind === 'plant_tree') ?? null;
      if (!found) run(w, 500);
    }
    expect(found).toBeTruthy();
    const act = found!.make!()!;
    expect(act).toBeTruthy();
    expect(hyp(act.spotX - act.tx, act.spotY - act.ty)).toBeLessThan(2);
    expect(hyp(act.tx - p.x, act.ty - p.y)).toBeGreaterThan(3);
    const tile = { x: Math.floor(act.tx), y: Math.floor(act.ty) };
    act.data.sticky = true;
    startActivity(w, p, act);
    for (let i = 0; i < 40 && !w.sources.some((s) => s.type === 'tree' && s.x === tile.x && s.y === tile.y); i++) run(w, 30);
    expect(w.sources.some((s) => s.type === 'tree' && s.x === tile.x && s.y === tile.y)).toBe(true);
    expect(hyp(p.x - (tile.x + 0.5), p.y - (tile.y + 0.5))).toBeLessThan(2.6);
    void lodge;
  });

  it('with no grown tree near the lodge there is nothing to raise a young one from: no option, and the activity is refused', () => {
    const { w, p, lodge } = lodgeWorld('review-plant-seed');
    for (const s of w.sources.filter((t) => t.type === 'tree' && hyp(t.x - lodge.x, t.y - lodge.y) <= FOREST_REACH + 2)) s.amount = 0;
    for (const b of beliefsByKind(p, ['tree'])) delBelief(p, b.id);
    expect(seedTreeNear(w, lodge)).toBe(false);
    expect(generateOptions(w, p, true).options.some((o) => o.kind === 'plant_tree')).toBe(false);
    const act = newActivity(w, p, { kind: 'plant_tree', label: 'x', goal: 't', targetId: lodge.id, targetType: 'building', tx: lodge.x + 3.5, ty: lodge.y + 3.5, spotX: lodge.x + 3.5, spotY: lodge.y + 3.5, here: true, maxTicks: 300 });
    p.x = lodge.x + 3.5;
    p.y = lodge.y + 3.5;
    startActivity(w, p, act);
    run(w, 200);
    expect(w.sources.some((s) => s.type === 'tree' && s.x === lodge.x + 3 && s.y === lodge.y + 3)).toBe(false);
  });

  it('a lodge in disrepair is not planted from', () => {
    const { w, p, lodge } = lodgeWorld('review-plant-worn');
    lodge.condition = 8;
    const act = newActivity(w, p, { kind: 'plant_tree', label: 'x', goal: 't', targetId: lodge.id, targetType: 'building', tx: lodge.x + 3.5, ty: lodge.y + 3.5, spotX: lodge.x + 3.5, spotY: lodge.y + 3.5, here: true, maxTicks: 300 });
    p.x = lodge.x + 3.5;
    p.y = lodge.y + 3.5;
    startActivity(w, p, act);
    run(w, 200);
    expect(w.sources.some((s) => s.type === 'tree' && s.x === lodge.x + 3 && s.y === lodge.y + 3)).toBe(false);
  });
});

describe('the stockyard does not take back what was fetched for a purpose', () => {
  it('wood carried for a site this person knows is not spare: no stacking option; without the site it is', () => {
    const { w, p, h } = settled('review-yard-pingpong');
    const yard = createBuilding(w, 'stockyard', Math.floor(h.x) + 5, Math.floor(h.y) + 4, 0);
    observe(w, p, yard);
    const site = createSite(w, 'hut', Math.floor(h.x) + 9, Math.floor(h.y) + 1, p.hhId, p.id);
    observe(w, p, site);
    p.inv = { wood: 5 };
    expect(generateOptions(w, p, true).options.some((o) => o.key === `deposit:${yard.id}:raw`)).toBe(false);
    // (without the site, a pack well beyond the person's other standing wood needs, a tool or the fire, has something spare)
    delBelief(p, site.id);
    p.inv = { wood: 14 };
    expect(generateOptions(w, p, true).options.some((o) => o.key === `deposit:${yard.id}:raw`)).toBe(true);
  });

  it('a yard remembered full offers no stacking; stacking into a really full yard is refused and nothing is lost', () => {
    const { w, p, h } = settled('review-yard-full');
    const yard = createBuilding(w, 'stockyard', Math.floor(h.x) + 5, Math.floor(h.y) + 4, 0);
    yard.store.items = { stone: 50 }; // weight 150: the cap
    observe(w, p, yard);
    p.inv = { wood: 5 };
    expect(generateOptions(w, p, true).options.some((o) => o.key === `deposit:${yard.id}:raw`)).toBe(false);
    p.x = yard.x + 1;
    p.y = yard.y + 2.5;
    const act = newActivity(w, p, { kind: 'deposit', label: 'x', goal: 't', targetId: yard.id, targetType: 'building', tx: yard.x, ty: yard.y, spotX: p.x, spotY: p.y, here: true, maxTicks: 300, data: { items: { wood: 3 }, sticky: true } });
    startActivity(w, p, act);
    run(w, 60);
    expect(yard.store.items.wood ?? 0).toBe(0);
    expect(p.inv.wood).toBe(5);
    void YARD_TARGET;
  });
});

describe('wells', () => {
  it('are not wanted where one stands within reach of the spot a new one would take', () => {
    const { w, p, h } = settled('review-well-want', 3.1);
    for (let i = 0; i < 4; i++) putBelief(p, belief(w, 950_000 + i, 'tree', h.x - 3, h.y + i));
    putBelief(p, belief(w, 950_010, 'rock', h.x - 4, h.y));
    for (const b of beliefsByKind(p, ['water'])) delBelief(p, b.id);
    putBelief(p, { ...belief(w, 950_020, 'water', h.x + 30, h.y), amount: 0, max: 0 });
    const far = createBuilding(w, 'well', Math.floor(h.x) + WELL_REACH + 4, Math.floor(h.y), 0);
    observe(w, p, far);
    expect(facilityWants(makeCtx(w, p, false)).some((x) => x.type === 'well')).toBe(false);
    expect(siteConflict(w, 'well', p.hhId, 0, 0, { x: h.x + 6, y: h.y })).toMatch(/close by/);
  });

  it('are drawn lazily: a nearly quenched person takes one unit, not two', () => {
    const { w, p, h } = settled('review-well-draw');
    const well = createBuilding(w, 'well', Math.floor(h.x) + 3, Math.floor(h.y) + 2, 0);
    well.store.items = { water: WELL_CAP };
    p.needs.thirst = 94;
    p.x = well.x + 0.5;
    p.y = well.y + 1.5;
    const act = newActivity(w, p, { kind: 'drink', label: 'drink', goal: 't', targetId: well.id, targetType: 'building', tx: well.x, ty: well.y, spotX: p.x, spotY: p.y, need: 'thirst', here: true, maxTicks: 300 });
    const created = w.ledger.created.water ?? 0; // (wells built in the six days before have seeped: only what seeps from now on counts)
    startActivity(w, p, act);
    run(w, 30);
    const seeped = (w.ledger.created.water ?? 0) - created;
    expect(WELL_CAP + seeped - (well.store.items.water ?? 0)).toBe(1);
    expect(p.needs.thirst).toBeGreaterThan(96);
  });

  it('silted up, a well stops seeping; mended, it seeps again; and it takes nothing but its own water', () => {
    const w = natural('review-well-silt', { dynamics: 'rich' });
    const well = createBuilding(w, 'well', 40, 40, 0);
    well.condition = WELL_MIN_CONDITION - 1;
    run(w, 300);
    expect(well.store.items.water ?? 0).toBe(0);
    well.condition = 60;
    run(w, 300);
    expect(well.store.items.water ?? 0).toBeGreaterThan(0);
    expect(mayDeposit(well, 'water')).toBe(false);
    expect(mayDeposit(well, 'stone')).toBe(false);
  });
});

describe('cellars', () => {
  it('left behind by a household that is gone go with the house to whoever moves in', () => {
    const { w, p, hh, h } = settled('review-cellar-orphan');
    const other = w.households.find((x) => x.id !== hh.id && x.members.length > 0)!;
    const q = w.persons.find((x) => x.alive && x.hhId === other.id)!;
    const cellar = createBuilding(w, 'cellar', Math.floor(h.x) + 3, Math.floor(h.y) + 3, hh.id);
    cellar.store.items = { berries: 9 };
    dissolveHousehold(w, hh);
    expect(cellar.hhId).toBe(0);
    expect(h.hhId).toBe(0);
    q.x = h.x + h.w / 2;
    q.y = h.y + h.h + 0.5;
    const act = newActivity(w, q, { kind: 'claim_home', label: 'x', goal: 't', targetId: h.id, targetType: 'building', tx: h.x, ty: h.y, spotX: q.x, spotY: q.y, here: true, maxTicks: 300, data: { sticky: true } });
    startActivity(w, q, act);
    run(w, 40);
    expect(h.hhId).toBe(other.id);
    expect(cellar.hhId).toBe(other.id);
    void p;
  });

  it('a cellar remembered full is not offered for food', () => {
    const { w, p, hh, h } = settled('review-cellar-full');
    const cellar = createBuilding(w, 'cellar', Math.floor(h.x) + 3, Math.floor(h.y) + 3, hh.id);
    cellar.store.items = { grain: Math.ceil(BUILD_DEF.cellar.cap / WEIGHT.grain) }; // at the cap
    observe(w, p, cellar);
    p.inv = { berries: 9 };
    p.needs.hunger = 80;
    const ctx = generateOptions(w, p, true);
    expect(ctx.options.some((o) => o.label === 'Put food in the cellar')).toBe(false);
    expect(ctx.blocked.some((b) => b.targetId === cellar.id && /full/.test(b.blocked ?? ''))).toBe(true);
  });

  it('the loss tally is part of the fingerprint in a rich world', () => {
    const { w, hh } = settled('review-hash', 2.1);
    const a = hashWorld(w);
    hh.lost = { units: 9, tick: w.tick };
    expect(hashWorld(w)).not.toBe(a);
  });
});
