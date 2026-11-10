// Rules 190: a grave is never dug in a doorway.
//
// `killPerson` (lifecycle.ts) marks a grave on the nearest free tile to where the person died, and a grave is solid for good
// (registry.ts registerGeneric). A home's door tile is free land, and people die at doors: heading for shelter in a cold snap, or
// at their own threshold. In ordinary meadow (rules 188) Mona died of hunger at the door of the Hazel hut on day 23.9 and her grave
// took the door tile; Sofia and Kai, inside, were refused "home exit is blocked" from then on, and Kai sat at thirst 0 behind it.
// In birch Hugo's grave took the door of a hut he was not even a member of, and Gus was shut in. Nobody can enter such a home
// again either (`canEnterHome`: "home entrance is blocked"), so one death at a threshold ends a household's home for the rest of the
// world's life.
//
// At 190 the grave goes on the nearest free tile that is not the door tile of any standing home or of any site that will have one.
// Nothing else changes: the grave is still placed within five tiles, piles are not solid and are not moved, and a death with no
// other free tile within reach still marks no grave, as before. Rules 189 and earlier, authored worlds (which have no indoor
// habitation to shut in) and `setGraveSite(false)` keep the old placement.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-190 rich world digs graves in doorways again. */
export const graveSiteOn = (): boolean => enabled;
export function setGraveSite(on: boolean): void { enabled = on; }
export const hasGraveSite = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 190);

/** Is this tile the door of a standing building, or where the door of a laid-out site will be? */
export function isDoorTile(w: World, tx: number, ty: number): boolean {
  for (const b of w.buildings) if (b.doorX === tx && b.doorY === ty) return true;
  for (const s of w.sites) if (s.x === tx && s.y + s.h === ty) return true;
  return false;
}

/** May a grave be marked here, as far as this rule is concerned? (The caller still asks for free land that is not sand.) */
export function graveMayTake(w: World, tx: number, ty: number): boolean {
  return !hasGraveSite(w) || !isDoorTile(w, tx, ty);
}
