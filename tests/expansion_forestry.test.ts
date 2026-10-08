// The forester's lodge (docs/BUILDINGS.md, stage A): real planting of young trees, bounded, accounted, and only where the wood is thin.
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { siteConflict } from '../src/sim/act_build';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding, destroyBuilding } from '../src/sim/buildings';
import { DAY, SAPLING_TICKS } from '../src/sim/constants';
import { conservationReport, snapshotInitial } from '../src/sim/economy';
import { buildable } from '../src/sim/expansion';
import { FOREST_MAX_SAPLINGS, FOREST_REACH, FOREST_THIN, plantingSpot, saplingsAround } from '../src/sim/forestry';
import { delBelief, observe, putBelief } from '../src/sim/knowledge';
import { beliefsByKind, makeCtx } from '../src/sim/optutil';
import { facilityWants } from '../src/sim/production';
import { hyp } from '../src/sim/util';
import { isFreeLand } from '../src/sim/registry';
import { makeSource } from '../src/sim/sources';
import type { Belief, Building, Household, Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

const homeOf = (w: World, hhId: number): Building => {
  const hh = w.households.find((h) => h.id === hhId) as Household;
  return w.byId.get(hh.homeId) as Building;
};

function ready(rich: boolean) {
  const w = natural('forester-demand', rich ? { dynamics: 'rich' } : {});
  run(w, Math.round(DAY * 4.1));
  const p = w.persons.find((q) => q.alive && !!w.households.find((h) => h.id === q.hhId)?.homeId)!;
  const h = homeOf(w, p.hhId);
  // the wood near home is thin by what this person knows: forget every tree within the thin radius of home, keep a few distant ones
  for (const b of beliefsByKind(p, ['tree'])) if (hyp(b.x - h.x, b.y - h.y) < 30) delBelief(p, b.id);
  const at = w.tick;
  const mk = (id: number, x: number, y: number): Belief => ({ id, kind: 'tree', x, y, amount: 5, max: 5, seen: at, src: 'seen', from: 0, learned: at });
  for (let i = 0; i < 4; i++) putBelief(p, mk(910_000 + i, h.x + 25, h.y + i));
  putBelief(p, { id: 910_050, kind: 'rock', x: h.x - 4, y: h.y, amount: 5, max: 5, seen: at, src: 'seen', from: 0, learned: at });
  return { w, p, h };
}

function lodgeStage(seed: string) {
  const w = natural(seed, { dynamics: 'rich' });
  const p = w.persons.find((q) => q.alive)!;
  p.explored.fill(1); // (what a person has explored is theirs alone: let this one have seen the whole map)
  const lodge = createBuilding(w, 'forester', Math.floor(p.x) + 4, Math.floor(p.y) + 4, 0);
  p.x = lodge.x + 1.5;
  p.y = lodge.y + 1.5;
  p.px = p.x;
  p.py = p.y;
  snapshotInitial(w);
  return { w, p, lodge };
}

function plant(w: World, p: Person, lodge: Building, at: { x: number; y: number }): void {
  p.x = at.x + 0.5;
  p.y = at.y + 0.5;
  p.px = p.x;
  p.py = p.y;
  for (const k of Object.keys(p.needs) as (keyof Person['needs'])[]) p.needs[k] = 100;
  const act = newActivity(w, p, { kind: 'plant_tree', label: 'Planting a young tree', goal: 'test', targetId: lodge.id, targetType: 'building', tx: at.x + 0.5, ty: at.y + 0.5, spotX: p.x, spotY: p.y, maxTicks: 900, here: true, data: { sticky: true } });
  startActivity(w, p, act);
}

describe('planting at the lodge', () => {
  it('sets a young tree within reach of the lodge, creating no wood on planting; it grows up over three days and every unit it gains is in the ledger', () => {
    const { w, p, lodge } = lodgeStage('forester-plant');
    const spot = plantingSpot(w, p, { x: lodge.x + 1, y: lodge.y + 0.5 })!;
    expect(spot).toBeTruthy();
    expect(hyp(spot.x - lodge.x - 1, spot.y - lodge.y - 0.5)).toBeLessThanOrEqual(FOREST_REACH);
    const wood = w.ledger.created.wood ?? 0;
    const at = (): boolean => w.sources.some((s) => s.type === 'tree' && s.x === spot.x && s.y === spot.y);
    expect(at()).toBe(false);
    plant(w, p, lodge, spot);
    run(w, 260);
    expect(at()).toBe(true);
    const sapling = w.sources.find((s) => s.type === 'tree' && s.x === spot.x && s.y === spot.y)!;
    expect(sapling).toBeTruthy();
    expect(sapling.amount).toBe(0);
    expect(sapling.growth).toBeLessThan(0.2);
    expect(saplingsAround(w, lodge)).toBeGreaterThanOrEqual(1);
    run(w, SAPLING_TICKS + 100);
    expect(sapling.growth).toBe(1);
    // (the grown tree is wood like any other: a villager may already have felled it, so only the growth is asserted)
    expect((w.ledger.created.wood ?? 0) - wood).toBeGreaterThanOrEqual(sapling.max);
    expect(w.ledger.reasons['+tree growth']).toBeGreaterThanOrEqual(sapling.max);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('is capped: a lodge whose nursery is full refuses another planting, and remembers that it did', () => {
    const { w, p, lodge } = lodgeStage('forester-cap');
    const cx = lodge.x + 1;
    const cy = lodge.y + 0.5;
    let put = 0;
    for (let y = Math.floor(cy) - 8; y <= Math.floor(cy) + 8 && put < FOREST_MAX_SAPLINGS; y++) {
      for (let x = Math.floor(cx) - 8; x <= Math.floor(cx) + 8 && put < FOREST_MAX_SAPLINGS; x++) {
        if ((x + y) % 3 === 0 && hyp(x - cx, y - cy) > 3 && isFreeLand(w, x, y)) {
          makeSource(w, 'tree', x, y, 0, 0.3);
          put++;
        }
      }
    }
    expect(put).toBe(FOREST_MAX_SAPLINGS);
    expect(saplingsAround(w, lodge)).toBeGreaterThanOrEqual(FOREST_MAX_SAPLINGS);
    const target = { x: Math.floor(cx) + 2, y: Math.floor(cy) + 2 };
    const at = (): boolean => w.sources.some((s) => s.type === 'tree' && s.x === target.x && s.y === target.y && s.growth < 0.25);
    expect(isFreeLand(w, target.x, target.y)).toBe(true);
    plant(w, p, lodge, target);
    run(w, 260);
    expect(at()).toBe(false);
    expect(p.activity?.kind).not.toBe('plant_tree');
  });

  it('is refused when the lodge is gone, with nothing planted', () => {
    const { w, p, lodge } = lodgeStage('forester-gone');
    const target = { x: Math.floor(lodge.x) + 3, y: Math.floor(lodge.y) + 3 };
    destroyBuilding(w, lodge, 'test');
    plant(w, p, lodge, target);
    run(w, 260);
    expect(w.sources.some((s) => s.type === 'tree' && s.x === target.x && s.y === target.y)).toBe(false);
  });

  it('saplings and the lodge survive a save in the middle of planting and carry on identically', () => {
    const { w, p, lodge } = lodgeStage('forester-save');
    const spot = plantingSpot(w, p, { x: lodge.x + 1, y: lodge.y + 0.5 })!;
    plant(w, p, lodge, spot);
    run(w, 60);
    const c = deserializeWorld(serializeWorld(w));
    expect(hashWorld(c)).toBe(hashWorld(w));
    run(w, 400);
    run(c, 400);
    expect(serializeWorld(c)).toBe(serializeWorld(w));
    expect(c.sources.some((s) => s.type === 'tree' && s.x === spot.x && s.y === spot.y)).toBe(true);
  });
});

describe('the demand for a lodge', () => {
  it('arises where the wood near home is thin (and only in a rich world), and stops once a lodge is known', () => {
    const r = ready(true);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'forester')).toBe(true);
    const lodge = createBuilding(r.w, 'forester', Math.floor(r.h.x) + 6, Math.floor(r.h.y) + 5, 0);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'forester')).toBe(true); // unseen: planning cannot know
    observe(r.w, r.p, lodge);
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'forester')).toBe(false);
    const o = ready(false);
    expect(facilityWants(makeCtx(o.w, o.p, false)).some((x) => x.type === 'forester')).toBe(false);
  });

  it('does not arise where the person knows plenty of trees near home', () => {
    const r = ready(true);
    const at = r.w.tick;
    for (let i = 0; i < FOREST_THIN + 2; i++) putBelief(r.p, { id: 911_000 + i, kind: 'tree', x: r.h.x + 3 + (i % 5), y: r.h.y - 3 - Math.floor(i / 5), amount: 5, max: 5, seen: at, src: 'seen', from: 0, learned: at });
    expect(facilityWants(makeCtx(r.w, r.p, false)).some((x) => x.type === 'forester')).toBe(false);
  });

  it('one lodge to a settlement, not in ordinary worlds', () => {
    const w = natural('forester-one', { dynamics: 'rich' });
    createBuilding(w, 'forester', 40, 40, 0);
    expect(siteConflict(w, 'forester', 1, 0, 0, { x: 41, y: 41 })).toMatch(/already a forester/);
    const o = natural('forester-off');
    expect(buildable(o, 'forester')).toBe(false);
  });
});

