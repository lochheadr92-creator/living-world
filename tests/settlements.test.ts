// A world with more than one settlement: "the camp" in the rules of the world becomes "the settlement nearest to here".
// (With a single settlement every one of these is the camp itself; tests/golden.test.ts holds that nothing changed for that world.)
import { describe, expect, it } from 'vitest';
import { placeWords } from '../src/sim/dialogue';
import { findPlotSpot } from '../src/sim/farming';
import { immigrationTick } from '../src/sim/lifecycle';
import { makeCtx } from '../src/sim/optutil';
import { settlementAnchor } from '../src/sim/options_work';
import { addSettlement, baseHub, fireNear, hubWithin, nearestHub, settlementCount } from '../src/sim/settlements';
import type { Belief } from '../src/sim/types';
import { makeWolf, newWander } from '../src/sim/wildlife';
import { addPerson, building, done, stage } from './helpers/kit';

/** the staged flat world has its camp at (43.5, 43.5); a second settlement goes in the south-east corner */
const SECOND = { x: 70, y: 70 };

function twoSettlements(name: string, second = true) {
  const s = stage(name);
  const w = done(s);
  if (second) addSettlement(w, SECOND.x, SECOND.y);
  return { s, w };
}

describe('settlements', () => {
  it('a world with one settlement is the camp, and every lookup returns the camp itself', () => {
    const { w } = twoSettlements('one-camp', false);
    expect(settlementCount(w)).toBe(1);
    expect(nearestHub(w, 70, 70)).toBe(w.camp);
    expect(nearestHub(w, 1, 1)).toBe(w.camp);
    expect(w.extraSettlements).toBeUndefined(); // so its saves and state hash are as they always were
    expect(hubWithin(w, w.camp.x + 6, w.camp.y, 7)).toBe(true);
    expect(hubWithin(w, w.camp.x + 8, w.camp.y, 7)).toBe(false);
  });

  it('with more, the nearest settlement wins and the camp wins a tie', () => {
    const { w } = twoSettlements('two-hubs');
    expect(settlementCount(w)).toBe(2);
    expect(nearestHub(w, 66, 66)).toBe(w.extraSettlements![0]);
    expect(nearestHub(w, 40, 40)).toBe(w.camp);
    const mid = { x: (w.camp.x + SECOND.x) / 2, y: (w.camp.y + SECOND.y) / 2 };
    expect(nearestHub(w, mid.x, mid.y)).toBe(w.camp);
    expect(hubWithin(w, SECOND.x - 5, SECOND.y, 7)).toBe(true);
  });

  it('a person belongs to the settlement of their home, or of where they are if they have none', () => {
    const { s, w } = twoSettlements('base-hub');
    const homeless = addPerson(s, 'Ola', 68, 66);
    expect(baseHub(w, homeless)).toBe(w.extraSettlements![0]);
    const home = building(s, 'hut', 40, 40, homeless.hhId);
    expect(baseHub(w, homeless, home)).toBe(w.camp); // the home decides, not where they happen to be standing
  });

  it('the camp fire a traveller is told about is the one nearest the settlement they are heading for', () => {
    const { s, w } = twoSettlements('fires');
    const near = building(s, 'fire', 44, 44, 0);
    const far = building(s, 'fire', 72, 70, 0);
    expect(fireNear(w, w.camp)).toBe(near);
    expect(fireNear(w, w.extraSettlements![0])).toBe(far);
  });
});

describe('what "near camp" and "the camp" come to mean with two settlements', () => {
  const berry = { id: 1, kind: 'berry_bush', x: 68, y: 68, amount: 3, max: 6, seen: 0, src: 'seen', from: 0, learned: 0 } as Belief;

  it('a place by the second settlement is described as near it, not as a long way from the first', () => {
    expect(placeWords(twoSettlements('words-one', false).w, berry)).toMatch(/a long way .* of camp/);
    expect(placeWords(twoSettlements('words-two').w, berry)).toBe('near camp');
  });

  it('a person with no home lays out their base, and their first field, around the settlement they are in', () => {
    const s = stage('anchor');
    const p = addPerson(s, 'Ola', 68, 66);
    const w = done(s);
    addSettlement(w, SECOND.x, SECOND.y);
    expect(settlementAnchor(makeCtx(w, p, false))).toEqual(SECOND);
    const spot = findPlotSpot(w, p);
    expect(spot).not.toBeNull();
    expect(Math.hypot(spot!.x - SECOND.x, spot!.y - SECOND.y)).toBeLessThanOrEqual(14);
  });

  it('wolves prowl toward the settlement nearest their den, not always toward the first', () => {
    const prowls = (second: boolean) => {
      const { w } = twoSettlements('wolf-' + second, second);
      if (second) w.extraSettlements![0] = { x: 10, y: 40 }; // north-west, 30 tiles from a den in the south-west
      const wolf = makeWolf(w, 10, 70);
      w.animals.push(wolf);
      w.light = 0; // night
      const xs: number[] = [];
      for (let i = 0; i < 400; i++) {
        newWander(w, wolf);
        // an ordinary wander stays within ten tiles of the den; anything farther is a prowl toward a settlement
        if (Math.hypot(wolf.wanderX - wolf.denX, wolf.wanderY - wolf.denY) > 11) xs.push(wolf.wanderX);
      }
      return xs;
    };
    const withSecond = prowls(true);
    const without = prowls(false);
    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    expect(withSecond.length).toBeGreaterThan(20);
    expect(without.length).toBeGreaterThan(20);
    // the den is at x = 10. The second settlement is due north of it, so prowling goes straight up the map (x stays near 10); the camp is
    // to the north-east, so prowling toward it moves east
    expect(mean(withSecond)).toBeLessThan(15);
    expect(mean(without)).toBeGreaterThan(22);
  });
});

describe('travellers', () => {
  function arrival(name: string, second: boolean) {
    const s = stage(name);
    for (let i = 0; i < 4; i++) addPerson(s, 'P' + i, 42 + i, 44, { inv: { berries: 12 } });
    building(s, 'lean_to', 40, 40, 0);
    const w = done(s);
    if (second) addSettlement(w, SECOND.x, SECOND.y);
    w.tick = 5000;
    w.settings.immigration = true;
    const before = new Set(w.persons.map((p) => p.id));
    for (let i = 0; i < 600 && !w.stats.arrivals; i++) immigrationTick(w);
    return { w, newcomers: w.persons.filter((p) => !before.has(p.id)) };
  }

  it('make for the settlement nearest where they come in', () => {
    let toSecond = 0;
    let toCamp = 0;
    for (let i = 0; i < 24; i++) {
      const { w, newcomers } = arrival('arrive-' + i, true);
      if (newcomers.length === 0) continue;
      const lone = newcomers[0];
      const hub = nearestHub(w, lone.x, lone.y);
      const a = lone.activity!;
      expect(Math.hypot(a.tx - hub.x, a.ty - (hub.y + 3)), `arrival ${i} at (${lone.x.toFixed(0)}, ${lone.y.toFixed(0)})`).toBeLessThan(4.5);
      if (hub === w.camp) toCamp++;
      else toSecond++;
    }
    expect(toSecond).toBeGreaterThan(0);
    expect(toCamp).toBeGreaterThan(0);
  }, 120_000);

  it('still make for the camp when it is the only settlement', () => {
    for (let i = 0; i < 6; i++) {
      const { w, newcomers } = arrival('arrive-one-' + i, false);
      if (newcomers.length === 0) continue;
      const a = newcomers[0].activity!;
      expect(Math.hypot(a.tx - w.camp.x, a.ty - (w.camp.y + 3))).toBeLessThan(4.5);
    }
  }, 120_000);
});
