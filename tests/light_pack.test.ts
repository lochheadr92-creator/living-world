// Rules 205: a pack that is put down (src/sim/light_pack.ts, pack_materials.ts; optDepositFood and the site haul in options_work.ts,
// optEat in options_survival.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The
// ordinary-world origin is the census of rules 196 and the pack probe of rules 204 (a refused pickup finds the pack 93 to 95 percent
// full of wood, food and tools; food is taken home one time in ten) and the owner's instruction of 11 November 2026. Each check has the
// rules-204 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { startActivity } from '../src/sim/activities';
import { generateOptions } from '../src/sim/decision';
import { foodUnits } from '../src/sim/economy';
import { delBelief, observe } from '../src/sim/knowledge';
import { LIGHT_PACK_PARTS, MATERIALS_HOME_BASE, PACK_FULL_WEIGHT, RATION_HUNGER, RATION_KEEP, RATION_REACH, RATION_WEIGHT, mealLeaves, packFullWorth, rationHeld, rationKeep, setLightPack } from '../src/sim/light_pack';
import { spareMaterial } from '../src/sim/pack_materials';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, give, learn, site, stage } from './helpers/kit';
import type { Items, Person, World } from '../src/sim/types';

afterEach(() => setLightPack(true));

const RATION_TEXT = 'more food than I need to carry';
const FULL_TEXT = 'my pack is filling up';
const HELD_TEXT = 'keeping my ration for the road; there is food at home';
/** Ada lives alone in a hut and knows three trees. `stock` is what the hut holds; she has looked at it from its door unless told not to. */
function scene(version: number, opts: { dynamics?: 'rich' | 'authored'; inv?: Items; stock?: Items; hunger?: number; age?: number; knowsHome?: boolean; basket?: boolean; tag?: string } = {}) {
  const s = stage(`light-pack-${version}-${opts.dynamics ?? 'rich'}-${JSON.stringify(opts.inv ?? {})}-${JSON.stringify(opts.stock ?? {})}-${opts.hunger ?? 95}-${opts.age ?? 30}-${opts.knowsHome ?? true}-${opts.basket ?? false}-${opts.tag ?? ''}`);
  s.w.settings = { ...s.w.settings, dynamics: opts.dynamics ?? 'rich', rulesVersion: version };
  const ada = addPerson(s, 'Ada', 40.5, 27.5, { age: opts.age ?? 30, hunger: opts.hunger ?? 95, thirst: 95, energy: 95, inv: opts.inv ?? {} });
  const home = building(s, 'hut', 40, 24, ada.hhId, opts.stock ?? {});
  s.w.households.find((h) => h.id === ada.hhId)!.homeId = home.id;
  const trees = [0, 1, 2].map((i) => makeSource(s.w, 'tree', 46 + i, 30, 8));
  const w = done(s);
  w.tick = 600;
  if (opts.basket) give(w, ada, 'basket');
  ada.skills.forage = 1.2; ada.skills.wood = 1; ada.skills.fish = 1;
  // staged: the kit lets everyone know every building; someone who does not know of their home store has that memory removed
  if (!(opts.knowsHome ?? true)) delBelief(ada, home.id);
  if (opts.knowsHome ?? true) {
    // rules 184: the contents of a home are learned from inside or at the door, so she looks from the door and comes back
    const at = { x: ada.x, y: ada.y };
    ada.x = home.doorX + 0.5; ada.y = home.doorY + 0.5;
    observe(w, ada, home);
    ada.x = at.x; ada.y = at.y;
  }
  learn(w, ada, ...trees);
  return { w, ada, home, s };
}
const ctxOf = (w: World, p: Person) => generateOptions(w, p, true, true);
const foodHome = (w: World, p: Person, homeId: number) => ctxOf(w, p).options.find((o) => o.key === `deposit:${homeId}:food`);
const eatCarried = (w: World, p: Person) => ctxOf(w, p).options.find((o) => o.kind === 'eat');
const eatHome = (w: World, p: Person) => ctxOf(w, p).options.find((o) => o.kind === 'eat_store');
const heldBlock = (w: World, p: Person) => ctxOf(w, p).blocked.some((o) => o.blocked === HELD_TEXT);
const materialsHome = (w: World, p: Person, homeId: number) => ctxOf(w, p).options.find((o) => o.key === `pack_materials:${homeId}`);
const part = (o: { parts: [string, number][] } | undefined, text: string): number | undefined => o?.parts.find(([k]) => k === text)?.[1];

describe('rules 205 is registered', () => {
  it('is registered and supported (the current version may be later), with two parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(205);
    expect(SUPPORTED_RULES_VERSIONS).toContain(205);
    expect(LIGHT_PACK_PARTS).toEqual(['ration', 'materials']);
  });
});

describe('the rules themselves', () => {
  it('a filling pack: nothing at half full, all of it when full', () => {
    expect(packFullWorth(6, 12)).toBe(0);
    expect(packFullWorth(9, 12)).toBe(PACK_FULL_WEIGHT / 2);
    expect(packFullWorth(12, 12)).toBe(PACK_FULL_WEIGHT);
    expect(packFullWorth(15, 12)).toBe(PACK_FULL_WEIGHT);
    expect(packFullWorth(3, 0)).toBe(0);
  });

  it('the ration: one portion at 205 for someone with a home store they know, what was kept before otherwise', () => {
    const old = scene(204).w, now = scene(205).w;
    expect(rationKeep(old, true, 3)).toBe(3);
    expect(rationKeep(now, true, 3)).toBe(RATION_KEEP);
    expect(rationKeep(now, false, 2)).toBe(2);
    expect(rationKeep(scene(205, { dynamics: 'authored' }).w, true, 2)).toBe(2);
    setLightPack(false, 'ration');
    expect(rationKeep(now, true, 3)).toBe(3);
  });

  it('the ration is held only when it is all they carry, food is known at home, home is near and hunger is not yet urgent', () => {
    const old = scene(204).w, now = scene(205).w;
    expect(rationHeld(old, 1, 60, true, 100)).toBe(false);
    expect(rationHeld(now, 1, 60, true, 100)).toBe(true);
    expect(rationHeld(now, 2, 60, true, 100)).toBe(false);
    expect(rationHeld(now, 0, 60, true, 100)).toBe(false);
    expect(rationHeld(now, 1, RATION_HUNGER, true, 100)).toBe(false);
    expect(rationHeld(now, 1, 60, false, 100)).toBe(false);
    expect(rationHeld(now, 1, 60, true, RATION_REACH + 1)).toBe(false);
    // a meal eaten at a store leaves the ration the person arrived with, and nothing before 205
    expect(mealLeaves(old, 1)).toBe(0);
    expect(mealLeaves(now, 3)).toBe(RATION_KEEP);
    expect(mealLeaves(now, 0)).toBe(0);
    setLightPack(false, 'ration');
    expect(rationHeld(now, 1, 60, true, 100)).toBe(false);
  });
});

describe('ration: food beyond one portion goes home', () => {
  it('two portions: nothing to take home at 204; at 205 one is taken and one kept, with the reason; not with the part off', () => {
    const old = scene(204, { inv: { berries: 2 } }), now = scene(205, { inv: { berries: 2 } });
    expect(foodHome(old.w, old.ada, old.home.id)).toBeUndefined();
    const o = foodHome(now.w, now.ada, now.home.id);
    expect(o, 'offered at 205').toBeTruthy();
    expect(part(o, RATION_TEXT)).toBe(RATION_WEIGHT);
    const a = o!.make?.();
    expect(a?.data.ration).toBe(true);
    expect(a?.data.items).toEqual({ berries: 1 });
    setLightPack(false, 'ration');
    expect(foodHome(now.w, now.ada, now.home.id)).toBeUndefined();
  });

  it('a filling pack adds to the trip at 205 only', () => {
    // ten berries weigh 10 of her 12
    const old = scene(204, { inv: { berries: 10 } }), now = scene(205, { inv: { berries: 10 } });
    const a = foodHome(old.w, old.ada, old.home.id), b = foodHome(now.w, now.ada, now.home.id);
    expect(a, 'offered at 204').toBeTruthy();
    expect(part(a, FULL_TEXT)).toBeUndefined();
    expect(part(a, RATION_TEXT)).toBeUndefined();
    expect(part(b, FULL_TEXT)).toBe(packFullWorth(10, 12));
    expect(b!.util).toBeGreaterThan(a!.util);
    expect(b!.make?.()?.data.items).toEqual({ berries: 9 });
  });

  it('someone who does not know of a home store keeps what they kept before', () => {
    const f = scene(205, { inv: { berries: 2 }, knowsHome: false });
    expect(foodHome(f.w, f.ada, f.home.id)).toBeUndefined();
  });
});

describe('ration: the last portion is kept for the road', () => {
  const HUNGRY = { inv: { berries: 1 } as Items, stock: { berries: 6 } as Items, hunger: 50 };
  it('hungry near a stocked home: at 204 she is offered her carried food; at 205 it is held, with the reason, and the home store is offered', () => {
    const old = scene(204, HUNGRY), now = scene(205, HUNGRY);
    expect(foodUnits(now.ada.beliefs[now.home.id]?.items ?? {}), 'staged: she knows of the food at home').toBeGreaterThanOrEqual(1);
    expect(eatCarried(old.w, old.ada), 'offered at 204').toBeTruthy();
    expect(eatCarried(now.w, now.ada)).toBeUndefined();
    expect(heldBlock(now.w, now.ada)).toBe(true);
    expect(eatHome(now.w, now.ada), 'the home store is offered').toBeTruthy();
    setLightPack(false, 'ration');
    expect(eatCarried(now.w, now.ada)).toBeTruthy();
  });

  it('it is eaten as before when hunger is urgent, when more than the ration is carried, and when home is believed empty', () => {
    const urgent = scene(205, { ...HUNGRY, hunger: RATION_HUNGER - 5 });
    expect(eatCarried(urgent.w, urgent.ada)).toBeTruthy();
    const more = scene(205, { ...HUNGRY, inv: { berries: 2 } });
    expect(eatCarried(more.w, more.ada)).toBeTruthy();
    const bare = scene(205, { ...HUNGRY, stock: {} });
    expect(eatCarried(bare.w, bare.ada)).toBeTruthy();
    expect(heldBlock(bare.w, bare.ada)).toBe(false);
  });

  it('through to the ground: at 205 she eats from the home store and still has her ration', () => {
    const f = scene(205, { ...HUNGRY, tag: 'ground' });
    const before = foodUnits(f.home.store.items);
    for (let i = 0; i < 900 && foodUnits(f.home.store.items) === before; i++) stepWorld(f.w);
    expect(foodUnits(f.home.store.items), `last result ${JSON.stringify(f.ada.lastResult)}`).toBeLessThan(before);
    // the meal's portions pass through her pack on their way from the store; when the meal is over the ration is what is left
    for (let i = 0; i < 400 && f.ada.activity?.kind === 'eat_store'; i++) stepWorld(f.w);
    expect(f.ada.needs.hunger).toBeGreaterThan(50);
    expect(f.ada.inv.berries ?? 0).toBe(1);
  });
});

describe('materials: wood and stone nothing of hers needs', () => {
  // with a basket her pack holds 18; seven wood weigh 14, more than three quarters of it
  const LOADED = { inv: { wood: 7 } as Items, basket: true };
  it('at 204 there is no such trip; at 205 the spare wood is put down at home, and the trip is marked; not with the part off', () => {
    const old = scene(204, LOADED), now = scene(205, LOADED);
    expect(materialsHome(old.w, old.ada, old.home.id)).toBeUndefined();
    const o = materialsHome(now.w, now.ada, now.home.id);
    expect(o, 'offered at 205').toBeTruthy();
    const spare = spareMaterial(ctxOf(now.w, now.ada), 'wood');
    expect(spare).toBeGreaterThanOrEqual(1);
    expect(part(o, 'building materials nothing of mine needs')).toBe(MATERIALS_HOME_BASE + Math.min(spare, 6));
    const a = o!.make?.();
    expect(a?.data.packMaterials).toBe(true);
    expect(a?.data.items).toEqual({ wood: spare });
    setLightPack(false, 'materials');
    expect(materialsHome(now.w, now.ada, now.home.id)).toBeUndefined();
  });

  it('not from a pack under three quarters full, and not for a child', () => {
    const light = scene(205, { inv: { wood: 3 }, basket: true });
    expect(materialsHome(light.w, light.ada, light.home.id)).toBeUndefined();
    const kid = scene(205, { inv: { wood: 2 }, age: 9 });
    expect(materialsHome(kid.w, kid.ada, kid.home.id)).toBeUndefined();
  });

  it('through to the ground: the wood ends in the home store', () => {
    const f = scene(205, { ...LOADED, tag: 'ground' });
    const o = materialsHome(f.w, f.ada, f.home.id)!;
    const a = o.make?.();
    expect(a, 'the option makes a deposit').toBeTruthy();
    const n = a!.data.items.wood as number;
    a!.minCommit = f.w.tick + 2000; // staged: she sees the trip through
    startActivity(f.w, f.ada, a!);
    for (let i = 0; i < 600 && (f.home.store.items.wood ?? 0) < n; i++) stepWorld(f.w);
    expect(f.home.store.items.wood ?? 0, `last result ${JSON.stringify(f.ada.lastResult)}`).toBe(n);
    expect(f.ada.inv.wood ?? 0).toBe(7 - n);
  });
});

describe('materials: a delivery to a site', () => {
  it('carrying what her household’s site needs in a filling pack: the delivery gains the reason at 205 only', () => {
    const stageIt = (version: number) => {
      const f = scene(version, { inv: { wood: 5 }, tag: 'site' });
      const st = site(f.s, 'cellar', 44, 24, f.ada.hhId, f.ada.id);
      learn(f.w, f.ada, st);
      return { ...f, st };
    };
    const old = stageIt(204), now = stageIt(205);
    const haul = (w: World, p: Person) => ctxOf(w, p).options.find((o) => o.kind === 'haul');
    const a = haul(old.w, old.ada), b = haul(now.w, now.ada);
    expect(a, 'the delivery is offered at 204').toBeTruthy();
    expect(b, 'the delivery is offered at 205').toBeTruthy();
    expect(part(a, FULL_TEXT)).toBeUndefined();
    expect(part(b, FULL_TEXT)).toBe(packFullWorth(10, 12));
    setLightPack(false, 'materials');
    expect(part(haul(now.w, now.ada), FULL_TEXT)).toBeUndefined();
  });
});
