// Rules 59: a wanted handcart its maker can build comes before the site materials it is wanted to haul.
//
// Diagnosed (docs/CART_PRIORITY.md): in three 45-day ordinary worlds at rules 58, every sample of a hammer-holder wanting a cart
// (37 of 37) saw the batch planner take planks or bricks for a building site instead, because the cart is wanted on the
// ground of those same site deficits (production.ts wantsCart, 40 weight or more) and a site material's demand base (about 38)
// always exceeds the cart's (14 × work taste). The cart could therefore never be the batch taken on while the reason for wanting
// it existed. Here the cart is moved ahead of the site-tagged wants only, in the batch planner's order of wants; every gate the
// planner applies to a want (a known yard, the technique, the hammer in hand or on the rack, known inputs) is unchanged, so a cart
// nobody can make still yields to the planks. Promises to bring a material to a site keep their place before it.
import type { World } from './types';
import type { Demand } from './production';
import { runsRulesVersion } from './rulesversion';

let enabled = true;
export const cartFirstOn = (): boolean => enabled;
/** Lab switch `rich-no-cart-first`: the batch planner keeps the rules-58 order of wants; no effect below rules 59. */
export function setCartFirst(on: boolean): void {
  enabled = on;
}
export const hasCartFirst = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, 59);

/** Pure. The batch planner's wants with a wanted cart placed before the first site-material want; unchanged otherwise. */
export function orderBatchWants(world: World, wants: Demand[]): Demand[] {
  if (!hasCartFirst(world)) return wants;
  const cart = wants.findIndex((d) => d.item === 'cart');
  if (cart < 0) return wants;
  const site = wants.findIndex((d) => d.tag === 'site');
  if (site < 0 || site > cart) return wants;
  const out = [...wants];
  const [c] = out.splice(cart, 1);
  out.splice(site, 0, c);
  return out;
}
