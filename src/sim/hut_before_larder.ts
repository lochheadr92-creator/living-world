// Rules 193: a hut is not held back by the larder.
//
// Since the household-home work (rules 7, docs/HOUSEHOLD_HOME.md "Food comes before a house, deliberately") a household living in a
// lean-to laid out a hut only when it had three food per member to hand (`optPlanBuild`, options_work.ts: "the household has only N food
// to hand and wants M before starting a hut"). In the ordinary worlds of 11 November 2026 (twelve seeds, 45 days, rules 188) the household
// store held nothing at 169 of 174 deaths, 107 of 201 people died in a lean-to household, and 21 of 43 exposure deaths were people in a
// lean-to household: a lean-to gives a warmth bonus of 5 and cover 0.55, which is below the death line at -6 C in rain. The owner asked
// in chat on 11 November 2026 to remove the food gate for housing ("remove the food gate for housing"), revising the recorded
// food-first decision for this gate. At 193 the larder test is gone: the hut is laid out when the household knows three trees and a
// rock, as before, whatever the store holds. The person's own hunger and thirst still come first ("too hungry to start a building",
// the drive gate above it, unchanged), the hut's small pull from a full larder stays, and nothing about building, materials or the
// private shelter and food plans changes. Rules 192 and earlier, authored worlds and `setHutBeforeLarder(false)` keep the larder test.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-193 rich world wants three food per member in hand before a hut again. */
export const hutBeforeLarderOn = (): boolean => enabled;
export function setHutBeforeLarder(on: boolean): void { enabled = on; }
export const hasHutBeforeLarder = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 193);

/** Food per member a lean-to household wanted in hand before laying out a hut, before 193. */
export const LARDER_PER_MEMBER = 3;

/** Does the larder hold the hut back? Never at 193; before it, when the household has less than three food per member to hand. */
export function larderHoldsHut(w: World, foodStock: number, members: number): boolean {
  if (hasHutBeforeLarder(w)) return false;
  return foodStock < LARDER_PER_MEMBER * members;
}
