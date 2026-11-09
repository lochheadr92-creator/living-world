// Rules 181: a crowd is the number of people one knows of, not the world's live count.
//
// `facilityWants` (production.ts) lets "two dozen live here" open the hall want without a yard. It counted every living person in the
// world's register, whether or not the person had ever met them. Here the person feels a crowd when they know of at least CROWD_AT
// people: themselves, and everyone they have a relation with (met, kin or a founder's acquaintance) except those they know have died.
// Someone who has not learned of a death still counts that person. A newcomer who has met few people, or anyone in a large world who
// has met fewer than 23 others, feels no crowd, so their hall want comes later or only through a yard. No benefit is claimed.
import { isRich } from './mood';
import { knowsDeath } from './death_knowledge';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

/** two dozen: the size at which a hall is wanted without a yard */
export const CROWD_AT = 24;

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-known-crowd` restores the world's live count inside a rules-181 rich world. */
export const knownCrowdOn = (): boolean => enabled;
export function setKnownCrowd(on: boolean): void { enabled = on; }
export const hasKnownCrowd = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 181);

/** People this person knows of: themselves, and everyone they hold a relation with who is not known to have died. */
export function peopleKnownOf(p: Person): number {
  let n = 1;
  for (const key of Object.keys(p.relations)) {
    const id = Number(key);
    if (id !== p.id && !knowsDeath(p, id)) n++;
  }
  return n;
}

/** Whether this person feels a crowd (rich worlds only): what they know of at 181, the world's live count before. */
export function feelsCrowd(world: World, p: Person): boolean {
  if (!isRich(world)) return false;
  if (hasKnownCrowd(world)) return peopleKnownOf(p) >= CROWD_AT;
  let alive = 0;
  for (const q of world.persons) if (q.alive) alive++;
  return alive >= CROWD_AT;
}
