// Food help a person can honestly promise when their own pack has nothing to spare (rules version 45).
//
// Before 45, a food or care request met an empty-handed helper with "no item" before the promise-to-fetch branch of
// `social.ts evaluateRequest` was ever reached, and the branch that was reachable (some food held, none spare) promised
// "berries" whatever the helper actually knew. This module owns the one new question: WHICH food kind could this helper go
// and get, judged only from their own beliefs about sources they have seen and not lately found bare. The answer names a
// kind, so that the promise, the foraging and the delivery all agree on what is being brought. Nothing here reads the
// world's true sources, anyone else's pack, or any store; nothing here changes state.
import type { FoodKind, Person, World } from './types';
import { estimatedAmount } from './knowledge';
import { isAdultWorker, isDependent } from './people';
import { runsRulesVersion } from './rulesversion';
import { hyp } from './util';

let enabled = true;
export const foodFetchOn = (): boolean => enabled;
/** Lab switch `rich-no-food-fetch`: removes only the empty-handed fetch promise; no effect below rules 45. */
export function setFoodFetch(on: boolean): void {
  enabled = on;
}
export const hasFoodFetch = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 45);

/** What a wild food source yields, by the kind of belief a person holds about it. */
export const SOURCE_FOOD: Readonly<Partial<Record<string, FoodKind>>> = { berry_bush: 'berries', fruit_tree: 'fruit', wild_grain: 'grain', fish_spot: 'fish' };

/** A source's belief is a usable place to fetch food from: not lately found wanting, and believed to hold at least two. */
function usable(world: World, B: Person, id: number): boolean {
  const f = B.failures[id];
  if (f && world.tick - f.tick < 520) return false;
  const b = B.beliefs[id];
  return !!b && estimatedAmount(world, b) >= 2;
}

/**
 * Pure. The food kind B could go and fetch, from the nearest wild source they personally believe still holds some, or null
 * when they know of none. Only wild sources count here: a store someone else keeps is not theirs to promise from, and food in
 * their own home is reached by the ordinary household paths rather than a promise to a neighbour.
 */
export function fetchableFood(world: World, B: Person): FoodKind | null {
  if (!hasFoodFetch(world)) return null;
  // a capable helper: of working age and not themselves a dependant (a small child or a frail elder can still hand over
  // what they carry, as before, but does not promise to go and get more)
  if (!isAdultWorker(world, B) || isDependent(world, B)) return null;
  let best: FoodKind | null = null;
  let bestD = Infinity;
  for (const k in B.beliefs) {
    const b = B.beliefs[k as unknown as number];
    const kind = SOURCE_FOOD[b.kind];
    if (!kind || !usable(world, B, b.id)) continue;
    const d = hyp(b.x - B.x, b.y - B.y);
    if (d < bestD) {
      bestD = d;
      best = kind;
    }
  }
  return best;
}
