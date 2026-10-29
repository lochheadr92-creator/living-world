// TRANSPORT BEYOND THE BUILDING SITE (rules version 55, rich worlds only).
//
// Before this, a handcart was wanted on the strength of known site deficits alone ("the one who keeps hauling heavy loads"
// was a comment, not a measurement), a cart could only ever be offered a building site as its destination although the haul
// handler already knew how to unload into a store, and a loaded cart left standing (its puller interrupted, or dead) was never
// picked up again because the offer required an empty cart. This module owns three bounded extensions:
//
//   * EXPERIENCE. What a person has actually carried to building sites on foot is recorded on them (`Person.hauling`: weight,
//     trips, since), kept for HAUL_WINDOW and then started afresh. Having carried HAUL_EXPERIENCE of weight in at least HAUL_TRIPS
//     loads within the window is a reason to want a cart, beside the rules-20 site-deficit reason; the demand's own words say
//     which. Nothing is counted that did not move.
//   * TRIPS FOR LIVE PLANS. A parked, empty cart of the household's (or communal) may be offered two destinations besides a site:
//     the household's own home store for an active food-reserve plan's shortfall (loaded at a known granary, storehouse or pile;
//     the allowance applies at loading as it does for any withdrawal), and a known workshop for an active batch plan's missing
//     inputs (unloaded only into what the workshop accepts, credited as any deposit). Each needs more than one foot trip's worth
//     of weight to be worth the wheels. The plan is credited where the goods actually move, as the deposit handler credits it.
//   * RECOVERY. A known parked cart of the household's that stands loaded may be taken to the first known site that needs any of
//     its load, or failing that to the household's home store; what the destination cannot take stays on the cart where it is
//     parked. A puller who dies lets go of the cart where they fell (lifecycle.ts unhitch), so this is also the death case.
//
// Capacity, terrain, loading and unloading time, ownership and the allowance are the cart handler's as before; nothing here
// moves goods, and the cart's load stays apart from the pack.
import type { Belief, Items, Person, World } from './types';
import type { Ctx } from './optutil';
import type { BuildingType, ItemKind } from './types';
import { addOption, beliefsByKind } from './optutil';
const unitsOf = (n: number | undefined): number => n ?? 0;
import { newActivity } from './activities';
import { BUILD_DEF, CARRY_CAP, DAY, WEIGHT } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import { cartLoaded } from './carts';
import { planShortfall } from './intent';
import { foodInBelief, homeStoreBelief } from './provision';
import { acceptedAt, isFacilityType } from './recipes';
import { hyp } from './util';

export interface Hauling {
  /** weight carried to building sites on foot within the window, and the loads it took */
  weight: number;
  trips: number;
  since: number;
}

export const HAUL_WINDOW = DAY * 6;
// Ordinary foot hauls are light (about 3 weight a trip in the 45-day observations; the heaviest carrier reached 34 in 7 loads),
// so the threshold is set where "keeps hauling" begins in those worlds, not at the staged full pack.
export const HAUL_EXPERIENCE = 30;
export const HAUL_TRIPS = 6;
/** food the home store takes from a cart, the kinds a reserve is made of */
const STORABLE: readonly ItemKind[] = ['grain', 'fish', 'fruit', 'berries'];

let enabled = true;
export const transportOn = (): boolean => enabled;
/** Lab switch `rich-no-transport`: nothing carried is counted, no trip beyond a site is offered, no loaded cart is recovered; no effect below rules 55. */
export function setTransport(on: boolean): void {
  enabled = on;
}
export const hasTransport = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, 55);

const weightOfItems = (items: Partial<Items>): number => (Object.keys(items) as ItemKind[]).reduce((n, k) => n + unitsOf(items[k]) * WEIGHT[k], 0);

/** What a foot haul really delivered to a site (act_resource.ts haul, at the transfer), counted on the hauler. */
export function noteHauled(world: World, p: Person, moved: Partial<Items>): void {
  if (!hasTransport(world)) return;
  const weight = weightOfItems(moved);
  if (weight <= 0) return;
  if (!p.hauling || world.tick - p.hauling.since > HAUL_WINDOW) p.hauling = { weight: 0, trips: 0, since: world.tick };
  p.hauling.weight += weight;
  p.hauling.trips += 1;
}

/** Pure: why this person's own carrying makes them want a cart, or ''. */
export function cartExperience(ctx: Ctx): string {
  const { world, p } = ctx;
  if (!hasTransport(world) || !p.hauling || world.tick - p.hauling.since > HAUL_WINDOW) return '';
  if (p.hauling.weight < HAUL_EXPERIENCE || p.hauling.trips < HAUL_TRIPS) return '';
  return `after carrying ${Math.round(p.hauling.weight)} weight of materials to building sites in ${p.hauling.trips} loads these last days`;
}

const stockAt = (b: Belief, item: ItemKind): number => unitsOf(b.items?.[item]);

function knownCarts(ctx: Ctx): Belief[] {
  const { world, p } = ctx;
  return beliefsByKind(p, ['cart']).filter((b) => b.state === 'parked' && (b.hh === p.hhId || b.hh === 0) && world.byId.get(b.id)?.ent === 'cart');
}

/** The one known place with the most of what is wanted, and the load a cart of this capacity could take from it. */
function bestSource(ctx: Ctx, wanted: Partial<Items>, cap: number, excludeId: number): { src: Belief; load: Items; weight: number } | null {
  const { p } = ctx;
  let best: { src: Belief; load: Items; weight: number } | null = null;
  for (const src of beliefsByKind(p, ['building', 'pile'])) {
    if (src.id === excludeId) continue;
    if (src.kind === 'building' && !(src.btype === 'storehouse' || src.btype === 'granary' || src.hh === p.hhId)) continue;
    const load: Items = {};
    let w = 0;
    for (const k of Object.keys(wanted) as ItemKind[]) {
      const n = Math.min(unitsOf(wanted[k]), stockAt(src, k));
      if (n <= 0) continue;
      const take = Math.min(n, Math.floor((cap - w) / WEIGHT[k]));
      if (take > 0) {
        load[k] = take;
        w += take * WEIGHT[k];
      }
    }
    if (w > 0 && (!best || w > best.weight)) best = { src, load, weight: w };
  }
  return best;
}

function offerTrip(ctx: Ctx, cb: Belief, src: Belief | null, dest: Belief, load: Items, weight: number, label: string, goal: string, key: string, recover: boolean): void {
  const { world, p } = ctx;
  const eCart = hyp(cb.x - p.x, cb.y - p.y) / Math.max(0.03, ctx.speed);
  const eSrc = src ? (hyp(src.x - cb.x, src.y - cb.y) * 1.3) / Math.max(0.03, ctx.speed * 0.85) : 0;
  const from = src ?? cb;
  const eDest = (hyp(dest.x - from.x, dest.y - from.y) * 1.3) / Math.max(0.03, ctx.speed * 0.8);
  const total = eCart + eSrc + eDest;
  const footTrips = Math.max(1, Math.ceil(weight / Math.max(4, CARRY_CAP[ctx.stage as keyof typeof CARRY_CAP] ?? 12)));
  const util = Math.max(6, 22 + Math.min(14, weight * 0.3) + (footTrips > 1 ? Math.min(20, (footTrips - 1) * 6) : 0) - total * 0.02);
  addOption(ctx, {
    kind: 'cart_haul',
    label,
    goal,
    need: null,
    util,
    parts: [[recover ? 'a loaded cart stands idle' : 'a cart can move all of it in one go', 22 + Math.min(14, weight * 0.3)], ...(footTrips > 1 ? [[`it would take ${footTrips} trips on foot`, Math.min(20, (footTrips - 1) * 6)] as [string, number]] : []), ['walking', -total * 0.02]],
    eta: total + 60,
    key,
    targetId: cb.id,
    tag: 'transport',
    make: () => {
      const ce = world.byId.get(cb.id);
      if (!ce || ce.ent !== 'cart') return null;
      return newActivity(world, p, {
        kind: 'cart_haul',
        label: 'Fetching the handcart',
        goal,
        targetId: ce.id,
        targetType: 'cart',
        tx: ce.x,
        ty: ce.y,
        spotX: ce.x,
        spotY: ce.y,
        utility: util,
        minCommit: 60,
        maxTicks: 2600,
        data: { cartId: ce.id, fromId: src?.id ?? 0, toId: dest.id, items: load, leg: 0, sticky: true, ...(recover ? { recover: true } : {}), transport: true },
      });
    },
  });
}

/** Cart trips for the household's live plans, and the recovery of a loaded cart (production.ts, beside the site haul). */
export function cartTripOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!hasTransport(world) || ctx.stage === 'child' || p.indoors) return;
  if (ctx.drives.hunger > 25 || ctx.drives.thirst > 25) return;
  const carts = knownCarts(ctx);
  if (!carts.length) return;
  const footCap = CARRY_CAP[ctx.stage as keyof typeof CARRY_CAP] ?? 12;
  for (const cb of carts) {
    const cart = world.byId.get(cb.id);
    if (!cart || cart.ent !== 'cart') continue;
    if (cartLoaded(cart)) {
      // recovery: the first known site that needs any of the load, else the household's home store
      const load = cart.load;
      const kinds = (Object.keys(load) as ItemKind[]).filter((k) => unitsOf(load[k]) > 0);
      const site = beliefsByKind(p, ['site']).find((s) => (s.hh === p.hhId || s.hh === 0) && kinds.some((k) => unitsOf(s.need?.[k]) > 0));
      const home = site ? null : homeStoreBelief(p);
      // a home store remembered as full is no destination: what it could not take would only be carried there and back
      const dest = site ?? (home && weightOfItems(home.items ?? {}) < BUILD_DEF[(home.btype ?? 'lean_to') as BuildingType].cap ? home : null);
      if (!dest) continue;
      const taken: Items = {};
      for (const k of kinds) taken[k] = unitsOf(load[k]);
      offerTrip(ctx, cb, null, dest, taken, weightOfItems(taken), `Bring the loaded cart to ${site ? `the ${(site.btype ?? 'building').replace('_', ' ')} site` : 'our home store'}`, 'a loaded cart should not stand where it was left', `cart:${cb.id}:recover:${dest.id}`, true);
      continue;
    }
    for (const i of p.intentions) {
      if (i.status !== 'active') continue;
      if (i.kind === 'stock') {
        const home = homeStoreBelief(p);
        if (!home) continue;
        const short = Math.max(0, (i.reserve ?? 0) - foodInBelief(home));
        if (short <= 0) continue;
        const wanted: Partial<Items> = {};
        for (const k of STORABLE) wanted[k] = short;
        const best = bestSource(ctx, wanted, Math.min(cart.cap, short * 1.5), home.id);
        if (!best || best.weight <= footCap) continue;
        // never more food than the plan is short of, whatever the kinds
        let left = short;
        for (const k of Object.keys(best.load) as ItemKind[]) {
          const n = Math.min(best.load[k] ?? 0, left);
          if (n <= 0) delete best.load[k];
          else best.load[k] = n;
          left -= n;
        }
        offerTrip(ctx, cb, best.src, home, best.load, weightOfItems(best.load), `Cart food home from ${best.src.kind === 'pile' ? 'the heap' : (best.src.btype ?? 'the store').replace('_', ' ')}`, `to put food by: ${short} more wanted at home`, `cart:${cb.id}:home:${home.id}:${best.src.id}`, false);
      } else if (i.kind === 'batch') {
        const fac = p.beliefs[i.aboutId];
        if (!fac || fac.kind !== 'building' || !fac.btype || !isFacilityType(fac.btype as BuildingType)) continue;
        const wanted: Partial<Items> = {};
        for (const k of Object.keys(i.wants) as ItemKind[]) {
          const n = planShortfall(p, i.id, k);
          if (n > 0 && acceptedAt(fac.btype as BuildingType).includes(k)) wanted[k] = n;
        }
        if (!Object.keys(wanted).length) continue;
        const best = bestSource(ctx, wanted, cart.cap, fac.id);
        if (!best || best.weight <= footCap) continue;
        offerTrip(ctx, cb, best.src, fac, best.load, best.weight, `Cart ${Object.keys(best.load).join(' and ')} to the ${fac.btype.replace('_', ' ')}`, i.goal, `cart:${cb.id}:batch:${fac.id}:${best.src.id}`, false);
      }
    }
  }
}

/** The person card's line about what they have been carrying. */
export function describeHauling(world: World, p: Person): string[] {
  if (!hasTransport(world) || !p.hauling || world.tick - p.hauling.since > HAUL_WINDOW) return [];
  const why = cartExperience({ world, p } as Ctx);
  return [`Carried ${Math.round(p.hauling.weight)} weight of materials to building sites in ${p.hauling.trips} load${p.hauling.trips === 1 ? '' : 's'} over the last ${Math.max(1, Math.round((world.tick - p.hauling.since) / DAY))} day(s)${why ? '; enough to want a cart' : ''}.`];
}

export function validateTransport(world: World): void {
  for (const p of world.persons) {
    if (!p.hauling) continue;
    if (!runsRulesVersion(world, 55) || !(p.hauling.weight >= 0) || !Number.isInteger(p.hauling.trips) || !Number.isFinite(p.hauling.since)) throw new Error('Invalid hauling record');
  }
}
