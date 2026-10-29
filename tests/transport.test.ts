// Rules 55: what a person has carried is the ground for wanting a cart; a cart serves the household's live plans beyond the
// building site; a loaded cart left standing is recovered. Staged scenes; every choice goes through the external selection
// boundary and the carrying, loading and unloading run live.
import { afterEach, expect, it } from 'vitest';
import { stage, addPerson, building, site, done, pin } from './helpers/kit';
import { setExternalController } from '../src/sim/external';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { stepWorld, hashWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { conservationReport, ledgerCreate } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { newCart, cartLoaded } from '../src/sim/carts';
import { newActivity, startActivity } from '../src/sim/activities';
import { killPerson } from '../src/sim/lifecycle';
import { reviewIntentions } from '../src/sim/intent';
import { demandsOf } from '../src/sim/production';
import { describePerson } from '../src/sim/inspect';
import { HAUL_EXPERIENCE, HAUL_TRIPS, HAUL_WINDOW, cartExperience, describeHauling, setTransport } from '../src/sim/transport';
import { parseIntervention } from '../scripts/lab/lab';
import type { Person, World } from '../src/sim/types';
afterEach(() => { setTransport(true); setExternalController(null); });

function pick(w: World, p: Person, keyPart: string) {
  const o = rankOptions(generateOptions(w, p, true, true)).find((o) => o.key.includes(keyPart));
  if (!o?.make) throw new Error(`No offered ${keyPart}; options: ${rankOptions(generateOptions(w, p, true, true)).map((o) => o.key).join(', ')}; blocked: ${generateOptions(w, p, true, true).blocked.map((b) => b.label + ' / ' + b.blocked).join(', ')}`);
  let picked = false;
  setExternalController({ controls: (_w, q) => q.id === p.id, choose: () => { if (picked) return { kind: 'defer' }; picked = true; return { kind: 'pick', key: o.key }; } });
  p.cooldowns.pause = 0; p.nextThink = w.tick; stepWorld(w);
  if (!p.activity) throw new Error(`Selection did not start ${keyPart}`);
  return p.activity;
}
function run(w: World, p: Person, keyPart: string, max = 3000) {
  const act = pick(w, p, keyPart);
  for (let i = 0; i < max && p.activity?.id === act.id; i++) stepWorld(w);
  if (p.activity?.id === act.id) throw new Error(`Still running ${keyPart}`);
  if (p.lastResult?.outcome !== 'success' && p.lastResult?.outcome !== 'partial') throw new Error(`Did not finish ${keyPart}: ${JSON.stringify(p.lastResult)}`);
  pin(p); setExternalController(null);
  return act;
}
const keys = (w: World, p: Person) => rankOptions(generateOptions(w, p, true, true)).map((o) => o.key);
const cartDemand = (w: World, p: Person) => demandsOf(generateOptions(w, p, true, true)).filter((d) => d.item === 'cart');

/** a hauler, a site that will take a great deal of stone, a known timber yard: the ground for a cart is what she carries */
function haulScene(version: number) {
  const s = stage(`transport-haul-${version}`); const w = s.w; w.settings.dynamics = 'rich'; w.settings.rulesVersion = version; w.tick = 1000;
  const hana = addPerson(s, 'Hana', 40.5, 40.5, { age: 30, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  const hut = building(s, 'hut', 36, 36, hana.hhId, { grain: 10 }); w.households.find((h) => h.id === hana.hhId)!.homeId = hut.id;
  const st = site(s, 'storehouse', 44, 44, hana.hhId, hana.id); st.required.stone = 100;
  const yard = building(s, 'timber_yard', 50, 36, 0, {});
  done(s); for (const e of [hut, st, yard]) observe(w, hana, e); pin(hana);
  hana.skills.build = 0.2; // below the rules-20 site-deficit path's skill gate: what she carries must be the reason
  hana.cooldowns.trade = 1e12; perceive(w, hana);
  return { w, hana, hut, st, yard };
}
function load(w: World, p: Person, item: 'stone', n: number) { p.inv[item] = (p.inv[item] ?? 0) + n; ledgerCreate(w, item, n, 'staged: a load to carry'); }

it('what she really carried to the site is counted on her, and enough of it is the ground for wanting a cart; not at rules 54', () => {
  for (const version of [54, 55]) {
    const { w, hana, st } = haulScene(version);
    expect(cartDemand(w, hana)).toHaveLength(0);
    for (let trip = 0; trip < HAUL_TRIPS + 1; trip++) { load(w, hana, 'stone', 4); run(w, hana, `haul:${st.id}`); }
    expect(st.delivered.stone).toBe(4 * (HAUL_TRIPS + 1));
    if (version === 54) { expect(hana.hauling).toBeUndefined(); expect(cartDemand(w, hana)).toHaveLength(0); continue; }
    expect(hana.hauling).toMatchObject({ weight: 12 * (HAUL_TRIPS + 1), trips: HAUL_TRIPS + 1 });
    expect(hana.hauling!.weight).toBeGreaterThanOrEqual(HAUL_EXPERIENCE);
    expect(cartExperience(generateOptions(w, hana, true, true))).toContain('after carrying');
    expect(describeHauling(w, hana).join(' ')).toContain('enough to want a cart');
    expect(describePerson(w, hana.id)?.hauling.join(' ')).toContain('Carried');
    const demand = cartDemand(w, hana); expect(demand).toHaveLength(1); expect(demand[0].why).toContain('after carrying');
    // the window closes and the record starts afresh with the next load
    w.tick += HAUL_WINDOW + 1; expect(cartExperience(generateOptions(w, hana, true, true))).toBe('');
    load(w, hana, 'stone', 4); hana.needs.hunger = 100; hana.needs.thirst = 100; hana.needs.energy = 100; run(w, hana, `haul:${st.id}`);
    expect(hana.hauling).toMatchObject({ weight: 12, trips: 1 });
    expect(conservationReport(w).ok).toBe(true);
  }
}, 30000);

/** three adults with an empty home store, a communal storehouse full of fish, a parked cart: the reserve plan's shortfall */
function provisionScene(version: number) {
  const s = stage(`transport-food-${version}`); const w = s.w; w.settings.dynamics = 'rich'; w.settings.rulesVersion = version; w.tick = 1000;
  const ann = addPerson(s, 'Ann', 40.5, 40.5, { age: 30, hunger: 100, thirst: 100, energy: 100 });
  const ben = addPerson(s, 'Ben', 41.5, 40.5, { hh: ann.hhId, age: 30, hunger: 100, thirst: 100, energy: 100 });
  const cal = addPerson(s, 'Cal', 40.5, 41.5, { hh: ann.hhId, age: 30, hunger: 100, thirst: 100, energy: 100 });
  const hut = building(s, 'hut', 36, 36, ann.hhId, {}); w.households.find((h) => h.id === ann.hhId)!.homeId = hut.id;
  const store = building(s, 'storehouse', 46, 48, 0, { fish: 30 });
  const cart = newCart(w, 44.5, 50.5, ann.hhId);
  done(s); for (const p of [ann, ben, cal]) { observe(w, p, hut); observe(w, p, store); observe(w, p, cart); p.cooldowns.trade = 1e12; pin(p); }
  perceive(w, ann);
  return { w, ann, ben, cal, hut, store, cart };
}

it('a cart brings the reserve plan its food from the storehouse in one trip, credited to the plan where the fish actually move; not below rules 55', () => {
  const old = provisionScene(54);
  reviewIntentions(generateOptions(old.w, old.ann, true)); expect(old.ann.intentions.find((i) => i.kind === 'stock')).toBeDefined();
  expect(keys(old.w, old.ann).some((k) => k.includes(':home:'))).toBe(false);
  const { w, ann, hut, store, cart } = provisionScene(55);
  reviewIntentions(generateOptions(w, ann, true)); const plan = ann.intentions.find((i) => i.kind === 'stock')!; expect(plan.reserve).toBe(12);
  expect(keys(w, ann).some((k) => k.includes(`cart:${cart.id}:home:${hut.id}:${store.id}`))).toBe(true);
  const before = serializeWorld(w); generateOptions(w, ann, true, true); describePerson(w, ann.id); expect(serializeWorld(w)).toBe(before);
  run(w, ann, ':home:');
  expect(hut.store.items.fish).toBe(12); expect(store.store.items.fish).toBeLessThanOrEqual(18); // twelve left on the cart; the rest of the gap is spoilage over the trip, in the ledger expect(ann.inv.fish ?? 0).toBe(0);
  expect(cartLoaded(cart)).toBe(false); expect(cart.puller).toBe(0); expect(Math.hypot(cart.x - hut.x, cart.y - hut.y)).toBeLessThan(6);
  expect(plan.worked).toBe(12);
  expect(conservationReport(w).ok).toBe(true);
}, 30000);

/** a batch plan for bricks (rules 50) with a storehouse that holds the clay and wood: one cart trip to the kiln */
function batchScene(version: number) {
  const s = stage(`transport-batch-${version}`); const w = s.w; w.settings.dynamics = 'rich'; w.settings.rulesVersion = version; w.tick = 1000;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  const hut = building(s, 'hut', 36, 36, ada.hhId, { grain: 8 }); w.households.find((h) => h.id === ada.hhId)!.homeId = hut.id;
  const house = site(s, 'house', 44, 44, ada.hhId, ada.id, { wood: 6, planks: 8 });
  const kiln = building(s, 'kiln', 50, 36, 0, {});
  const store = building(s, 'storehouse', 46, 48, 0, { clay: 10, wood: 10 });
  const cart = newCart(w, 44.5, 50.5, ada.hhId);
  done(s); for (const e of [hut, house, kiln, store, cart]) observe(w, ada, e); pin(ada);
  ada.cooldowns.trade = 1e12; perceive(w, ada);
  return { w, ada, house, kiln, store, cart };
}

it('a cart brings a batch plan its missing inputs to the kiln, unloading only what the kiln accepts', () => {
  const { w, ada, kiln, store, cart } = batchScene(55);
  reviewIntentions(generateOptions(w, ada, true)); const plan = ada.intentions.find((i) => i.kind === 'batch')!; expect(plan.wants).toEqual({ clay: 4, wood: 2 });
  expect(keys(w, ada).some((k) => k.includes(`cart:${cart.id}:batch:${kiln.id}:${store.id}`))).toBe(true);
  run(w, ada, ':batch:');
  expect(kiln.store.items.clay).toBe(4); expect(kiln.store.items.wood).toBe(2); expect(store.store.items.clay).toBe(6); expect(store.store.items.wood).toBe(8);
  expect(cartLoaded(cart)).toBe(false); expect(conservationReport(w).ok).toBe(true);
  expect(keys(w, ada).some((k) => k.includes(':batch:'))).toBe(false);
}, 30000);

/** a loaded cart whose puller dies on the way: her household recovers it to the site that needs the load */
function deathScene(version: number) {
  const s = stage(`transport-death-${version}`); const w = s.w; w.settings.dynamics = 'rich'; w.settings.rulesVersion = version; w.tick = 1000;
  const hana = addPerson(s, 'Hana', 44, 49, { age: 30, hunger: 100, thirst: 100, energy: 100 });
  const ben = addPerson(s, 'Ben', 40.5, 40.5, { hh: hana.hhId, age: 30, hunger: 100, thirst: 100, energy: 100 });
  const hut = building(s, 'lean_to', 36, 36, hana.hhId, {}); w.households.find((h) => h.id === hana.hhId)!.homeId = hut.id;
  const store = building(s, 'storehouse', 46, 48, 0, { bricks: 20, planks: 4 });
  const st = site(s, 'house', 46, 36, hana.hhId, hana.id);
  const cart = newCart(w, 44.5, 50.5, hana.hhId);
  done(s); for (const p of [hana, ben]) { observe(w, p, store); observe(w, p, st); observe(w, p, cart); observe(w, p, hut); p.cooldowns.trade = 1e12; pin(p); }
  return { w, hana, ben, hut, store, st, cart };
}

it('a puller who dies lets the loaded cart stand; a household member recovers it to the site, and not at rules 54', () => {
  for (const version of [54, 55]) {
    const { w, hana, ben, st, cart } = deathScene(version);
    const act = newActivity(w, hana, { kind: 'cart_haul', label: 'Hauling', goal: 'test', targetId: cart.id, targetType: 'cart', tx: cart.x, ty: cart.y, spotX: cart.x, spotY: cart.y, utility: 100, minCommit: 4000, maxTicks: 3000, data: { cartId: cart.id, fromId: 0, toId: st.id, items: { bricks: 6, planks: 8 }, leg: 0 } })!;
    (act.data as { fromId: number }).fromId = w.buildings.find((b) => b.type === 'storehouse')!.id; hana.cooldowns.pause = 0; startActivity(w, hana, act);
    for (let i = 0; i < 2000 && !((act.data.leg as number) === 2 && cartLoaded(cart) && act.phase === 'travel' && Math.hypot(cart.x - 46, cart.y - 48) > 3); i++) stepWorld(w);
    expect(cartLoaded(cart)).toBe(true); expect(hana.cartId).toBe(cart.id);
    killPerson(w, hana, 'injuries');
    expect(cart.puller).toBe(0); expect(cartLoaded(cart)).toBe(true); const left = { x: cart.x, y: cart.y, load: { ...cart.load } };
    observe(w, ben, cart); perceive(w, ben);
    if (version === 54) { expect(keys(w, ben).some((k) => k.includes(':recover:'))).toBe(false); continue; }
    expect(keys(w, ben).some((k) => k.includes(`cart:${cart.id}:recover:${st.id}`))).toBe(true);
    run(w, ben, ':recover:');
    expect(st.delivered.bricks).toBe(left.load.bricks); expect(st.delivered.planks).toBe(left.load.planks); expect(cartLoaded(cart)).toBe(false);
    expect(Math.hypot(cart.x - left.x, cart.y - left.y)).toBeGreaterThan(2); expect(ben.cartId).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
  }
}, 40000);

it('what the home store cannot take stays on the cart where it is parked, and a full store is not offered again', () => {
  const { w, ben, hut, cart } = deathScene(55);
  // staged: a cart standing loaded with more bricks than a lean-to holds, and no site that wants bricks
  w.sites.length = 0; ben.bykind.site = []; for (const id of Object.keys(ben.beliefs)) if (ben.beliefs[Number(id)].kind === 'site') delete ben.beliefs[Number(id)];
  cart.load.bricks = 20; ledgerCreate(w, 'bricks', 20, 'staged: a load left on the cart'); observe(w, ben, cart);
  expect(keys(w, ben).some((k) => k.includes(`cart:${cart.id}:recover:${hut.id}`))).toBe(true);
  run(w, ben, ':recover:');
  expect(hut.store.items.bricks).toBe(4); expect(cart.load.bricks).toBe(16); // a lean-to holds 12 weight: four bricks expect(cartLoaded(cart)).toBe(true); expect(cart.puller).toBe(0);
  expect(Math.hypot(cart.x - hut.x, cart.y - hut.y)).toBeLessThan(5);
  expect(keys(w, ben).some((k) => k.includes(':recover:'))).toBe(false);
  expect(conservationReport(w).ok).toBe(true);
}, 30000);

it('rules 55: switch, exact replay, observer purity, hash coverage, load validation, and rules 54 unchanged', () => {
  const restore = parseIntervention('rich-no-transport').install!();
  try {
    const { w, hana, st } = haulScene(55);
    for (let trip = 0; trip < HAUL_TRIPS + 1; trip++) { load(w, hana, 'stone', 4); run(w, hana, `haul:${st.id}`); }
    expect(hana.hauling).toBeUndefined(); expect(cartDemand(w, hana)).toHaveLength(0);
    const f = provisionScene(55); reviewIntentions(generateOptions(f.w, f.ann, true)); expect(keys(f.w, f.ann).some((k) => k.includes(':home:'))).toBe(false);
  } finally { restore(); }
  const { w, hana, st } = haulScene(55);
  for (let trip = 0; trip < HAUL_TRIPS + 1; trip++) { load(w, hana, 'stone', 4); run(w, hana, `haul:${st.id}`); }
  const saved = serializeWorld(w); const hash = hashWorld(w);
  for (let i = 0; i < 3; i++) { generateOptions(w, hana, true, true); describePerson(w, hana.id); }
  expect(serializeWorld(w)).toBe(saved);
  const copy = deserializeWorld(saved);
  for (let i = 0; i < 300; i++) { stepWorld(w); stepWorld(copy); }
  expect(serializeWorld(copy)).toBe(serializeWorld(w));
  const changed = deserializeWorld(saved); changed.persons.find((p) => p.id === hana.id)!.hauling!.trips += 1;
  expect(hashWorld(changed)).not.toBe(hash);
  expect(() => deserializeWorld(saved.replace('"rulesVersion":55', '"rulesVersion":54'))).toThrow('Invalid hauling record');
});
