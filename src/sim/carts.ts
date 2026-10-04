import { CART_CAP, CART_SPEED_EMPTY, CART_SPEED_LOADED, CART_WEAR_PER_TILE } from './constants';
import { weightOf } from './economy';
import { addEvent } from './events';
import { makeHousePile } from './buildings';
import { hashUnit } from './rng';
import { registerGeneric } from './registry';
import { newId } from './registry';
import type { Cart, Items, Person, Store, World } from './types';
import { T } from './types';

export function newCart(world: World, x: number, y: number, ownerHh: number): Cart {
  const c: Cart = {
    ent: 'cart',
    id: newId(world),
    x,
    y,
    px: x,
    py: y,
    heading: 0.6,
    pheading: 0.6,
    load: {},
    cap: CART_CAP,
    wear: 0,
    ownerHh,
    puller: 0,
    builtTick: world.tick,
    variant: Math.floor(hashUnit(x, y, 131) * 3),
  };
  registerGeneric(world, c);
  return c;
}

export function cartOf(world: World, p: Person): Cart | null {
  if (!p.cartId) return null;
  const e = world.byId.get(p.cartId);
  return e && e.ent === 'cart' ? e : null;
}

export function cartStore(c: Cart): Store {
  return { items: c.load, cap: c.cap };
}

export function cartLoaded(c: Cart): boolean {
  return weightOf(c.load) > 0.01;
}

/** Walking speed factor for someone pulling a cart. */
export function cartSpeedFactor(world: World, p: Person): number {
  const c = cartOf(world, p);
  if (!c) return 1;
  return cartLoaded(c) ? CART_SPEED_LOADED : CART_SPEED_EMPTY;
}

/** Take hold of a parked cart. A person pulls at most one, and a cart has at most one puller. */
export function hitch(world: World, p: Person, c: Cart): boolean {
  if (c.puller && c.puller !== p.id) return false;
  if (p.cartId && p.cartId !== c.id) return false;
  c.puller = p.id;
  p.cartId = c.id;
  return true;
}

/** Let go: the cart stays where it stands. */
export function unhitch(world: World, p: Person): void {
  const c = cartOf(world, p);
  if (c) c.puller = 0;
  p.cartId = 0;
}

/** Carts follow whoever pulls them, a pace behind. Called once per tick after everybody has moved. */
export function updateCarts(world: World): void {
  for (const c of world.carts.slice()) {
    c.px = c.x;
    c.py = c.y;
    c.pheading = c.heading;
    if (!c.puller) continue;
    const e = world.byId.get(c.puller);
    if (!e || e.ent !== 'person' || !e.alive || e.cartId !== c.id) {
      c.puller = 0;
      continue;
    }
    const p = e;
    const dx = p.x - p.px;
    const dy = p.y - p.py;
    const moved = Math.hypot(dx, dy);
    const bx = p.x - Math.cos(p.heading) * 0.9;
    const by = p.y - Math.sin(p.heading) * 0.9;
    // easy follow: the cart trails the puller instead of snapping to them
    c.x += (bx - c.x) * 0.5;
    c.y += (by - c.y) * 0.5;
    const hx = p.x - c.x;
    const hy = p.y - c.y;
    if (hx * hx + hy * hy > 0.01) {
      let target = Math.atan2(hy, hx);
      let d = target - c.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      c.heading += d * 0.35;
      target = 0;
    }
    if (moved > 0 && cartLoaded(c)) {
      c.wear += CART_WEAR_PER_TILE * moved;
      if (c.wear >= 100) breakCart(world, c, p);
    }
  }
}

export function breakCart(world: World, c: Cart, p: Person | null): void {
  if (p) p.cartId = 0;
  const i = world.carts.indexOf(c);
  if (i >= 0) world.carts.splice(i, 1);
  world.byId.delete(c.id);
  // the load is spilled where it stood; the broken cart is not recovered (its wood and planks are written off)
  makeHousePile(world, Math.floor(c.x), Math.floor(c.y), c.load, 'spilled from a broken cart');
  addEvent(world, 'work', `A handcart broke under its load${p ? ` while ${p.name} was pulling it` : ''}.`, p ? [p.id] : [], c.x, c.y);
}

/** Pulling a cart over ground it cannot cross is refused: forest, stony ground and shallow water are barred to wheels. */
export function cartCanCross(world: World, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= world.W || ty >= world.H) return false;
  const t = world.terrain[ty * world.W + tx];
  return t === T.GRASS || t === T.SAND;
}

export function cartLoadItems(c: Cart): Items {
  return c.load;
}
