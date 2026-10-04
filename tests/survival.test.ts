import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding, makeHousePile } from '../src/sim/buildings';
import { reviewActivity } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { putBelief, waterBeliefId } from '../src/sim/knowledge';
import { conceptionTick, immigrationTick } from '../src/sim/lifecycle';
import { fleeRadius, makeCtx, rankWaterSpots } from '../src/sim/optutil';
import { stageOf } from '../src/sim/people';
import { spark } from '../src/sim/relations';
import { RNG, hashString } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import type { Person, World } from '../src/sim/types';
import { T } from '../src/sim/types';
import { computeWaterDist } from '../src/sim/worldgen';
import { makeWolf } from '../src/sim/wildlife';
import { natural, run, settingsFor } from './helpers/util';

/** a flat test world with the lake along the north edge; the camp (and the camera) is in the middle */
function lakeWorld(name: string, scene: 'help' | 'natural' = 'help') {
  const w = testKit.flatWorld(settingsFor(name, { scene }));
  return { w, rng: new RNG(hashString(name)) };
}

/** the person knows these stretches of shore (all of it, unless a filter says otherwise) */
function learnShore(w: World, p: Person, keep: (x: number, y: number) => boolean = () => true): void {
  for (let i = 0; i < w.accessCell.length; i++) {
    const t = w.accessCell[i];
    if (t < 0) continue;
    const x = (t % w.W) + 0.5;
    const y = Math.floor(t / w.W) + 0.5;
    if (keep(x, y)) putBelief(p, { id: waterBeliefId(i), kind: 'water', x, y, amount: 0, max: 0, seen: -10, src: 'seen', from: 0, learned: -10 });
  }
}

/** a wolf that sits at its den and never moves: the worst case for anyone who needs what is near it */
function stillWolf(w: World, x: number, y: number) {
  const wolf = makeWolf(w, x, y);
  wolf.state = 'retreat';
  wolf.until = 1e9;
  return wolf;
}

describe('staying alive: water, wolves and competing needs', () => {
  it('a wolf lingering right beside the only water they know does not keep a thirsty person from ever drinking', () => {
    const { w, rng } = lakeWorld('wolf-at-the-pond');
    // a small pond instead of a long shore: it is the only water there is, and every spot on its bank is within sight of the den
    for (let y = 0; y < w.H; y++) {
      for (let x = 0; x < w.W; x++) w.terrain[y * w.W + x] = x >= 42 && x <= 47 && y >= 10 && y <= 13 ? T.DEEP : T.GRASS;
    }
    computeWaterDist(w);
    const tess = testKit.addPerson(w, rng, { name: 'Tess', x: 44.5, y: 30.5, thirst: 24, hunger: 85, energy: 90 });
    testKit.finish(w, 'help');
    learnShore(w, tess);
    stillWolf(w, 44.5, 17.5); // its den is right on the pond's southern shore
    let drinks = 0;
    let wasDrinking = false;
    let minHealth = 100;
    run(w, 2800, () => {
      const drinking = tess.activity?.kind === 'drink' && tess.activity.phase === 'work';
      if (drinking && !wasDrinking) drinks++;
      wasDrinking = drinking;
      minHealth = Math.min(minHealth, tess.health);
    });
    expect(tess.alive).toBe(true);
    expect(drinks, 'she managed to drink').toBeGreaterThan(0);
    expect(minHealth, 'she got to the water before thirst began to hurt her').toBeGreaterThanOrEqual(98);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('picks a stretch of shore away from a wolf that has been seen beside the nearest one', () => {
    const { w, rng } = lakeWorld('shore-choice');
    const tess = testKit.addPerson(w, rng, { name: 'Tess', x: 44.5, y: 24.5, thirst: 30, hunger: 85 });
    testKit.finish(w, 'help');
    learnShore(w, tess);
    const wolf = stillWolf(w, 44.5, 17.5);
    run(w, 12); // she sees it
    expect((tess.bykind.danger ?? []).length, 'she has seen the wolf').toBeGreaterThan(0);
    const best = rankWaterSpots(makeCtx(w, tess, false), 2);
    expect(best).toHaveLength(2);
    expect(Math.hypot(best[0].b.x - wolf.x, best[0].b.y - wolf.y), 'first choice is well away from the wolf').toBeGreaterThan(9);
    expect(Math.hypot(best[0].b.x - best[1].b.x, best[0].b.y - best[1].b.y), 'the second choice is somewhere else along the shore').toBeGreaterThan(7);
  });

  it('a remembered drinking place that has since been built over is replaced by the nearest usable shore', () => {
    const { w, rng } = lakeWorld('built-over-shore');
    const tess = testKit.addPerson(w, rng, { name: 'Tess', x: 44.5, y: 30.5, thirst: 22, hunger: 85 });
    testKit.finish(w, 'help');
    learnShore(w, tess);
    // every shore tile she remembers is now occupied (a hut, a tree, a field fence...)
    for (const id of tess.bykind.water ?? []) {
      const b = tess.beliefs[id];
      const i = Math.floor(b.y) * w.W + Math.floor(b.x);
      w.solid[i] = 1;
      w.occ[i] = 999999;
    }
    let maxThirst = 0;
    run(w, 1500, () => {
      maxThirst = Math.max(maxThirst, tess.needs.thirst);
    });
    expect(tess.alive).toBe(true);
    expect(maxThirst, 'she found somewhere else along the shore to drink').toBeGreaterThan(70);
  });

  it('dying of thirst outranks being cold: an activity serving a lesser critical need yields', () => {
    const { w, rng } = lakeWorld('two-criticals');
    const p = testKit.addPerson(w, rng, { name: 'Pia', x: 44.5, y: 30.5, thirst: 9, hunger: 70, energy: 60 });
    testKit.finish(w, 'help');
    learnShore(w, p);
    p.needs.warmth = 8;
    startActivity(w, p, newActivity(w, p, { kind: 'rest', label: 'Sheltering', goal: 'to get warm', need: 'warmth', here: true, minCommit: 5, maxTicks: 400 }));
    expect(makeCtx(w, p, false).criticals).toEqual(expect.arrayContaining(['thirst', 'warmth']));
    p.nextThink = w.tick;
    reviewActivity(w, p);
    expect(p.activity?.kind).toBe('drink');
  });

  it('thirst is pressing sooner when the nearest known water is a long walk away', () => {
    const { w, rng } = lakeWorld('plan-ahead');
    const near = testKit.addPerson(w, rng, { name: 'Near', x: 44.5, y: 24.5, thirst: 30, hunger: 85 });
    const far = testKit.addPerson(w, rng, { name: 'Far', x: 44.5, y: 76.5, thirst: 30, hunger: 85 });
    testKit.finish(w, 'help');
    learnShore(w, near);
    learnShore(w, far);
    expect(makeCtx(w, near, false).criticals).not.toContain('thirst');
    expect(makeCtx(w, far, false).criticals).toContain('thirst');
  });

  it('desperate people hold their ground longer than comfortable ones', () => {
    const { w, rng } = lakeWorld('flee-radius');
    const calm = testKit.addPerson(w, rng, { name: 'Calm', x: 40.5, y: 40.5, thirst: 80, hunger: 80 });
    const parched = testKit.addPerson(w, rng, { name: 'Parched', x: 42.5, y: 40.5, thirst: 2, hunger: 80 });
    expect(fleeRadius(calm)).toBeCloseTo(12.5, 5);
    expect(fleeRadius(parched)).toBeLessThan(4);
    expect(fleeRadius(parched)).toBeGreaterThanOrEqual(2.5);
  });
});

describe('what the dead leave behind', () => {
  it('belongings left on the ground are picked up and put to use, and nothing goes missing', () => {
    const { w, rng } = lakeWorld('salvage', 'natural');
    const heir = testKit.addPerson(w, rng, { name: 'Heir', x: 43.5, y: 43.5, hunger: 90, thirst: 90, energy: 90 });
    makeHousePile(w, 48, 44, { wood: 3, axe: 1, berries: 2 }, 'old belongings');
    testKit.finish(w, 'natural');
    expect(w.piles).toHaveLength(1);
    run(w, 900);
    expect(heir.inv.axe ?? 0, 'she took the axe').toBe(1);
    expect((heir.inv.wood ?? 0) + (heir.inv.berries ?? 0), 'and the rest of what she could use').toBeGreaterThan(0);
    expect(w.piles.every((pile) => (pile.items.axe ?? 0) === 0)).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('neighbours', () => {
  it('a generous neighbour with wood to spare mends the failing home of an elder who cannot manage it', () => {
    const { w, rng } = lakeWorld('neighbourly', 'natural');
    const elder = testKit.addPerson(w, rng, { name: 'Old Ines', x: 51.5, y: 41.5, age: 74, hunger: 85, thirst: 85, energy: 80 });
    const hut = createBuilding(w, 'lean_to', 52, 41, elder.hhId);
    w.households.find((h) => h.id === elder.hhId)!.homeId = hut.id;
    hut.condition = 18;
    const helper = testKit.addPerson(w, rng, { name: 'Helper', x: 46.5, y: 43.5, sex: 'm', age: 30, hunger: 90, thirst: 90, energy: 90, inv: { wood: 4 }, traits: { generosity: 0.85, diligence: 0.8 } });
    testKit.finish(w, 'natural');
    testKit.befriend(elder, helper, 20, 30);
    let repairs = 0;
    let wasRepairing = false;
    run(w, 1500, () => {
      const repairing = helper.activity?.kind === 'repair' && helper.activity.phase === 'work';
      if (repairing && !wasRepairing) repairs++;
      wasRepairing = repairing;
    });
    expect(repairs, 'the neighbour set to work on it').toBeGreaterThan(0);
    expect(hut.condition, 'the roof is sounder than it was').toBeGreaterThan(40);
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('a living population: couples, children and newcomers', () => {
  it('only a woman with a male partner conceives', () => {
    const { w, rng } = lakeWorld('conception', 'natural');
    const home = createBuilding(w, 'lean_to', 44, 40, 0);
    const mk = (name: string, sex: 'f' | 'm', x: number, hh?: number) => testKit.addPerson(w, rng, { name, sex, x, y: 44.5, age: 26, hunger: 90, thirst: 90, inv: { berries: 8 }, hh });
    const ann = mk('Ann', 'f', 40.5);
    const bob = mk('Bob', 'm', 41.5, ann.hhId);
    const cat = mk('Cat', 'f', 50.5);
    const dee = mk('Dee', 'f', 51.5, cat.hhId);
    for (const [a, b] of [[ann, bob], [cat, dee]] as const) {
      a.partnerId = b.id;
      b.partnerId = a.id;
    }
    w.households.find((h) => h.id === ann.hhId)!.homeId = home.id;
    w.households.find((h) => h.id === cat.hhId)!.homeId = home.id;
    testKit.finish(w, 'natural');
    for (let i = 0; i < 1500; i++) {
      w.tick += 200;
      conceptionTick(w);
    }
    expect(ann.pregnantUntil, 'a woman with a male partner conceives in time').toBeGreaterThan(0);
    expect(cat.pregnantUntil, 'no conception without a male partner').toBe(0);
  });

  it('a settlement that is doing well draws newcomers, who can reach the camp even when its centre has been built over', () => {
    const w = natural('newcomers');
    run(w, 5200);
    // build over the middle of the camp, where the first travellers used to be sent
    createBuilding(w, 'lean_to', Math.floor(w.camp.x), Math.floor(w.camp.y) + 3, 0);
    const before = w.persons.length;
    const arrivalsBefore = w.stats.arrivals ?? 0;
    w.stats.lastArrival = -99999;
    for (let i = 0; i < 120 && (w.stats.arrivals ?? 0) === arrivalsBefore; i++) immigrationTick(w);
    expect(w.stats.arrivals ?? 0).toBe(arrivalsBefore + 1);
    const newcomers = w.persons.slice(before);
    expect(newcomers.length).toBeGreaterThanOrEqual(1);
    for (const traveller of newcomers) {
      expect(traveller.activity?.kind).toBe('explore');
      const start = Math.hypot(traveller.x - w.camp.x, traveller.y - w.camp.y);
      run(w, 1);
      void start;
    }
    const starts = newcomers.map((q) => Math.hypot(q.x - w.camp.x, q.y - w.camp.y));
    run(w, 90);
    newcomers.forEach((q, i) => {
      expect(q.activity?.blocked ?? '', 'the way in is open').toBe('');
      expect(Math.hypot(q.x - w.camp.x, q.y - w.camp.y), 'they are making their way toward the camp').toBeLessThan(starts[i] - 3);
    });
    expect(conservationReport(w).ok).toBe(true);
  });

  it('couples and families can arrive together, already bound to each other', () => {
    const w = natural('arriving-together');
    run(w, 5200);
    const seenKinds = new Set<string>();
    for (let round = 0; round < 40; round++) {
      const before = w.persons.length;
      w.stats.lastArrival = -99999;
      for (let i = 0; i < 120; i++) {
        const arrivals = w.stats.arrivals ?? 0;
        immigrationTick(w);
        if ((w.stats.arrivals ?? 0) > arrivals) break;
      }
      const group = w.persons.slice(before);
      if (group.length === 1) seenKinds.add('single');
      if (group.length === 2) {
        seenKinds.add('couple');
        expect(group[0].partnerId).toBe(group[1].id);
        expect(group[0].hhId).toBe(group[1].hhId);
        expect(group[0].sex).not.toBe(group[1].sex);
      }
      if (group.length === 3) {
        seenKinds.add('family');
        const kid = group[2];
        expect(stageOf(w, kid)).toBe('child');
        expect(kid.parents.sort()).toEqual([group[0].id, group[1].id].sort());
        expect(group[0].children).toContain(kid.id);
        expect(kid.hhId).toBe(group[0].hhId);
        expect(kid.relations[group[0].id].kin).toBe('parent');
      }
      if (w.persons.length > 50) break;
    }
    expect(seenKinds.has('single')).toBe(true);
    expect(seenKinds.has('couple') || seenKinds.has('family')).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('pairs with a spark between them warm to each other faster than pairs without one', () => {
    const { w, rng } = lakeWorld('sparks-and-friends', 'natural');
    const people = Array.from({ length: 12 }, (_, i) =>
      testKit.addPerson(w, rng, { name: 'P' + i, x: 38.5 + (i % 4) * 1.6, y: 43.5 + Math.floor(i / 4) * 1.6, sex: i % 2 === 0 ? 'f' : 'm', age: 22 + (i % 5), hunger: 90, thirst: 90, inv: { berries: 6 }, traits: { sociability: 0.8 } }),
    );
    testKit.finish(w, 'natural');
    run(w, 2400);
    let sparked = 0;
    let sparkedN = 0;
    let other = 0;
    let otherN = 0;
    for (const a of people) {
      for (const b of people) {
        if (a === b || a.relations[b.id]?.kin === 'partner') continue;
        const r = a.relations[b.id];
        if (!r) continue;
        if (spark(a, b)) {
          sparked += r.affinity;
          sparkedN++;
        } else {
          other += r.affinity;
          otherN++;
        }
      }
    }
    expect(sparkedN).toBeGreaterThan(0);
    expect(otherN).toBeGreaterThan(0);
    expect(sparked / sparkedN, 'sparked pairs end up closer').toBeGreaterThan(other / otherN + 1.5);
  });

  it('two unattached adults with a spark between them and a growing bond become a couple, and then share a household', () => {
    const { w, rng } = lakeWorld('romance', 'natural');
    const names = ['Una', 'Vic', 'Wren', 'Xan', 'Yara', 'Zed'];
    const people = names.map((n, i) => testKit.addPerson(w, rng, { name: n, x: 40.5 + (i % 3) * 1.4, y: 44.5 + Math.floor(i / 3) * 1.4, sex: i % 2 === 0 ? 'f' : 'm', age: 24 + i, hunger: 90, thirst: 90, inv: { berries: 6 } }));
    const hut = createBuilding(w, 'hut', 44, 38, 0);
    let pair: readonly [Person, Person] | null = null;
    for (const a of people) for (const b of people) if (!pair && a.sex === 'f' && b.sex === 'm' && spark(a, b)) pair = [a, b];
    expect(pair, 'there is a sparked pair among six people').toBeTruthy();
    const [a, b] = pair!;
    w.households.find((h) => h.id === a.hhId)!.homeId = hut.id;
    testKit.finish(w, 'natural');
    testKit.befriend(a, b, 44, 40);
    run(w, 2400);
    expect(a.partnerId).toBe(b.id);
    expect(b.partnerId).toBe(a.id);
    expect(a.hhId).toBe(b.hhId);
    expect(w.events.some((e) => /became a couple/.test(e.text) && e.ids.includes(a.id) && e.ids.includes(b.id))).toBe(true);
  });
});
