// Rules 202: a swap that feeds, and a fire kept for the gathering; two separately switched parts (src/sim/swap_and_fire.ts). Every
// situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour; the ordinary-world origin is
// docs/MECHANISM_CENSUS_20261111.md. Each check has the rules-201 contrast so the older behaviour is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { dayFraction } from '../src/sim/environment';
import { callOccasion } from '../src/sim/occasions';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import { GATHERING_FUEL, GATHERING_WEIGHT, SWAP_FIRE_PARTS, SWAP_RELIEF_CAP, setSwapAndFire, swapReliefWorth } from '../src/sim/swap_and_fire';
import { addPerson, building, done, learn, pin, stage } from './helpers/kit';
import type { Option } from '../src/sim/optutil';

afterEach(() => setSwapAndFire(true));

const BEFORE = 201;
const SAVES = 'it would save me the walk to food';
const GATHERING = 'a gathering is called at this fire';
function world(version: number, dynamics: 'rich' | 'authored' = 'rich', tag = '') {
  const s = stage(`swap-fire-${version}-${dynamics}-${tag}`);
  s.w.settings = { ...s.w.settings, dynamics, rulesVersion: version };
  return s;
}
function tickAt(frac: number): number {
  for (let t = 3 * DAY; t < 4 * DAY; t++) if (Math.abs(dayFraction(t) - frac) < 0.0005) return t;
  throw new Error('no such time of day');
}
const part = (o: Option | undefined, label: string): number | undefined => o?.parts.find((x) => x[0] === label)?.[1];

describe('rules 202 is registered', () => {
  it('is registered and supported (the current version may be later), with two parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(202);
    expect(SUPPORTED_RULES_VERSIONS).toContain(202);
    expect(SWAP_FIRE_PARTS).toEqual(['swap', 'fire']);
  });
});

describe('swap: a swap for food is worth the walk it saves', () => {
  it('the rule: nothing at 201; at 202 the walking cost to known food, capped, only for food and only when hungry', () => {
    const old = world(BEFORE).w, now = world(202).w;
    expect(swapReliefWorth(old, true, 30, 50)).toBe(0);
    expect(swapReliefWorth(now, true, 30, 5)).toBe(5);
    expect(swapReliefWorth(now, true, 30, 50)).toBe(SWAP_RELIEF_CAP);
    expect(swapReliefWorth(now, false, 30, 50)).toBe(0);
    expect(swapReliefWorth(now, true, 0, 50)).toBe(0);
    setSwapAndFire(false, 'swap');
    expect(swapReliefWorth(now, true, 30, 50)).toBe(0);
    setSwapAndFire(true, 'swap');
    expect(swapReliefWorth(world(202, 'authored').w, true, 30, 50)).toBe(0);
  });

  /** Hal, hungry, no food, four wood to spare, beside his friend Ida who carries berries; optionally a berry bush he knows three tiles off. */
  function swap(version: number, opts: { hunger?: number; bush?: boolean } = {}): Option | undefined {
    const s = world(version, 'rich', `swap-${opts.hunger ?? 50}-${opts.bush ? 'bush' : 'none'}`);
    const hal = addPerson(s, 'Hal', 40.5, 40.5, { age: 30, hunger: opts.hunger ?? 50, thirst: 95, energy: 95, inv: { wood: 4 } });
    const ida = addPerson(s, 'Ida', 42.5, 40.5, { age: 30, hunger: 95, thirst: 95, energy: 95, inv: { berries: 4 } });
    const bush = opts.bush ? makeSource(s.w, 'berry_bush', 43, 43, 6) : null;
    const w = done(s);
    w.tick = tickAt(0.45);
    pin(ida);
    hal.needs.warmth = 95; hal.needs.safety = 95;
    relOf(hal, ida.id).affinity = 30; relOf(hal, ida.id).familiarity = 30;
    learn(w, hal, ida);
    if (bush) learn(w, hal, bush);
    return generateOptions(w, hal, true, true).options.find((o) => o.key.startsWith(`socialize:${ida.id}:trade`));
  }

  it('the option itself: a hungry man with wood, no food known, beside a friend with berries: the swap gains the cap at 202 and nothing at 201', () => {
    const before = swap(BEFORE), after = swap(202);
    expect(before, 'the staging offers the swap at 201').toBeTruthy();
    expect(after).toBeTruthy();
    expect(part(before, SAVES)).toBeUndefined();
    expect(part(after, SAVES)).toBe(SWAP_RELIEF_CAP);
    expect(after!.util - before!.util).toBeCloseTo(SWAP_RELIEF_CAP, 6);
  });

  it('with a bush he knows three tiles off the swap gains less than the cap, and with the switch off nothing', () => {
    const near = swap(202, { bush: true });
    expect(near, 'the staging still offers the swap when a bush is known').toBeTruthy();
    expect(part(near, SAVES) ?? 0).toBeLessThan(SWAP_RELIEF_CAP);
    setSwapAndFire(false, 'swap');
    expect(part(swap(202), SAVES)).toBeUndefined();
  });
});

describe('fire: fed for the gathering', () => {
  /** Jon, three wood in his pack, by a fire he knows at the given fuel, in clear daylight; optionally an occasion called at it today. */
  function fuel(version: number, opts: { fuel?: number; occasion?: 'harvest' | 'funeral' | null } = {}): Option | undefined {
    const s = world(version, 'rich', `fire-${opts.fuel ?? 300}-${opts.occasion ?? 'none'}`);
    const jon = addPerson(s, 'Jon', 42.5, 46.5, { age: 30, hunger: 98, thirst: 98, energy: 95, inv: { wood: 3 } });
    const fire = building(s, 'fire', 44, 44);
    fire.fuel = opts.fuel ?? 300;
    const w = done(s);
    w.tick = tickAt(0.45);
    w.light = 1; w.weather.rain = 0; w.weather.temp = 18;
    jon.needs.warmth = 95; jon.needs.safety = 95;
    learn(w, jon, fire);
    if (opts.occasion === 'harvest') callOccasion(w, 'harvest', [], 0.55); // later the same day, inside the lead
    if (opts.occasion === 'funeral') callOccasion(w, 'funeral', [987654], 0.55); // a death Jon has not learned of
    return generateOptions(w, jon, true, true).options.find((o) => o.key === `fuel:${fire.id}`);
  }

  it('a fire at 300 believed fuel in clear daylight is not worth feeding at 201, feast or no feast; at 202 it is when a feast is called at it', () => {
    expect(fuel(BEFORE, { occasion: 'harvest' })).toBeUndefined();
    expect(fuel(BEFORE)).toBeUndefined();
    const fed = fuel(202, { occasion: 'harvest' });
    expect(fed).toBeTruthy();
    expect(part(fed, GATHERING)).toBe(GATHERING_WEIGHT);
    expect(fuel(202)).toBeUndefined();
  });

  it('above the gathering level nothing changes, a low fire is fed at both versions as before, and a funeral he has not heard of is no reason', () => {
    expect(GATHERING_FUEL).toBe(400);
    expect(fuel(202, { fuel: 450, occasion: 'harvest' })).toBeUndefined();
    const lowBefore = fuel(BEFORE, { fuel: 100 }), lowNow = fuel(202, { fuel: 100 });
    expect(lowBefore).toBeTruthy();
    expect(lowNow).toBeTruthy();
    expect(part(lowNow, GATHERING)).toBeUndefined();
    expect(fuel(202, { occasion: 'funeral' })).toBeUndefined();
  });

  it('with the switch off a rules-202 world leaves the fire as at 201', () => {
    setSwapAndFire(false, 'fire');
    expect(fuel(202, { occasion: 'harvest' })).toBeUndefined();
  });
});
