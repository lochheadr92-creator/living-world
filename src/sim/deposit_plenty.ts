// Rules 231 (the growth stream, `docs/GROWTH_PLAN.md` step 5): stone outcrops and ore veins hold ten times as much.
//
// The owner's instruction of 13 November 2026, after rules 229 got the higher buildings built: much more stone, without
// littering the world with it; more from the deposits, and the same for iron.
//
// Where the stone goes (measured at rules 229, four settlements over six years, `review_evidence/growth-20261113/site-supply/`):
// 320 to 500 stone is used in six years, and what is abandoned is abandoned short of stone (45 of 100 cellars, 23 of 87 huts
// in the two large settlements, 4 of 16 wells). A camp has two outcrops of 22 to 119 stone and two ore veins of 8 to 50 ore
// (worldgen.ts placeDeposits: 40 to 72 and 14 to 30, times the richness of the ground there, geology.ts); a quarry stands on one
// outcrop and had worked it out within three years, after about thirteen batches of three ("the outcrop is worked out" is the
// commonest refusal in every probe), and from then on stone is the loose rocks, which do not come back.
//
// From 231 an outcrop and an ore vein are laid down holding DEPOSIT_PLENTY times what they held. Nothing else changes: the same
// number of deposits in the same places from the same draws, the same loose rocks, the same work for a batch of three. A first
// dose, not a measured one: at ten a quarry's outcrop is some decades of the cutting measured so far.
//
// This acts when a world is made, so a lab removal at a fork cannot undo it; the comparison is between versions
// (scripts/lab_versions.ts, rules 230 pinned). Rules 230 and earlier and authored worlds are laid down as they were.
import { runsRulesVersion } from './rulesversion';
import type { SourceType, World } from './types';

export const DEPOSIT_PLENTY = 10;

const on = { stone: true, ore: true };
export type DepositPlentyPart = keyof typeof on;
export const DEPOSIT_PLENTY_PARTS = Object.keys(on) as DepositPlentyPart[];
/** Test and probe switches, read only while a world is being made (never saved or hashed). */
export const depositPlentyPartOn = (part: DepositPlentyPart): boolean => on[part];
export function setDepositPlenty(enabled: boolean, part?: DepositPlentyPart): void {
  if (part) on[part] = enabled;
  else for (const k of DEPOSIT_PLENTY_PARTS) on[k] = enabled;
}

/** How many times its former holding a deposit of this kind is laid down with. */
export function depositPlenty(world: World, type: SourceType): number {
  if (world.settings.dynamics !== 'rich' || !runsRulesVersion(world, 231)) return 1;
  if (type === 'outcrop') return on.stone ? DEPOSIT_PLENTY : 1;
  if (type === 'ore_vein') return on.ore ? DEPOSIT_PLENTY : 1;
  return 1;
}
