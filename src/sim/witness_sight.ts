// Rules 183: a witness has to be able to see (gap G17).
//
// Three places decided who saw an act with a fixed radius and "not asleep" only: a theft (misdeeds.ts), a gift, help or quarrel
// (social.ts `witness`) and a birth, death, partnership or taking-in (reputation.ts `noteDeedNear`). None asked whether the person was in
// the same space as the one who acted or how far they could see just then, which `perceive` itself asks. At 183 in a rich world a person
// counts as a witness only if they are in the same space as the actor (both outdoors, or both in the same building) and within the smaller
// of the old radius and their own `senseRadius` (shorter in the dark and in rain). The old radius test still runs first. This means fewer
// witnesses at night and through walls, so fewer stories start. No benefit is claimed.
import { sameSpace } from './habitation';
import { senseRadius } from './perception';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';
import { hyp } from './util';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-witness-sight` restores the fixed radius inside a rules-183 rich world. */
export const witnessSightOn = (): boolean => enabled;
export function setWitnessSight(on: boolean): void { enabled = on; }
export const hasWitnessSight = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 183);

/** Whether `observer` could see what `actor` did at (x, y), the old fixed `radius` being the most they could ever see. */
export function couldWitness(world: World, observer: Person, actor: Person, x: number, y: number, radius: number): boolean {
  return sameSpace(world, observer, actor) && hyp(observer.x - x, observer.y - y) <= Math.min(radius, senseRadius(world, observer));
}
