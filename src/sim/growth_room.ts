// Rules 225 (the growth stream, `docs/GROWTH_PLAN.md`): a settlement has no fixed ceiling.
//
// Before 225 the ordinary world carried the limits it was tuned with at 28 founders (rules.ts ORDINARY_RULES): arrivals stopped at
// 54 people and conceptions above 64, four ordinary building sites could be open at once, two improvement projects (three from 55
// people), and one workplace of each kind. A 20-year run at rules 220 (`docs/GENERATION_RUN.md`) showed a settlement that holds at
// about 31 people without arrivals and never passes 59 with them. The owner's instruction of 13 November 2026 was to lift the
// population limits and the building limits: the world is meant to keep growing.
//
// From 225, four separately switched parts:
//
//   * PEOPLE. No number of living people stops a conception or an arrival. What admits an arrival is unchanged: the settlement's
//     food per head and its roofs on that day, and the spacing between groups (lifecycle.ts immigrationTick). What allows a
//     conception is unchanged: a partner, a home, food at home, health (conceptionTick).
//   * SITES. No count of open ordinary sites (homes, wells, cellars, fires, the storehouse) turns a new one away. A household
//     still lays out one site of its own at a time, which is the limit that remains.
//   * PROJECTS. Improvement projects (workshops, halls, granaries; house rebuilds counted apart, as before) may be under way at
//     once to the number of one for every PEOPLE_PER_PROJECT living people, never fewer than the rule allowed before.
//   * WORKPLACES. A settlement may hold one workplace of each kind for every PEOPLE_PER_WORKPLACE living people, never fewer than
//     before: a second storehouse, yard or kiln becomes possible at 56 people, a third at 84. May, not must: somebody still has
//     to want each one and build it.
//
// "Living people" is the settlement's share: all of them in an ordinary world, and in a world founded as several camps the living
// in proportion to one camp's founders, as rules.ts already scales by founders. Nothing is saved: the limits are read from the
// people alive when they are asked for. Rich worlds at rules 225 and later only; rules 224 and earlier, authored worlds and a
// switch thrown keep the limits as they were.
import { runsRulesVersion } from './rulesversion';
import type { Rules } from './rules';
import type { World } from './types';

export const PEOPLE_PER_PROJECT = 14;
export const PEOPLE_PER_WORKPLACE = 28;

const on = { people: true, sites: true, projects: true, workplaces: true };
export type GrowthRoomPart = keyof typeof on;
export const GROWTH_ROOM_PARTS = Object.keys(on) as GrowthRoomPart[];
/** Lab switches (never saved or hashed). */
export const growthRoomPartOn = (part: GrowthRoomPart): boolean => on[part];
export function setGrowthRoom(enabled: boolean, part?: GrowthRoomPart): void {
  if (part) on[part] = enabled;
  else for (const k of GROWTH_ROOM_PARTS) on[k] = enabled;
}

/** Whether this world runs without fixed ceilings (any part of rules 225). */
export function hasGrowthRoom(world: World): boolean {
  return world.settings.dynamics === 'rich' && runsRulesVersion(world, 225) && (on.people || on.sites || on.projects || on.workplaces);
}

/** The living people of one settlement: everyone alive in an ordinary world, one camp's share where the world was founded as several. */
export function livingPerSettlement(world: World): number {
  let alive = 0;
  for (const p of world.persons) if (p.alive) alive++;
  const founders = world.settings.population;
  const camp = world.settings.settlementFounders ?? founders;
  return world.settings.ruleSet === 'scaled' && founders > 0 && camp > 0 && camp < founders ? Math.floor((alive * camp) / founders) : alive;
}

const cache = new WeakMap<Readonly<Rules>, Map<string, Readonly<Rules>>>();

/** The world's limits with the fixed ceilings lifted (rules 225). `base` is what the world ran under before. */
export function withGrowthRoom(world: World, base: Readonly<Rules>): Readonly<Rules> {
  if (!hasGrowthRoom(world)) return base;
  const here = livingPerSettlement(world);
  const key = `${here}:${on.people ? 1 : 0}${on.sites ? 1 : 0}${on.projects ? 1 : 0}${on.workplaces ? 1 : 0}`;
  let byKey = cache.get(base);
  if (!byKey) cache.set(base, (byKey = new Map()));
  let r = byKey.get(key);
  if (!r) {
    const projects = Math.floor(here / PEOPLE_PER_PROJECT);
    r = Object.freeze({
      ...base,
      ...(on.people ? { immigrationCap: Infinity, conceptionCap: Infinity, arrivalGroupCap: Infinity } : {}),
      ...(on.sites ? { maxBasicSites: Infinity, maxOpenSites: Infinity } : {}),
      ...(on.projects ? { projectsBase: Math.max(base.projectsBase, projects), projectsRaised: Math.max(base.projectsRaised, projects) } : {}),
      ...(on.workplaces ? { facilityAllowance: Math.max(base.facilityAllowance, Math.floor(here / PEOPLE_PER_WORKPLACE)) } : {}),
    });
    byKey.set(key, r);
  }
  return r;
}
