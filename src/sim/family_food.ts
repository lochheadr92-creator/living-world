// Rules 237 (the growth stream, `docs/GROWTH_PLAN.md` step G): the food a household has put by counts wherever it keeps it.
//
// A couple may conceive only in a settled, fed household: three units of food a head (lifecycle.ts conceptionTick). The count
// (householdFoodPerHead) was written when a household's food was in its members' packs and in the store of its home, and it
// counts those two. Since rules 135 a household may have a cellar, which is another building, and since rules 152 it is dug
// once the household has a proper home; storing food in the cellar is one of the commonest things people do. None of it was
// counted.
//
// Measured at rules 236 (`scripts/family_probe.ts`, `review_evidence/growth-20261113/families/`): of 65,988 checks of a woman of
// 17 to 44 in six worlds over six years, 23.8 in a hundred stopped at "less than three food a head at home", second only to
// having no partner; and of the checks stopped there, most held three a head once the household's other stores are counted
// (river: 560 of 816, the food in cellars).
//
// From 237 the count takes in every building the household owns. The measure itself, three a head, is unchanged, and so is
// every other gate. One switched part. Nothing is saved. Rich worlds at rules 237 and later only.
import { foodUnits } from './economy';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-family-food` counts the packs and the home's store only, as before rules 237. */
export const familyFoodOn = (): boolean => enabled;
export function setFamilyFood(on: boolean): void { enabled = on; }
export const hasFamilyFood = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, 237);

/** The food in the household's buildings other than its home (a cellar, a second roof), or 0 before rules 237. */
export function foodInOtherStores(world: World, hhId: number, homeId: number): number {
  if (!hasFamilyFood(world) || !hhId) return 0;
  let food = 0;
  for (const b of world.buildings) if (b.hhId === hhId && b.id !== homeId) food += foodUnits(b.store.items);
  return food;
}
