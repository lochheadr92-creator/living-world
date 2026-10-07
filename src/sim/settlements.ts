// Where the settlements are.
//
// The ordinary world has one camp (world.camp) and a lot of code is written in terms of "the camp": where workshops are laid out, where
// a homeless person wanders, where travellers arrive, which way wolves prowl, what "near camp" means in a conversation. A world with
// several settlements (a larger map founded in several places) needs each of those to mean "the settlement nearest to where this is
// happening". The original camp stays settlement 0, in `world.camp`; further settlements, if the world has any, are in
// `world.extraSettlements`, which is absent from an ordinary world, so its saves, state hash and behaviour are exactly as they were.
// With no extra settlements every function here returns `world.camp` itself.
import type { Building, Person, World } from './types';

/** the centre of a settlement */
export interface Hub {
  x: number;
  y: number;
}

/** add a settlement besides the original camp */
export function addSettlement(world: World, x: number, y: number): Hub {
  const hub = { x, y };
  (world.extraSettlements ??= []).push(hub);
  return hub;
}

/** how many settlements the world has (at least one: the camp) */
export function settlementCount(world: World): number {
  return 1 + (world.extraSettlements?.length ?? 0);
}

/** the settlement whose centre is nearest to (x, y); the camp wins a tie */
export function nearestHub(world: World, x: number, y: number): Hub {
  const more = world.extraSettlements;
  if (!more || more.length === 0) return world.camp;
  let best: Hub = world.camp;
  let bd = Math.hypot(x - best.x, y - best.y);
  for (const h of more) {
    const d = Math.hypot(x - h.x, y - h.y);
    if (d < bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}

/** is (x, y) within `radius` of any settlement's centre? */
export function hubWithin(world: World, x: number, y: number, radius: number): boolean {
  if (Math.hypot(x - world.camp.x, y - world.camp.y) < radius) return true;
  const more = world.extraSettlements;
  if (more) for (const h of more) if (Math.hypot(x - h.x, y - h.y) < radius) return true;
  return false;
}

/** the lit-or-not camp fire standing nearest to a settlement's centre, if the world has any fire (the first one wins a tie) */
export function fireNear(world: World, hub: Hub): Building | undefined {
  let best: Building | undefined;
  let bd = Infinity;
  for (const b of world.buildings) {
    if (b.type !== 'fire') continue;
    const d = Math.hypot(b.x + 0.5 - hub.x, b.y + 0.5 - hub.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

/** the settlement a person belongs to for the purpose of laying things out: that of their home, or of where they are if they have none */
export function baseHub(world: World, p: Person, home?: Building | null): Hub {
  return home ? nearestHub(world, home.x + home.w / 2, home.y + home.h / 2) : nearestHub(world, p.x, p.y);
}
