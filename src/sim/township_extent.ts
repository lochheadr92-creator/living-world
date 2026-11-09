// Rules 185: a township keeps a record of how far its building has reached (first slice of gap G150).
//
// A township was a name, a centre point and a founding tick; nothing recorded where its buildings stood. At 185, when a site is finished
// for a household that belongs to a township, or for a shared project of that township, the township's `extent` grows to cover the
// building's footprint and counts the completion. It is a high-water record: buildings finished before 185, buildings a world started
// with and buildings since destroyed are not reconciled, and a hearth fitted into a standing home is not a completion. A public building
// with no project behind it is not attributed to the nearest township, because nearness is not membership. Nothing reads the record for a
// decision: it is not a border, grants no claim and excludes nobody (decision D5 keeps territory and exclusion out of scope). The civic
// history shows it.
import { runsRulesVersion } from './rulesversion';
import { projectAt } from './townships';
import type { Building, Site, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-185 rich world keeps no extent. */
export const townshipExtentOn = (): boolean => enabled;
export function setTownshipExtent(on: boolean): void { enabled = on; }
export const hasTownshipExtent = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 185);

/** Called when `site` has just become, or rebuilt, `b`. Records only; allocates no id and draws no random number. */
export function noteBuilt(world: World, site: Site, b: Building): void {
  if (!hasTownshipExtent(world)) return;
  const townId = b.hhId
    ? world.households.find((h) => h.id === b.hhId)?.townshipId
    : projectAt(world, site.id)?.townshipId;
  const town = townId === undefined ? undefined : world.townships?.find((t) => t.id === townId);
  if (!town) return;
  const x0 = b.x, y0 = b.y, x1 = b.x + b.w - 1, y1 = b.y + b.h - 1;
  const e = town.extent;
  if (!e) { town.extent = { x0, y0, x1, y1, finished: 1, updated: world.tick }; return; }
  e.x0 = Math.min(e.x0, x0); e.y0 = Math.min(e.y0, y0);
  e.x1 = Math.max(e.x1, x1); e.y1 = Math.max(e.y1, y1);
  e.finished += 1; e.updated = world.tick;
}

/** One line for the civic history, or none when nothing has been recorded. */
export function extentLine(name: string, e: { x0: number; y0: number; x1: number; y1: number; finished: number; updated: number } | undefined): string[] {
  if (!e) return [];
  return [`${name}'s recorded building reaches ${e.x1 - e.x0 + 1} by ${e.y1 - e.y0 + 1} tiles, from (${e.x0}, ${e.y0}) to (${e.x1}, ${e.y1}): ${e.finished} ${e.finished === 1 ? 'completion' : 'completions'} recorded, the last at tick ${e.updated}. Earlier buildings are not counted, and this is not a border.`];
}
