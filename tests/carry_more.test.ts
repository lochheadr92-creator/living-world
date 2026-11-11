// Rules 204: a basket is worth getting (src/sim/carry_more.ts; wantedTool, the tool's material need, craftOption and optDepositFood in
// options_work.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The ordinary-world
// origin is the mechanism census of rules 196 (about 7 baskets a settlement in 25 days, and "no room in my pack for one wood" the
// largest block on the way to one) and the owner's instruction of 11 November 2026. Each check has the rules-203 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { BASKET_ROOM_WEIGHT, BASKET_WANT_FLOOR, BASKET_WORTH, CARRY_MORE_PARTS, basketRoomShort, basketWant, basketWorth, setCarryMore } from '../src/sim/carry_more';
import { generateOptions } from '../src/sim/decision';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import { addPerson, building, done, give, learn, stage } from './helpers/kit';
import type { Items, Person, World } from '../src/sim/types';

afterEach(() => setCarryMore(true));

const ROOM_TEXT = 'room in my pack for the basket’s wood';
const WORTH_TEXT = 'a basket carries half as much again';
/** Ada, fed and rested, lives alone in a hut she knows and knows three trees. `gathered` is how much she has ever gathered. */
function scene(version: number, opts: { dynamics?: 'rich' | 'authored'; inv?: Items; gathered?: number; age?: number; tag?: string } = {}) {
  const s = stage(`carry-more-${version}-${opts.dynamics ?? 'rich'}-${JSON.stringify(opts.inv ?? {})}-${opts.gathered ?? 0}-${opts.age ?? 30}-${opts.tag ?? ''}`);
  s.w.settings = { ...s.w.settings, dynamics: opts.dynamics ?? 'rich', rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40.5, 26.5, { age: opts.age ?? 30, hunger: 95, thirst: 95, energy: 95, inv: opts.inv ?? {} });
  const home = building(s, 'hut', 40, 24, ada.hhId);
  s.w.households.find((h) => h.id === ada.hhId)!.homeId = home.id;
  const trees = [0, 1, 2].map((i) => makeSource(s.w, 'tree', 46 + i, 30, 8));
  const w = done(s);
  w.tick = 600;
  ada.stats.gathered = opts.gathered ?? 0;
  // staged: an ordinary forager, so that the basket and not an axe or a rod is the tool she would make first
  ada.skills.forage = 1.2; ada.skills.wood = 1; ada.skills.fish = 1;
  learn(w, ada, home, ...trees);
  return { w, ada, home };
}
const all = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const basketWood = (w: World, p: Person) => all(w, p).find((o) => o.kind === 'gather' && `${o.label} ${o.goal}`.includes('to make a basket'));
const basketCraft = (w: World, p: Person) => all(w, p).find((o) => o.key === 'craft:basket');
const foodHome = (w: World, p: Person, homeId: number) => all(w, p).find((o) => o.key === `deposit:${homeId}:food`);
const part = (o: { parts: [string, number][] } | undefined, text: string): number | undefined => o?.parts.find(([k]) => k === text)?.[1];

describe('rules 204 is registered', () => {
  it('is registered and supported (the current version may be later), with three parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(204);
    expect(SUPPORTED_RULES_VERSIONS).toContain(204);
    expect(CARRY_MORE_PARTS).toEqual(['want', 'room', 'worth']);
  });
});

describe('the rules themselves', () => {
  it('want: at 203 only after more than six units gathered; at 204 from the start, never below the floor', () => {
    const old = scene(203).w, now = scene(204).w;
    expect(basketWant(old, 6, 1.2)).toBe(0);
    expect(basketWant(old, 7, 1.2)).toBeCloseTo(2.2);
    expect(basketWant(now, 0, 1.2)).toBeCloseTo(2.2);
    expect(basketWant(now, 0, 0.6)).toBe(BASKET_WANT_FLOOR);
    setCarryMore(false, 'want');
    expect(basketWant(now, 0, 1.2)).toBe(0);
    expect(basketWant(now, 7, 0.6)).toBeCloseTo(1.6);
    setCarryMore(true, 'want');
    expect(basketWant(scene(204, { dynamics: 'authored' }).w, 0, 1.2)).toBe(0);
  });

  it('worth and room: nothing at 203, a basket only at 204, each with its own switch', () => {
    const old = scene(203).w, now = scene(204).w;
    expect(basketWorth(old, 'basket')).toBe(0);
    expect(basketWorth(now, 'basket')).toBe(BASKET_WORTH);
    expect(basketWorth(now, 'axe')).toBe(0);
    expect(basketRoomShort(old, true, 3, 0)).toBe(false);
    expect(basketRoomShort(now, true, 3, 0)).toBe(true);
    expect(basketRoomShort(now, true, 3, 2)).toBe(true);
    expect(basketRoomShort(now, true, 3, 3)).toBe(false);
    expect(basketRoomShort(now, false, 3, 0)).toBe(false);
    expect(basketRoomShort(now, true, 0, 0)).toBe(false);
    setCarryMore(false, 'worth');
    expect(basketWorth(now, 'basket')).toBe(0);
    expect(basketRoomShort(now, true, 3, 0)).toBe(true);
    setCarryMore(false, 'room');
    expect(basketRoomShort(now, true, 3, 0)).toBe(false);
  });
});

describe('want: a grown person who has gathered nothing yet', () => {
  it('at 203 is offered no wood trip for a basket; at 204 is; with the part off is not', () => {
    const old = scene(203);
    expect(basketWood(old.w, old.ada)).toBeUndefined();
    const now = scene(204);
    expect(basketWood(now.w, now.ada), 'offered at 204').toBeTruthy();
    setCarryMore(false, 'want');
    expect(basketWood(now.w, now.ada)).toBeUndefined();
  });

  it('the old way in is unchanged: after seven units gathered the trip is offered at 203 as well', () => {
    const old = scene(203, { gathered: 7 });
    expect(basketWood(old.w, old.ada)).toBeTruthy();
  });

  it('a child is offered no basket work at 204, and a person who has a basket wants no second', () => {
    const kid = scene(204, { age: 9 });
    expect(basketWood(kid.w, kid.ada)).toBeUndefined();
    const has = scene(204, { tag: 'has-one' });
    give(has.w, has.ada, 'basket');
    expect(basketWood(has.w, has.ada)).toBeUndefined();
  });
});

describe('want: makings already in hand come first', () => {
  it('holding an axe’s wood and stone, she is offered the axe to make at 204; at 203 and with the part off the basket she lacks wood for hides it', () => {
    const inv: Items = { wood: 2, stone: 1 };
    const old = scene(203, { gathered: 7, inv }), now = scene(204, { gathered: 7, inv });
    const axe = (w: World, p: Person) => all(w, p).find((o) => o.key === 'craft:axe');
    expect(axe(old.w, old.ada)).toBeUndefined();
    expect(axe(now.w, now.ada), 'offered at 204').toBeTruthy();
    setCarryMore(false, 'want');
    expect(axe(now.w, now.ada)).toBeUndefined();
  });
});

describe('worth: the wood trip and the making', () => {
  it('the wood trip for a basket scores more at 204 than at 203, and the same with the part off', () => {
    const old = scene(203, { gathered: 7 }), now = scene(204, { gathered: 7 });
    const before = basketWood(old.w, old.ada)!.util, after = basketWood(now.w, now.ada)!.util;
    expect(after).toBeGreaterThan(before);
    setCarryMore(false, 'worth');
    expect(basketWood(now.w, now.ada)!.util).toBeCloseTo(before);
  });

  it('making a basket with the wood in hand carries the reason and its weight at 204 only', () => {
    const old = scene(203, { gathered: 7, inv: { wood: 3 } }), now = scene(204, { gathered: 7, inv: { wood: 3 } });
    const a = basketCraft(old.w, old.ada), b = basketCraft(now.w, now.ada);
    expect(a, 'offered at 203').toBeTruthy();
    expect(b, 'offered at 204').toBeTruthy();
    expect(part(a, WORTH_TEXT)).toBeUndefined();
    expect(part(b, WORTH_TEXT)).toBe(BASKET_WORTH);
    expect(b!.util).toBeGreaterThan(a!.util);
    setCarryMore(false, 'worth');
    expect(part(basketCraft(now.w, now.ada), WORTH_TEXT)).toBeUndefined();
  });
});

describe('room: a pack too full for the basket’s wood', () => {
  // eight berries and a stone weigh 11 of her 12: not one wood (2) fits
  const FULL: Items = { berries: 8, stone: 1 };
  it('bringing food home gains the reason and its weight at 204 only, and the trip is marked', () => {
    const old = scene(203, { gathered: 7, inv: FULL }), now = scene(204, { gathered: 7, inv: FULL });
    const a = foodHome(old.w, old.ada, old.home.id), b = foodHome(now.w, now.ada, now.home.id);
    expect(a, 'offered at 203').toBeTruthy();
    expect(b, 'offered at 204').toBeTruthy();
    expect(part(a, ROOM_TEXT)).toBeUndefined();
    expect(part(b, ROOM_TEXT)).toBe(BASKET_ROOM_WEIGHT);
    expect(b!.util).toBeGreaterThan(a!.util);
    expect(a!.make?.()?.data.basketRoom).toBeUndefined();
    expect(b!.make?.()?.data.basketRoom).toBe(true);
  });

  it('one spare portion is enough at 204 (two at 203), and not with the part off', () => {
    // three berries and three stone weigh 12; she keeps two portions for herself, so one is spare
    const inv: Items = { berries: 3, stone: 3 };
    const old = scene(203, { gathered: 7, inv }), now = scene(204, { gathered: 7, inv });
    expect(foodHome(old.w, old.ada, old.home.id)).toBeUndefined();
    expect(part(foodHome(now.w, now.ada, now.home.id), ROOM_TEXT)).toBe(BASKET_ROOM_WEIGHT);
    setCarryMore(false, 'room');
    expect(foodHome(now.w, now.ada, now.home.id)).toBeUndefined();
  });

  it('nothing is added when the wood would fit, or when she already has a basket', () => {
    const light = scene(204, { gathered: 7, inv: { berries: 6 } });
    const o = foodHome(light.w, light.ada, light.home.id);
    expect(o, 'the ordinary deposit is still offered').toBeTruthy();
    expect(part(o, ROOM_TEXT)).toBeUndefined();
    const has = scene(204, { gathered: 7, inv: FULL, tag: 'has-one' });
    give(has.w, has.ada, 'basket');
    expect(part(foodHome(has.w, has.ada, has.home.id), ROOM_TEXT)).toBeUndefined();
  });
});
