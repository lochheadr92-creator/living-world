import { ORDINARY_FOUNDERS } from './rules';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

// RULES 251: A BIGGER SETTLEMENT DRAWS NEWCOMERS FASTER.
//
// Measured (docs/GROWTH_PLAN.md "Stage 4: past 130 people", four saved worlds, four years each, one run each, a description): in three
// of the four worlds growth from 100 to 143 people was set by the spacing between arriving groups, which is 6,000 ticks whatever the
// settlement's size (4 groups in every 12-day window against a possible 4.8), while the food gate (3.2 food a head) was shut on 0 to 4
// days of 12 and the roof gate on none. The one world short of food (river, 117 people) had the food gate shut on 7 days of 12 and
// admitted only 2 groups, so the gate that matters already does its work and spacing is what is left. Spoilage, field rot and the
// stocking drive take 15 to 27 percent of food made, flat as people rise, and are not what held growth back.
//
// From 251 the spacing is the ordinary one scaled by the square root of how many people the settlement had in its first camp over how
// many it has now: 6,000 ticks at 28 people or fewer (nothing changes there), about 4,200 at 56, 3,400 at 84, 2,700 at 140, never
// under a fifth of the ordinary spacing. A first dose and not a measured one, chosen to stay well short of proportional so that the
// food gate and the roof gate, which are untouched, remain the brake. Who arrives, how, and whether a group is admitted at all are
// unchanged. Rules 250 and earlier, authored worlds and `setArrivalPace(false)` (lab arm `rich-no-arrival-pace`) keep the fixed spacing.

export const ARRIVAL_PACE_FROM = 251;
/** the fastest pace, as a share of the ordinary spacing */
export const ARRIVAL_PACE_FLOOR = 0.2;

let enabled = true;
export const arrivalPaceOn = (): boolean => enabled;
/** Lab switch `rich-no-arrival-pace`: the spacing between arriving groups stays fixed whatever the size, as before 251; no effect below 251. */
export function setArrivalPace(on: boolean): void {
  enabled = on;
}
export const hasArrivalPace = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, ARRIVAL_PACE_FROM);

/** The ticks that must pass between two arriving groups, given the ordinary `spacing` and the people alive. */
export function arrivalSpacingFor(world: World, people: number, spacing: number): number {
  if (!hasArrivalPace(world) || people <= ORDINARY_FOUNDERS) return spacing;
  const scaled = Math.round(spacing * Math.sqrt(ORDINARY_FOUNDERS / people));
  return Math.max(Math.round(spacing * ARRIVAL_PACE_FLOOR), scaled);
}
