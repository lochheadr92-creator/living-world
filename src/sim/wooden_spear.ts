// Rules 240 (the owner's direction, 13 November 2026): a wooden spear, and everybody grown wants one.
//
// Since rules 4 a spear has been two wood and a stone, and nobody wanted one who had not met a wolf within the last day
// (options_work.ts wantedTool). Measured at rules 239 (`scripts/wolf_probe.ts`): after four years a settlement of 49 to 70
// held 12 to 20 spears, so most people who meet a wolf meet it empty-handed.
//
// From 240, in rich worlds:
//   wood   a spear made by hand is a sharpened stake: two wood and no stone, 60 ticks of work in place of 85. Nobody has to
//          find stone before they can defend themselves. (An iron one still comes from the smithy, as before.)
//   ready  every grown person without a spear wants one, wolf or no wolf, a little below the other tools (SPEAR_READY
//          against about 2 for a basket and 2.2 for a spear once a wolf has been met), so it is made in the first days and
//          not instead of the basket and the axe.
//
// Every place that reads a hand tool's recipe asks `toolRecipe`, so the plan, the errand for materials, the craft and the
// saved project all agree on what a spear is made of. Nothing is saved. Two switched parts. Rich worlds at rules 240 and later.
import { TOOL_RECIPE } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { ToolKind, World } from './types';

export const WOODEN_SPEAR_PARTS = ['wood', 'ready'] as const;
export type WoodenSpearPart = (typeof WOODEN_SPEAR_PARTS)[number];
const on: Record<WoodenSpearPart, boolean> = { wood: true, ready: true };
/** Lab switch (never saved or hashed): both parts, or one. */
export function setWoodenSpear(enabled: boolean, part?: WoodenSpearPart): void {
  if (part) on[part] = enabled;
  else for (const k of WOODEN_SPEAR_PARTS) on[k] = enabled;
}
export const woodenSpearPartOn = (part: WoodenSpearPart): boolean => on[part];
export const hasWoodenSpear = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 240);

/** the work a wooden spear takes, in place of the 85 of the stone-tipped one */
export const STAKE_WORK = 60;
/** how much a grown person with no spear wants one when no wolf has been met */
export const SPEAR_READY = 1.5;

const STAKE = { ...TOOL_RECIPE.spear, stone: 0, work: STAKE_WORK };
/** What a hand tool is made of in this world: the table in constants.ts, except the wooden spear from rules 240. */
export function toolRecipe(world: World, kind: ToolKind): (typeof TOOL_RECIPE)[ToolKind] {
  return kind === 'spear' && on.wood && hasWoodenSpear(world) ? STAKE : TOOL_RECIPE[kind];
}
/** Does a grown person want a spear though they have met no wolf? Only from rules 240. */
export const wantsSpearReady = (world: World): boolean => on.ready && hasWoodenSpear(world);
