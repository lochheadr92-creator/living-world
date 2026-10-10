import { faceToward, registerHandler, standSpotFor } from './activities';
import type { WorkResult } from './activities';
import { ITEM_LABEL, TOOL_REPAIR, WORK } from './constants';
import { cartLoaded, cartOf, cartStore, hitch, unhitch } from './carts';
import { buildingLabel } from './buildings';
import { consume, transfer, weightOf } from './economy';
import { addEvent, addFx, addLog } from './events';
import { joinBlocker, noteBlocker, noteWithdraw, recipeOf, startJob, withdrawAllowance, workJob } from './facilities';
import { delBelief, noteFailure, observe } from './knowledge';
import { isRich } from './mood';
import { creditContribution } from './social';
import { findPath } from './pathfinding';
import { carryCap } from './people';
import { RECIPE_BY_ID } from './recipes';
import type { Recipe } from './recipes';
import { releaseBench, toolById, wearFor } from './tools';
import { toolsHeldBy } from './toolreg';
import type { Activity, Building, BuildingType, Items, ItemKind, Person, PoseKind, Site, World } from './types';
import { SKILL_MAX } from './constants';

// ───────────────────────── working at a workshop ─────────────────────────
function operatePose(a: Activity): PoseKind {
  const r = RECIPE_BY_ID[(a.data.running as string) ?? (a.data.recipe as string)];
  if (!r) return 'craft';
  switch (r.id) {
    case 'saw_planks':
      return 'saw';
    case 'hew_planks':
    case 'split_handles':
      return 'chop';
    case 'build_cart':
      return 'hammer';
    case 'quarry_stone':
    case 'mine_ore':
      return 'mine';
    case 'smelt_iron':
      return 'forge';
    case 'mill_flour':
    case 'bake_bread':
      return 'bake';
    case 'tend_granary':
      return 'store';
    default:
      return r.at === 'smithy' ? 'forge' : 'craft';
  }
}

function buildingOf(world: World, a: Activity): Building | null {
  const e = world.byId.get(a.targetId);
  return e && e.ent === 'building' ? e : null;
}

registerHandler('operate', {
  availability: 0.2,
  pose: operatePose,
  begin(world, p, a) {
    const b = buildingOf(world, a);
    if (!b || !b.ops) {
      delBelief(p, a.targetId);
      return 'the workplace is gone';
    }
    observe(world, p, b);
    a.tx = b.x + b.w / 2;
    a.ty = b.y + b.h / 2;
    const r = RECIPE_BY_ID[a.data.recipe as string];
    const job = b.ops.job;
    if (job) {
      const why = joinBlocker(world, b, p);
      if (why) {
        noteBlocker(b, why);
        // (rich worlds) a workplace found busy with a batch one cannot join is remembered as such: the bottleneck a windmill answers
        if (isRich(world)) noteFailure(world, p, b.id, 'busy: ' + why);
        return why;
      }
      a.data.running = job.recipe;
      a.data.joined = true;
      a.label = `Lending a hand: ${recipeOf(job).doing.toLowerCase()}`;
      return;
    }
    if (!r) return 'no such work';
    const err = startJob(world, b, p, r, (a.data.client as number) ?? p.id, (a.data.purpose as string) ?? '', (a.data.destSite as number) ?? 0);
    if (err) {
      noteBlocker(b, err);
      if (isRich(world) && /under way|burning a batch/.test(err)) noteFailure(world, p, b.id, 'busy: ' + err);
      return err;
    }
    a.data.running = r.id;
    a.data.started = true;
    a.label = r.doing;
  },
  work(world, p, a): WorkResult {
    const b = buildingOf(world, a);
    if (!b || !b.ops) return 'fail:the workplace is gone';
    faceToward(p, a.tx, a.ty);
    const res = workJob(world, b, p);
    if (res !== 'stopped' && a.data.destSite) creditContribution(p, a.data.destSite as number, 1);
    if (res === 'stopped') return a.cycle > 0 ? 'done' : 'fail:there was nothing to work on';
    a.cycle++;
    a.progress++;
    const r = RECIPE_BY_ID[a.data.running as string];
    if (a.progress % 16 === 8 && r) addFx(world, r.id === 'quarry_stone' || r.id === 'mine_ore' ? 'mine' : r.at === 'smithy' ? 'sparkle' : r.at === 'bakery' || r.at === 'clamp' ? 'smoke' : r.id === 'saw_planks' ? 'dust' : 'hammer', a.tx, a.ty, b.id);
    if (res === 'worked') return 'done';
    return 'continue';
  },
  onEnd(world, p, a, outcome, detail) {
    releaseBench(world, p);
    const b = buildingOf(world, a);
    if (!b) return;
    observe(world, p, b);
    const r: Recipe | undefined = RECIPE_BY_ID[(a.data.running as string) ?? ''];
    if (a.cycle > 0 && r) {
      const left = b.ops?.job;
      addLog(world, p, 'work', left ? `Worked on ${r.label} at the ${b.type.replace('_', ' ')} for a while (${detail}).` : `Finished ${r.label} at the ${b.type.replace('_', ' ')}.`);
    } else if (outcome === 'failed') {
      addLog(world, p, 'work', `Could not start work at the ${b.type.replace('_', ' ')}: ${detail}.`);
    }
  },
});

// ───────────────────────── mending tools and carts ─────────────────────────
registerHandler('tool_work', {
  availability: 0.4,
  pose: () => 'craft',
  begin(world, p, a) {
    if (a.data.cartId) {
      const c = world.byId.get(a.data.cartId as number);
      if (!c || c.ent !== 'cart') return 'the cart is gone';
      const mat = (p.inv.planks ?? 0) > 0 ? 'planks' : (p.inv.handles ?? 0) > 0 ? 'handles' : (p.inv.wood ?? 0) > 0 ? 'wood' : null;
      if (!mat) return 'nothing to mend it with';
      a.data.mat = mat;
      a.duration = Math.round(80 / p.skills.craft);
      a.tx = c.x;
      a.ty = c.y;
      return;
    }
    const t = toolById(world, a.data.toolId as number);
    if (!t || t.holder !== p.id) return 'the tool is no longer in hand';
    const mat = (p.inv.handles ?? 0) > 0 ? 'handles' : (p.inv.wood ?? 0) > 0 ? 'wood' : null;
    if (!mat) return 'nothing to mend it with';
    a.data.mat = mat;
    a.duration = Math.round(TOOL_REPAIR[mat].work / p.skills.craft);
    a.tx = p.x;
    a.ty = p.y;
  },
  work(world, p, a): WorkResult {
    a.progress++;
    if (a.progress % 12 === 6) addFx(world, 'hammer', p.x, p.y, 0);
    if (a.progress < a.duration) return 'continue';
    const mat = a.data.mat as 'handles' | 'wood' | 'planks';
    if (consume(world, p.inv, mat, 1, 'repairs: mending equipment') < 1) return 'fail:the material went missing';
    if (a.data.cartId) {
      const c = world.byId.get(a.data.cartId as number);
      if (!c || c.ent !== 'cart') return 'fail:the cart is gone';
      c.wear = Math.max(0, c.wear - 40);
      p.skills.craft = Math.min(SKILL_MAX, p.skills.craft + 0.006);
      addLog(world, p, 'work', 'Mended the handcart.');
      return 'done';
    }
    const t = toolById(world, a.data.toolId as number);
    if (!t) return 'fail:the tool is gone';
    const restore = mat === 'handles' ? TOOL_REPAIR.handles.restore : TOOL_REPAIR.wood.restore;
    t.wear = Math.max(0, t.wear - restore);
    p.skills.craft = Math.min(SKILL_MAX, p.skills.craft + 0.006);
    addLog(world, p, 'work', `Mended my ${t.kind} (${Math.round(t.wear)}% worn).`);
    return 'done';
  },
});

// ───────────────────────── hauling with a handcart ─────────────────────────
function containerOf(world: World, id: number): { items: Items; cap: number; ent: Building | Site | null } | null {
  const e = world.byId.get(id);
  if (!e) return null;
  if (e.ent === 'building') return { items: e.store.items, cap: e.store.cap, ent: e };
  if (e.ent === 'pile') return { items: e.items, cap: 9999, ent: null };
  if (e.ent === 'site') return { items: e.delivered, cap: 9999, ent: e };
  return null;
}

function placeName(e: unknown): string {
  const t = e as { ent?: string; type?: string };
  if (t.ent === 'site') return `the ${buildingLabel(t.type as BuildingType)} site`;
  if (t.ent === 'building') return `the ${buildingLabel(t.type as BuildingType)}`;
  return 'the heap';
}

function itemList(want: Items | undefined, cart: { load: Items } | null): string {
  const src = cart && Object.keys(cart.load).some((k) => (cart.load[k as ItemKind] ?? 0) > 0) ? cart.load : (want ?? {});
  const parts = (Object.keys(src) as ItemKind[]).filter((k) => (src[k] ?? 0) > 0).map((k) => `${src[k]} ${ITEM_LABEL[k]}`);
  return parts.length ? parts.join(' and ') : 'the load';
}

function setLeg(world: World, p: Person, a: Activity, leg: number, targetId: number): string | null {
  const e = world.byId.get(targetId);
  if (!e) return 'the place is gone';
  const spot = standSpotFor(world, p, e);
  if (!spot) return 'nowhere to stand';
  // wheels need open ground: check the way is there before setting out
  const path = findPath(world, p.x, p.y, spot.x, spot.y, { exact: spot, cart: true, caller: 'cart_haul' });
  if (path === null) return 'no way through for a cart';
  a.data.leg = leg;
  a.phase = 'travel';
  a.spotX = spot.x;
  a.spotY = spot.y;
  a.path = path;
  a.pi = 0;
  a.pathTries = 1;
  a.stuck = 0;
  a.progress = 0;
  a.lastX = p.x;
  a.lastY = p.y;
  a.targetId = targetId;
  a.label = leg === 1 ? `Pulling the handcart out to ${placeName(e)}` : leg === 2 ? `Hauling ${itemList(a.data.items as Items | undefined, cartOf(world, p))} to ${placeName(e)}` : a.label;
  a.tx = 'x' in e && 'w' in e ? e.x + (e as { w: number }).w / 2 : (e as { x: number }).x;
  a.ty = 'y' in e && 'h' in e ? e.y + (e as { h: number }).h / 2 : (e as { y: number }).y;
  return null;
}

registerHandler('cart_haul', {
  availability: 0.2,
  pose: (a) => ((a.data.leg as number) === 1 || (a.data.leg as number) === 3 ? 'store' : 'pull'),
  begin(world, p, a) {
    const leg = (a.data.leg as number) ?? 0;
    const cart = world.byId.get(a.data.cartId as number);
    if (!cart || cart.ent !== 'cart') return 'the cart is gone';
    if (leg === 0) {
      // before taking hold: can wheels get from the cart to the load, and from the load to where it is going?
      const src = world.byId.get(a.data.fromId as number);
      const dst = world.byId.get(a.data.toId as number);
      if (!src || !dst) return 'the place is gone';
      const s1 = standSpotFor(world, p, src);
      const s2 = standSpotFor(world, p, dst);
      if (!s1 || !s2) return 'nowhere to stand';
      if (findPath(world, cart.x, cart.y, s1.x, s1.y, { exact: s1, cart: true, caller: 'cart_haul' }) === null || findPath(world, s1.x, s1.y, s2.x, s2.y, { exact: s2, cart: true, caller: 'cart_haul' }) === null) return 'no way through for a cart';
      // reached the cart: take hold of it
      if (!hitch(world, p, cart)) return 'someone else has the cart';
      observe(world, p, cart);
      const err = setLeg(world, p, a, 1, a.data.fromId as number);
      if (err) return err;
      return;
    }
    if (leg === 1) {
      // at the pile or store to load from
      const c = containerOf(world, a.data.fromId as number);
      if (!c) return 'the place to load from is gone';
      a.duration = 14;
      return;
    }
    if (leg === 2) {
      a.duration = 14;
      return;
    }
  },
  work(world, p, a): WorkResult {
    const leg = (a.data.leg as number) ?? 0;
    const cart = cartOf(world, p);
    if (!cart) return 'fail:lost hold of the cart';
    a.progress++;
    if (leg === 1) {
      if (a.progress < a.duration) return 'continue';
      const c = containerOf(world, a.data.fromId as number);
      if (!c) return 'fail:the place is gone';
      const want = a.data.items as Record<string, number>;
      let moved = 0;
      for (const k of Object.keys(want)) {
        let n = want[k];
        if (c.ent && c.ent.ent === 'building') n = withdrawAllowance(world, c.ent, p, k as ItemKind, n);
        if (n <= 0) continue;
        const m = transfer(world, c.items, cart.load, cart.cap, k as ItemKind, n, (c.ent ? c.ent.ent : 'pile') + ':' + a.data.fromId, 'cart:' + cart.id, 'loaded onto cart');
        if (m > 0 && c.ent && c.ent.ent === 'building') noteWithdraw(world, c.ent, p, k as ItemKind, m);
        moved += m;
      }
      const e = world.byId.get(a.data.fromId as number);
      if (e) observe(world, p, e);
      if (moved <= 0) return 'fail:there was nothing to load';
      a.cycle = moved;
      addFx(world, 'deliver', cart.x, cart.y, 0);
      const err = setLeg(world, p, a, 2, a.data.toId as number);
      if (err) return `fail:${err}`;
      return 'continue';
    }
    if (leg === 2) {
      if (a.progress < a.duration) return 'continue';
      const dest = world.byId.get(a.data.toId as number);
      if (!dest) return 'partial:the place to unload is gone';
      let moved = 0;
      if (dest.ent === 'site') {
        for (const k of Object.keys(cart.load) as ItemKind[]) {
          const need = (dest.required[k] ?? 0) - (dest.delivered[k] ?? 0) - (dest.used[k] ?? 0);
          if (need <= 0) continue;
          const m = transfer(world, cart.load, dest.delivered, 9999, k, Math.min(need, cart.load[k] ?? 0), 'cart:' + cart.id, 'site:' + dest.id, 'delivery');
          moved += m;
          if (m > 0 && dest.contrib) dest.contrib[p.hhId] = (dest.contrib[p.hhId] ?? 0) + m;
        }
        if (moved > 0) dest.lastWorkTick = world.tick;
        observe(world, p, dest);
        addFx(world, 'deliver', dest.x + dest.w / 2, dest.y + dest.h / 2, 0);
      } else if (dest.ent === 'building') {
        for (const k of Object.keys(cart.load) as ItemKind[]) {
          moved += transfer(world, cart.load, dest.store.items, dest.store.cap, k, cart.load[k] ?? 0, 'cart:' + cart.id, 'building:' + dest.id, 'deposit');
        }
        observe(world, p, dest);
      }
      a.cycle += moved;
      // what could not be unloaded stays on the cart, parked here, for whoever needs it
      unhitch(world, p);
      a.data.leg = 3;
      return moved > 0 ? 'done' : 'partial:nothing could be unloaded';
    }
    return 'done';
  },
  onEnd(world, p, a) {
    if (p.cartId) {
      const c = cartOf(world, p);
      unhitch(world, p);
      if (c && cartLoaded(c)) addLog(world, p, 'work', 'Left the loaded cart where it stood.');
    }
    if (a.cycle > 0) addLog(world, p, 'work', 'Hauled a load by handcart.');
  },
});

void weightOf;
void carryCap;
void cartStore;
void addEvent;
void WORK;
void wearFor;
void toolsHeldBy;
