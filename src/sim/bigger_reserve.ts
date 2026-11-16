import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

// RULES 253: A HOUSEHOLD PUTS BY FOR THE WHOLE LEAN STRETCH, NOT FOR A COUPLE OF DAYS.
//
// Measured (docs/GROWTH_PLAN.md "Stage 9, first read", 96 lean seasons in twelve 20-year traces, one run each, a description): the food in store
// at the start of a lean season is 5 to 10 units a head at every size from 60 to 180 people, about 1.5 to 3 days; it was empty within 14 days in
// 81 percent of lean seasons at 140 to 179 people; and the seasons that began with under 4 units a head killed 48 percent of a settlement of 100
// or more in ten days, against 11 percent. Read in source (provision.ts): the household's season reserve is two days' eating, capped at 20 units
// whatever the household's size (two and a half people's worth), and the cue opens only three days before winter; the one-day hardship cue is
// capped at 12.
//
// From 253, in rich worlds, two separately switched parts of the season reserve:
//   size    the season target is three days' eating a head and has no flat cap (it is still bounded by the room of the home store, unless a
//           granary is known, as before)
//   window  the season cue opens five days before winter and not three, so there is time to fill a bigger target
// The hardship cue (a household that can see it is short) is unchanged. A first dose and not a measured one. Rules 252 and earlier, authored
// worlds and a switch thrown keep the old target and window.

export const BIGGER_RESERVE_FROM = 253;
export const BIGGER_RESERVE_DAYS = 3;
export const BIGGER_RESERVE_WINDOW = 5;

const on = { size: true, window: true };
export type BiggerReservePart = keyof typeof on;
export const BIGGER_RESERVE_PARTS = Object.keys(on) as BiggerReservePart[];
/** Lab switches (never saved or hashed). */
export const biggerReservePartOn = (part: BiggerReservePart): boolean => on[part];
export function setBiggerReserve(enabled: boolean, part?: BiggerReservePart): void {
  if (part) on[part] = enabled;
  else for (const k of BIGGER_RESERVE_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, BIGGER_RESERVE_FROM);

/** days' eating a head the season target asks for, given the ordinary figure */
export const seasonReserveDays = (world: World, ordinary: number): number => (on.size && runs(world) ? BIGGER_RESERVE_DAYS : ordinary);
/** the flat cap on the season target, given the ordinary one (none from 253) */
export const seasonReserveCap = (world: World, ordinary: number): number => (on.size && runs(world) ? Infinity : ordinary);
/** days before winter the season cue opens, given the ordinary figure */
export const seasonWindowDays = (world: World, ordinary: number): number => (on.window && runs(world) ? BIGGER_RESERVE_WINDOW : ordinary);
