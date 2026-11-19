import { RECIPE_BY_ID } from './recipes';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
export const workshopErrandOn = () => enabled;
export function setWorkshopErrand(on: boolean): void { enabled = on; }
export function hasWorkshopErrand(world: World): boolean {
  return enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, 259);
}

/** A workshop can disappear after departure. Only the saved errand's shape is required. */
export function validateWorkshopErrands(world: World): void {
  for (const p of world.persons) for (const a of [p.activity, p.suspended]) {
    if (!a || a.data.inputWorkshop === undefined && a.data.inputRecipe === undefined) continue;
    const {inputWorkshop, inputRecipe} = a.data;
    if (!runsRulesVersion(world, 259) || world.settings.dynamics !== 'rich' || a.kind !== 'withdraw' ||
        !Number.isSafeInteger(inputWorkshop) || inputWorkshop <= 0 ||
        typeof inputRecipe !== 'string' || !Object.hasOwn(RECIPE_BY_ID, inputRecipe))
      throw Error('Invalid workshop input errand');
  }
}
