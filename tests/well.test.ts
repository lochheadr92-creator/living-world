import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { BUILD_DEF, DAY, REPAIR_USES } from '../src/sim/constants';
import { createBuilding, destroyBuilding, findBuildSpot } from '../src/sim/buildings';
import { siteConflict } from '../src/sim/act_build';
import { conservationReport } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { describeFacility } from '../src/sim/inspect_work';
import { ACCESS_CELL, observe, putBelief, waterBeliefId } from '../src/sim/knowledge';
import { makeCtx } from '../src/sim/optutil';
import { facilityWants } from '../src/sim/production';
import { isFacilityType } from '../src/sim/recipes';
import { findWaterAccessNear, isWater, isWaterAccess, isWell } from '../src/sim/registry';
import { makeSource } from '../src/sim/sources';
import { toolReport } from '../src/sim/toolreg';
import type { Person, World } from '../src/sim/types';
import { addPerson, building, done, site, stage } from './helpers/kit';
import { run } from './helpers/util';

const cellOf = (w: World, x: number, y: number): number => {
  const cw = Math.ceil(w.W / ACCESS_CELL);
  return Math.floor(y / ACCESS_CELL) * cw + Math.floor(x / ACCESS_CELL);
};

/** a person who knows some trees and rocks, so that their wants for workshops and the like are switched on */
function settled(s: ReturnType<typeof stage>, name: string, x: number, y: number): Person {
  const p = addPerson(s, name, x, y, { traits: { diligence: 0.9, curiosity: 0.6 }, inv: { berries: 8 } });
  for (let i = 0; i < 4; i++) makeSource(s.w, 'tree', x + 3 + i, y + 6, 6);
  makeSource(s.w, 'rock', x - 4, y + 5, 3);
  return p;
}
/** what they have seen of the neighbourhood, and the nearest stretch of shore they know of (the lake runs along the north edge) */
function knowTheNeighbourhood(w: World, p: Person): void {
  for (const e of [...w.sources]) if (Math.hypot(e.x - p.x, e.y - p.y) < 12) observe(w, p, e);
  putBelief(p, { id: waterBeliefId(cellOf(w, 44, 14)), kind: 'water', x: 44.5, y: 14.5, amount: 0, max: 0, seen: -10, src: 'seen', from: 0, learned: -10 });
}

describe('adding the well', () => {
  it('comes after every older kind in BUILD_DEF, so no existing world changes', () => {
    expect(Object.keys(BUILD_DEF).slice(0, 13)).toEqual(['lean_to', 'hut', 'house', 'storehouse', 'fire', 'timber_yard', 'quarry', 'kiln', 'smithy', 'granary', 'bakery', 'hall', 'smokehouse']);
    expect(Object.keys(BUILD_DEF)[13]).toBe('well');
  });
});

describe('a well is water', () => {
  it('the tile of a finished well is water and the ground beside it is a place to drink; both go when the well falls', () => {
    const s = stage('well-tile');
    addPerson(s, 'Ola', 44, 44);
    const w = done(s);
    expect(isWater(w, 50, 50)).toBe(false);
    expect(findWaterAccessNear(w, 50, 50, 4)).toBeNull();
    const b = createBuilding(w, 'well', 50, 50, 0);
    expect(isWell(w, 50, 50)).toBe(true);
    expect(isWater(w, 50, 50)).toBe(true);
    expect(isWaterAccess(w, 50, 51)).toBe(true); // the tile at its door
    expect(isWaterAccess(w, 49, 49)).toBe(true); // and all round it
    expect(isWaterAccess(w, 50, 50)).toBe(false); // the well itself is not somewhere to stand
    expect(isWaterAccess(w, 53, 53)).toBe(false);
    destroyBuilding(w, b, 'fell in');
    expect(isWater(w, 50, 50)).toBe(false);
    expect(isWaterAccess(w, 50, 51)).toBe(false);
  });

  it('a well under construction is not water yet', () => {
    const s = stage('well-site');
    const p = addPerson(s, 'Ola', 44, 44);
    const w = done(s);
    site(s, 'well', 50, 50, p.hhId, p.id);
    expect(isWater(w, 50, 50)).toBe(false);
    expect(isWaterAccess(w, 50, 51)).toBe(false);
  });

  it('the coarse shore cell a well stands in gets a drinking place when the well is built, and loses it when the well is gone', () => {
    const s = stage('well-cell');
    addPerson(s, 'Ola', 44, 44);
    const w = done(s);
    const idx = cellOf(w, 50, 51);
    expect(w.accessCell[idx]).toBe(-1);
    const b = createBuilding(w, 'well', 50, 50, 0);
    const t = w.accessCell[idx];
    expect(t).toBeGreaterThanOrEqual(0);
    expect(isWaterAccess(w, t % w.W, Math.floor(t / w.W))).toBe(true);
    destroyBuilding(w, b, 'fell in');
    expect(w.accessCell[idx]).toBe(-1);
  });

  it('is found by perception: someone who walks by learns of it as a place to drink, as they would the lake', () => {
    const s = stage('well-seen');
    const p = addPerson(s, 'Ola', 44, 44);
    const w = done(s);
    const b = createBuilding(w, 'well', 47, 47, 0);
    const before = (p.bykind.water ?? []).length;
    run(w, 30);
    const waters = (p.bykind.water ?? []).map((id) => p.beliefs[id]);
    expect(waters.length).toBeGreaterThan(before);
    expect(waters.some((x) => Math.hypot(x.x - (b.x + 0.5), x.y - (b.y + 0.5)) < 3)).toBe(true);
    expect(waters.some((x) => x.id === waterBeliefId(cellOf(w, x.x, x.y)))).toBe(true);
  });
});

describe('drinking at the well', () => {
  it('a thirsty person who has seen the well drinks there instead of walking thirty tiles to the lake', () => {
    const s = stage('well-drink');
    const p = addPerson(s, 'Ola', 44, 44, { thirst: 35 });
    const w = done(s);
    createBuilding(w, 'well', 47, 47, 0);
    run(w, 30); // she looks round and sees it
    const drankAt: { x: number; y: number }[] = [];
    let before = p.needs.thirst;
    let northmost = 99;
    run(w, 500, () => {
      if (p.needs.thirst > before + 1) drankAt.push({ x: p.x, y: p.y });
      before = p.needs.thirst;
      northmost = Math.min(northmost, p.y);
    });
    expect(p.needs.thirst).toBeGreaterThan(60);
    expect(drankAt.length).toBeGreaterThan(5);
    for (const at of drankAt) expect(Math.hypot(at.x - 47.5, at.y - 47.5)).toBeLessThan(3); // every sip was at the well
    expect(northmost).toBeGreaterThan(36); // she never headed for the lake, thirty tiles to the north
    expect(conservationReport(w).ok).toBe(true);
  });

  it('water drawn for the household is entered in the books as drawn from the well, and it creates only what is carried off', () => {
    const s = stage('well-fetch');
    const p = addPerson(s, 'Ola', 44, 44);
    const w = done(s);
    createBuilding(w, 'well', 46, 46, 0);
    run(w, 30);
    startActivity(w, p, newActivity(w, p, { kind: 'fetch_water', label: 'Fetching water', goal: 'test', targetId: waterBeliefId(cellOf(w, 46, 47)), targetType: 'water', tx: 46.5, ty: 47.5, spotX: 46.5, spotY: 47.5, amount: 3, utility: 50, minCommit: 60, maxTicks: 600 }));
    run(w, 400);
    expect(p.inv.water ?? 0).toBeGreaterThanOrEqual(1);
    expect(w.ledger.reasons['+water drawn from the well']).toBe(p.inv.water ?? 0);
    expect(w.ledger.reasons['+water drawn from the lake'] ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });
});

describe('the well as a project', () => {
  it('belongs to everyone, is raised as a shared project, may only be built once, and is mended with stone', () => {
    const s = stage('well-owner');
    const p = addPerson(s, 'Ola', 44, 44);
    const w = done(s);
    expect(isFacilityType('well')).toBe(true);
    expect(BUILD_DEF.well.cost).toEqual({ wood: 4, stone: 8 });
    expect(REPAIR_USES.well).toBe('stone');
    expect(siteConflict(w, 'well', p.hhId)).toBeNull();
    const st = site(s, 'well', 50, 50, p.hhId, p.id);
    expect(siteConflict(w, 'well', p.hhId)).toMatch(/already being built/);
    expect(st.type).toBe('well');
    createBuilding(w, 'well', 54, 54, 0);
    expect(siteConflict(w, 'well', p.hhId)).toMatch(/already a well|already being built/);
  });

  it('the inspector describes it as what it is: nothing is made here, nothing stored', () => {
    const s = stage('well-card');
    addPerson(s, 'Ola', 44, 44);
    const w = done(s);
    const b = createBuilding(w, 'well', 50, 50, 0);
    const sections = describeFacility(w, b);
    expect(sections.map((x) => x.title)).toEqual(['What it is for', 'Who may use it', 'Now']);
    expect(JSON.stringify(sections)).toMatch(/Open to everyone/);
  });

  it('survives saving and loading: the loaded world still treats the tile as water', () => {
    const s = stage('well-save');
    addPerson(s, 'Ola', 44, 44);
    const w = done(s);
    createBuilding(w, 'well', 50, 50, 0);
    const copy = deserializeWorld(serializeWorld(w));
    expect(isWell(copy, 50, 50)).toBe(true);
    expect(isWaterAccess(copy, 50, 51)).toBe(true);
    expect(copy.accessCell[cellOf(copy, 50, 51)]).toBe(w.accessCell[cellOf(w, 50, 51)]);
  });
});

describe('wanting a well', () => {
  const wantsWell = (home: { x: number; y: number }, extra: (w: World, p: Person) => void = () => {}): boolean => {
    const s = stage('well-want-' + home.y);
    const p = settled(s, 'Ola', home.x, home.y);
    const hut = building(s, 'hut', home.x, home.y, p.hhId);
    const w = done(s);
    w.households.find((h) => h.id === p.hhId)!.homeId = hut.id;
    w.tick = DAY * 7;
    knowTheNeighbourhood(w, p);
    observe(w, p, hut);
    extra(w, p);
    return facilityWants(makeCtx(w, p, false)).some((x) => x.type === 'well');
  };

  it('is wanted by someone whose home is a long walk from any water they know of', () => {
    expect(wantsWell({ x: 44, y: 44 })).toBe(true);
  });

  it('is not wanted by someone who lives by the water', () => {
    expect(wantsWell({ x: 44, y: 18 })).toBe(false);
  });

  it('is wanted at a middling distance only when the shore has proved dangerous: being driven off it', () => {
    expect(wantsWell({ x: 44, y: 24 })).toBe(false);
    const driven = wantsWell({ x: 44, y: 24 }, (w, p) => {
      const id = (p.bykind.water ?? [])[0];
      p.failures[id] = { tick: w.tick - 400, reason: 'a wolf drove me off', count: 2 };
    });
    expect(driven).toBe(true);
  });

  it('is not wanted in the first days, and not once one is standing or being built', () => {
    const s = stage('well-early');
    const p = settled(s, 'Ola', 44, 44);
    const hut = building(s, 'hut', 44, 44, p.hhId);
    const w = done(s);
    w.households.find((h) => h.id === p.hhId)!.homeId = hut.id;
    knowTheNeighbourhood(w, p);
    observe(w, p, hut);
    w.tick = DAY * 2;
    expect(facilityWants(makeCtx(w, p, false)).some((x) => x.type === 'well')).toBe(false);
    w.tick = DAY * 7;
    expect(facilityWants(makeCtx(w, p, false)).some((x) => x.type === 'well')).toBe(true);
    const well = createBuilding(w, 'well', 50, 50, 0);
    observe(w, p, well);
    expect(facilityWants(makeCtx(w, p, false)).some((x) => x.type === 'well')).toBe(false);
  });

  it('is laid out well away from the shore, in the middle of the village', () => {
    const s = stage('well-spot');
    const p = addPerson(s, 'Ola', 44, 30);
    const w = done(s);
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) if (Math.hypot(x - 44, y - 24) < 14) p.explored[y * w.W + x] = 1;
    const near = findBuildSpot(w, p, 'well', 44, 22, 0, 6, 3);
    const far = findBuildSpot(w, p, 'well', 44, 22, 0, 6, 3, 6);
    expect(near).not.toBeNull();
    expect(far).not.toBeNull();
    // the default keeps off the shore; asking for more keeps a good distance from it
    const wd = (c: { x: number; y: number }) => w.waterDist[c.y * w.W + c.x];
    expect(wd(far!)).toBeGreaterThanOrEqual(7);
    expect(wd(near!)).toBeGreaterThanOrEqual(2);
  });
});

describe('from wanting a well to drinking from it', () => {
  it('three people who live far from the water, one of them carrying the stone and wood, lay one out, supply it, build it, and it is water', () => {
    const s = stage('well-pipeline');
    const people = [0, 1, 2].map((i) => addPerson(s, 'P' + i, 44 + i, 44, { traits: { diligence: 0.95, curiosity: 0.8, generosity: 0.8, sociability: 0.7 }, inv: i === 0 ? { berries: 12, wood: 6, stone: 10 } : { berries: 12 } }));
    const huts = people.map((p, i) => building(s, 'hut', 40 + i * 4, 40, p.hhId));
    for (let i = 0; i < 4; i++) makeSource(s.w, 'tree', 47 + i, 52, 6);
    makeSource(s.w, 'rock', 38, 49, 3);
    const w = done(s);
    people.forEach((p, i) => {
      w.households.find((h) => h.id === p.hhId)!.homeId = huts[i].id;
      for (const e of [...w.sources, ...w.buildings]) if (Math.hypot(e.x - 44, e.y - 44) < 16) observe(w, p, e);
      putBelief(p, { id: waterBeliefId(cellOf(w, 44, 14)), kind: 'water', x: 44.5, y: 14.5, amount: 0, max: 0, seen: -10, src: 'seen', from: 0, learned: -10 });
    });
    w.tick = DAY * 7;
    run(w, 1500);
    const well = w.buildings.find((b) => b.type === 'well');
    expect(well, 'a well was built').toBeTruthy();
    expect(w.sites.filter((x) => x.type === 'well')).toHaveLength(0);
    expect(w.buildings.filter((b) => b.type === 'well')).toHaveLength(1);
    expect(well!.hhId).toBe(0); // everyone's
    expect(isWater(w, well!.x, well!.y)).toBe(true);
    expect(Math.hypot(well!.x - w.camp.x, well!.y - w.camp.y)).toBeLessThan(11); // in the middle of the village
    expect(w.waterDist[well!.y * w.W + well!.x]).toBeGreaterThanOrEqual(6); // and nowhere near the lake
    expect(w.ledger.reasons['-construction: well']).toBe(12); // the 4 wood and 8 stone it costs, entered in the books as used
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });
});

describe('what a person decides when there is a well', () => {
  it('the nearest water wins: a thirsty person near the well is offered the well, not the lake', () => {
    const s = stage('well-choice');
    const p = addPerson(s, 'Ola', 44, 44, { thirst: 30 });
    const w = done(s);
    const b = createBuilding(w, 'well', 47, 47, 0);
    run(w, 30);
    const drink = generateOptions(w, p).options.find((o) => o.kind === 'drink');
    expect(drink).toBeTruthy();
    const act = drink!.make!()!;
    expect(Math.hypot(act.spotX - (b.x + 0.5), act.spotY - (b.y + 0.5))).toBeLessThan(3);
  });
});
