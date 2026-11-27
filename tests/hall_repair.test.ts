// Rules 281 (src/sim/hall_repair.ts): news at the hall, a meal spot one can stand on, an evening at the hall. STAGED: each checks a rule, not how often.
import { afterEach, describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { dayFraction } from '../src/sim/environment';
import { HALL_PARTS, hallNewsPhase, setHall, standableMealSpot } from '../src/sim/hall_repair';
import { isWalkable } from '../src/sim/registry';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, stage } from './helpers/kit';

afterEach(() => setHall(true));
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);

function scene(version: number, tag = '') {
  const s = stage(`hall-${version}-${tag}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = at(0.68);
  const ena = addPerson(s, 'Ena', 40, 44, { age: 30, sex: 'f', hunger: 95, thirst: 95, energy: 80 });
  const home = building(s, 'hut', 38, 46, ena.hhId);
  const hall = building(s, 'hall', 44, 40, 0);
  done(s);
  learn(w, ena, home, hall);
  ena.chrono = 0.05;
  return { w, ena, hall };
}

describe('the hall repair (rules 281)', () => {
  it('news: the hall phase is one mealTick runs on at 281, and never was before', () => {
    const reach = (phase: number) => Array.from({ length: 900 }, (_, t) => t).filter((t) => t % 10 === 3 && t % 90 === phase).length;
    expect(hallNewsPhase(scene(280, 'n0').w)).toBe(17);
    expect(reach(17)).toBe(0);
    expect(hallNewsPhase(scene(281, 'n1').w)).toBe(3);
    expect(reach(3)).toBe(10);
  });

  it('table: a meal spot on a tile nobody can stand on moves to the nearest walkable tile at 281, and stays at 280', () => {
    const { w, hall } = scene(281, 't1');
    const inside = { x: hall.x + 1.5, y: hall.y + 1.5 };
    expect(isWalkable(w, Math.floor(inside.x), Math.floor(inside.y))).toBe(false);
    const moved = standableMealSpot(w, inside);
    expect(isWalkable(w, Math.floor(moved.x), Math.floor(moved.y))).toBe(true);
    expect(Math.max(Math.abs(moved.x - inside.x), Math.abs(moved.y - inside.y))).toBeLessThanOrEqual(3);
    const open = { x: hall.x - 3.3, y: hall.y - 3.3 };
    expect(standableMealSpot(w, open)).toEqual(open);
    const old = scene(280, 't0');
    expect(standableMealSpot(old.w, inside)).toEqual(inside);
  });

  it('evening: a free evening may be spent at a hall near home at 281, worth more in the rain; not at 280', () => {
    const offered = (version: number, rain = 0, tag = '') => {
      const sc = scene(version, tag);
      sc.w.weather.rain = rain;
      return generateOptions(sc.w, sc.ena, true).options.find((o) => o.key === 'evening:hall');
    };
    expect(offered(280, 0, 'e0')).toBeUndefined();
    const dry = offered(281, 0, 'e1'), wet = offered(281, 1, 'e2');
    expect(dry?.make).toBeDefined();
    expect(wet!.util).toBeGreaterThan(dry!.util);
    setHall(false, 'evening');
    expect(offered(281, 0, 'e3')).toBeUndefined();
  });

  it('the lab arms remove all three parts or one', () => {
    for (const arm of ['rich-no-hall', ...HALL_PARTS.map((p) => `rich-no-hall-${p}`)]) {
      const iv = parseIntervention(arm);
      expect(iv.spec).toBe(arm);
      iv.install!()();
    }
  });
});
