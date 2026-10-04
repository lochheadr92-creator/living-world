import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { siteConflict } from '../src/sim/act_build';
import { cancelSite, completeSite, createSite } from '../src/sim/buildings';
import { CART_CAP, DAY, BUILD_DEF } from '../src/sim/constants';
import { cartLoaded } from '../src/sim/carts';
import { newCart } from '../src/sim/carts';
import { addItem, conservationReport, weightOf } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import type { World } from '../src/sim/types';
import { T } from '../src/sim/types';
import { makeSource } from '../src/sim/sources';
import { addPerson, building, done, give, site, stage } from './helpers/kit';
import { killPerson } from '../src/sim/lifecycle';
import { run } from './helpers/util';

describe('carts', () => {
  function cartScene(forestBand = false) {
    const s = stage('cart-' + forestBand, 'help');
    const hauler = addPerson(s, 'Hana', 44, 49);
    const store = building(s, 'storehouse', 46, 48, 0, { bricks: 20, planks: 4 });
    const st = site(s, 'house', 46, 36, hauler.hhId, hauler.id);
    const cart = newCart(s.w, 44.5, 50.5, hauler.hhId);
    if (forestBand) for (let y = 42; y <= 44; y++) for (let x = 0; x < s.w.W; x++) s.w.terrain[y * s.w.W + x] = T.FOREST;
    const w = done(s);
    observe(w, hauler, store);
    observe(w, hauler, st);
    observe(w, hauler, cart);
    return { w, hauler, store, st, cart };
  }

  it('carries a real load a real distance: nothing arrives before the cart does, and no more than the cart can hold', () => {
    const { w, hauler, store, st, cart } = cartScene();
    const act = newActivity(w, hauler, { kind: 'cart_haul', label: 'Hauling', goal: 'test', targetId: cart.id, targetType: 'cart', tx: cart.x, ty: cart.y, spotX: cart.x, spotY: cart.y, utility: 100, minCommit: 4000, maxTicks: 3000, data: { cartId: cart.id, fromId: store.id, toId: st.id, items: { bricks: 6, planks: 8 }, leg: 0 } });
    startActivity(w, hauler, act);
    let maxLoad = 0;
    let arrivedBeforeLoaded = 0;
    for (let i = 0; i < 2500; i++) {
      run(w, 1);
      maxLoad = Math.max(maxLoad, weightOf(cart.load));
      // goods cannot be at the site before the load has left the store
      if ((st.delivered.bricks ?? 0) > 0 && (store.store.items.bricks ?? 0) === 20) arrivedBeforeLoaded++;
      if (!hauler.activity) break;
    }
    expect(arrivedBeforeLoaded).toBe(0);
    expect(maxLoad).toBeLessThanOrEqual(CART_CAP + 1e-9);
    expect(st.delivered.bricks).toBe(6);
    expect(st.delivered.planks).toBe(4); // only four were there to take, and the site was never short-changed of what existed
    expect(store.store.items.bricks).toBe(14);
    expect(store.store.items.planks ?? 0).toBe(0);
    expect(hauler.cartId).toBe(0); // let go at the end
    expect(cart.puller).toBe(0);
    expect(Math.hypot(cart.x - (st.x + st.w / 2), cart.y - (st.y + st.h / 2))).toBeLessThan(6);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('nothing is loaded from a distance: the cart goes out empty to the store, is loaded with the hauler standing at it, and only then comes back', () => {
    const s = stage('cart-far', 'help');
    const hauler = addPerson(s, 'Hana', 44, 30);
    const store = building(s, 'storehouse', 66, 44, 0, { bricks: 20, planks: 12 });
    const st = site(s, 'house', 40, 27, hauler.hhId, hauler.id);
    const cart = newCart(s.w, 45.5, 31.5, hauler.hhId);
    const w = done(s);
    observe(w, hauler, store);
    observe(w, hauler, st);
    observe(w, hauler, cart);
    const act = newActivity(w, hauler, { kind: 'cart_haul', label: 'Hauling', goal: 'test', targetId: cart.id, tx: cart.x, ty: cart.y, spotX: cart.x, spotY: cart.y, utility: 100, minCommit: 4000, maxTicks: 3000, data: { cartId: cart.id, fromId: store.id, toId: st.id, items: { bricks: 6, planks: 8 }, leg: 0 } });
    startActivity(w, hauler, act);
    let loadedAt: { x: number; y: number; t: number } | null = null;
    let maxGap = 0;
    let site0 = 0;
    for (let i = 0; i < 2500 && hauler.activity === act; i++) {
      run(w, 1);
      if (!loadedAt && weightOf(cart.load) > 0) loadedAt = { x: hauler.x, y: hauler.y, t: i };
      if (hauler.cartId) maxGap = Math.max(maxGap, Math.hypot(hauler.x - cart.x, hauler.y - cart.y));
      if (!loadedAt) site0 += (st.delivered.bricks ?? 0) + (st.delivered.planks ?? 0);
    }
    expect(loadedAt, 'the cart was loaded at some point').toBeTruthy();
    // the hauler was at the store (a couple of tiles from it) at the moment the load appeared, ~25 tiles from where she began
    expect(Math.hypot(loadedAt!.x - (store.x + 1), loadedAt!.y - (store.y + 1))).toBeLessThan(4);
    expect(loadedAt!.t).toBeGreaterThan(120); // it took the time the walk takes
    expect(site0).toBe(0);
    expect(maxGap).toBeLessThan(3); // the cart goes where its puller goes
    expect(st.delivered.bricks).toBe(6);
    expect(st.delivered.planks).toBe(8);
    expect(store.store.items.bricks).toBe(14);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a request bigger than the bed is only partly loaded; the rest stays where it was', () => {
    const s = stage('cart-capacity', 'help');
    const hauler = addPerson(s, 'Hana', 44, 49);
    const store = building(s, 'storehouse', 46, 48, 0, { bricks: 40 });
    const st = site(s, 'house', 46, 36, hauler.hhId, hauler.id);
    const cart = newCart(s.w, 44.5, 50.5, hauler.hhId);
    const w = done(s);
    const act = newActivity(w, hauler, { kind: 'cart_haul', label: 'Hauling', goal: 'test', targetId: cart.id, tx: cart.x, ty: cart.y, spotX: cart.x, spotY: cart.y, utility: 100, minCommit: 4000, maxTicks: 3000, data: { cartId: cart.id, fromId: store.id, toId: st.id, items: { bricks: 40 }, leg: 0 } });
    startActivity(w, hauler, act);
    run(w, 2500);
    // the site wanted only 6 bricks, so that is all that was unloaded; the cart carries the rest back parked, nothing vanished
    expect((st.delivered.bricks ?? 0) + (st.used.bricks ?? 0)).toBe(6);
    const onCart = cart.load.bricks ?? 0;
    expect((store.store.items.bricks ?? 0) + onCart + 6).toBe(40);
    expect(onCart).toBeLessThanOrEqual(Math.floor(CART_CAP / 3));
    expect(conservationReport(w).ok).toBe(true);
  });

  it('wheels cannot cross forest: with a belt of trees across the only way, the cart haul is refused honestly while the same trip on foot is possible', () => {
    const { w, hauler, store, st, cart } = cartScene(true);
    const act = newActivity(w, hauler, { kind: 'cart_haul', label: 'Hauling', goal: 'test', targetId: cart.id, tx: cart.x, ty: cart.y, spotX: cart.x, spotY: cart.y, utility: 100, minCommit: 4000, maxTicks: 3000, data: { cartId: cart.id, fromId: store.id, toId: st.id, items: { bricks: 6 }, leg: 0 } });
    startActivity(w, hauler, act);
    for (let i = 0; i < 400 && hauler.lastResult?.label !== 'Hauling'; i++) run(w, 1);
    expect(hauler.lastResult?.label).toBe('Hauling');
    expect(hauler.lastResult?.outcome).toBe('failed');
    expect(hauler.lastResult?.detail).toMatch(/cart/);
    expect(st.delivered.bricks ?? 0).toBe(0);
    expect(cartLoaded(cart)).toBe(false);
    // on foot the trees are no obstacle
    const walk = newActivity(w, hauler, { kind: 'deposit', label: 'walk', goal: 'test', targetId: st.id, tx: 46, ty: 36, spotX: 46.5, spotY: 38.5, utility: 100, minCommit: 4000, maxTicks: 800, data: { items: {} } });
    startActivity(w, hauler, walk);
    for (let i = 0; i < 600 && hauler.lastResult?.label !== 'walk'; i++) run(w, 1);
    expect(hauler.lastResult?.label).toBe('walk'); // it got there (and found nothing to put down)
    expect(Math.hypot(hauler.x - 46.5, hauler.y - 38.5)).toBeLessThan(3);
  });

  it('a person who dies pulling a cart leaves it where it stands, load and all, to be found and emptied', () => {
    const { w, hauler, store, st, cart } = cartScene();
    const act = newActivity(w, hauler, { kind: 'cart_haul', label: 'Hauling', goal: 'test', targetId: cart.id, tx: cart.x, ty: cart.y, spotX: cart.x, spotY: cart.y, utility: 100, minCommit: 4000, maxTicks: 3000, data: { cartId: cart.id, fromId: store.id, toId: st.id, items: { bricks: 6 }, leg: 0 } });
    startActivity(w, hauler, act);
    for (let i = 0; i < 1500 && weightOf(cart.load) === 0; i++) run(w, 1);
    expect(weightOf(cart.load)).toBeGreaterThan(0);
    killPerson(w, hauler, 'test');
    expect(w.persons.includes(hauler)).toBe(false);
    expect(cart.puller).toBe(0);
    expect(cart.load.bricks).toBe(6);
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('a hut rebuilt as a house', () => {
  it('stays the same home throughout: same building, same footprint, still lived in, then upgraded in place with its household and store intact', () => {
    const s = stage('upgrade');
    const owner = addPerson(s, 'Ola', 44, 44);
    const hut = building(s, 'hut', 50, 50, owner.hhId, { berries: 3 });
    s.w.households.find((h) => h.id === owner.hhId)!.homeId = hut.id;
    const w = done(s);
    const occ = w.occ[50 * w.W + 50];
    const st = createSite(w, 'house', hut.x, hut.y, owner.hhId, owner.id, { upgradeOf: hut.id });
    expect(hut.upgrading).toBe(st.id);
    expect(w.occ[50 * w.W + 50]).toBe(occ); // the hut keeps its ground
    expect(w.byId.get(hut.id)).toBe(hut);
    expect(siteConflict(w, 'house', owner.hhId, hut.id)).toMatch(/already being rebuilt/);
    for (const k of Object.keys(BUILD_DEF.house.cost) as (keyof typeof BUILD_DEF.house.cost)[]) addItem(st.delivered, k, BUILD_DEF.house.cost[k] ?? 0);
    const b = completeSite(w, st, owner);
    expect(b).toBe(hut);
    expect(hut.type).toBe('house');
    expect(hut.condition).toBe(100);
    expect(hut.store.cap).toBe(BUILD_DEF.house.cap);
    expect(hut.store.items.berries).toBe(3);
    expect(hut.upgrading).toBeUndefined();
    expect(w.households.find((h) => h.id === owner.hhId)!.homeId).toBe(hut.id);
    expect(w.occ[50 * w.W + 50]).toBe(occ);
    expect(w.sites).toHaveLength(0);
  });

  it('a given-up rebuild releases the hut and leaves the materials on the ground', () => {
    const s = stage('upgrade-cancel');
    const owner = addPerson(s, 'Ola', 44, 44);
    const hut = building(s, 'hut', 50, 50, owner.hhId);
    const w = done(s);
    const st = createSite(w, 'house', hut.x, hut.y, owner.hhId, owner.id, { upgradeOf: hut.id });
    addItem(st.delivered, 'planks', 3);
    cancelSite(w, st, 'nobody had worked on it for days');
    expect(hut.upgrading).toBeUndefined();
    expect(w.byId.get(hut.id)).toBe(hut);
    expect(w.piles.some((p) => (p.items.planks ?? 0) === 3)).toBe(true);
  });

  it('limits: one of each workshop, a bounded number of improvement projects, and homes never queue behind them', () => {
    const s = stage('limits');
    const a = addPerson(s, 'Ann', 44, 44);
    building(s, 'timber_yard', 60, 60, 0);
    const w = done(s);
    expect(siteConflict(w, 'timber_yard', a.hhId)).toMatch(/already a timber yard/);
    expect(siteConflict(w, 'kiln', a.hhId)).toBeNull();
    createSite(w, 'kiln', 20, 60, a.hhId, a.id);
    expect(siteConflict(w, 'kiln', a.hhId)).toMatch(/already being built/);
    createSite(w, 'hall', 30, 60, a.hhId, a.id);
    expect(siteConflict(w, 'smithy', a.hhId)).toMatch(/enough improvement projects/);
    // but a hut can still be marked out: the roof over a household does not wait behind workshops
    expect(siteConflict(w, 'hut', a.hhId)).toBeNull();
  });
});

describe('production follows need', () => {
  function yardScene(name: string, wanted: boolean) {
    const s = stage(name);
    const hana = addPerson(s, 'Hana', 44, 25, { traits: { diligence: 0.95, generosity: 0.7, curiosity: 0.6 }, inv: { wood: 6, fruit: 10 } });
    const yard = building(s, 'timber_yard', 48, 26, 0);
    for (let i = 0; i < 4; i++) makeSource(s.w, 'tree', 54 + (i % 2), 22 + i, 5);
    for (let i = 0; i < 3; i++) makeSource(s.w, 'berry_bush', 36 + i, 30, 6);
    give(s.w, hana, 'saw');
    give(s.w, hana, 'axe');
    const hut = building(s, 'hut', 40, 26, hana.hhId);
    s.w.households.find((h) => h.id === hana.hhId)!.homeId = hut.id;
    const st = wanted ? createSite(s.w, 'house', hut.x, hut.y, hana.hhId, hana.id, { upgradeOf: hut.id }) : null;
    if (st) for (const k of ['wood', 'bricks'] as const) addItem(st.delivered, k, BUILD_DEF.house.cost[k] ?? 0);
    s.w.camp = { x: 44.5, y: 26.5 }; // the lake is a short walk away
    const w = done(s);
    learnAll(w, hana, [yard, hut, ...(st ? [st] : []), ...w.sources.filter((x) => x.type === 'tree' || x.type === 'berry_bush')]);
    return { w, hana, yard, st };
  }
  function learnAll(w: World, p: ReturnType<typeof addPerson>, things: Parameters<typeof observe>[2][]): void {
    for (const e of things) observe(w, p, e);
  }

  it('with nothing wanted nobody makes planks: the yard stays idle however much wood is about', () => {
    const { w, yard } = yardScene('idle-yard', false);
    run(w, 2600);
    expect(yard.ops!.batches).toBe(0);
    expect(yard.store.items.planks ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('the iron chain can be completed by one person’s ordinary decisions: a worn axe, a smithy with ore on its shelf, a kiln and trees end in charcoal, iron and an iron axe', () => {
    const s = stage('iron-chain');
    const hana = addPerson(s, 'Hana', 44, 25, { traits: { diligence: 0.95, generosity: 0.7, curiosity: 0.6 }, inv: { fruit: 6 } });
    const smithy = building(s, 'smithy', 50, 27, 0, { ore: 3, handles: 1 });
    const kiln = building(s, 'kiln', 48, 22, 0);
    for (let i = 0; i < 6; i++) makeSource(s.w, 'tree', 54 + (i % 3), 20 + i, 5);
    for (let i = 0; i < 3; i++) makeSource(s.w, 'berry_bush', 36 + i, 30, 6);
    const old = give(s.w, hana, 'axe');
    old.wear = 55;
    give(s.w, hana, 'hammer');
    s.w.camp = { x: 44.5, y: 26.5 };
    const w = done(s);
    learnAll(w, hana, [smithy, kiln, ...w.sources.filter((x) => x.type === 'tree' || x.type === 'berry_bush')]);
    run(w, 12000);
    expect(kiln.ops!.produced.charcoal ?? 0, 'charcoal was burned').toBeGreaterThanOrEqual(3);
    expect(smithy.ops!.produced.iron ?? 0, 'iron was smelted').toBeGreaterThanOrEqual(1);
    expect(toolsHeldBy(w, hana.id, 'axe').some((t) => t.tier === 1), 'an iron axe was forged').toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });

  it('with a house waiting for planks they are made and carried to the site — and only as many as it needs', () => {
    const { w, yard, st } = yardScene('wanted-yard', true);
    run(w, 5200);
    const site = st!;
    const supplied = (site.delivered.planks ?? 0) + (site.used.planks ?? 0);
    const left = yard.store.items.planks ?? 0;
    expect(yard.ops!.batches).toBeGreaterThan(0);
    expect(supplied).toBeGreaterThan(0);
    // production stops at the need: planks made never exceed what the site wanted plus the leftover of the last batch
    const made = yard.ops!.produced.planks ?? 0;
    expect(made).toBeLessThanOrEqual(BUILD_DEF.house.cost.planks! + 2);
    expect(made - supplied - left).toBeGreaterThanOrEqual(0);
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });
});

void DAY;
