// Rules 235 (the growth stream, `docs/GROWTH_PLAN.md` step E): a standing smithy is a standing want for iron.
//
// Measured at rules 234 (`scripts/supply_probe.ts` on the iron chain, four settlements over five years,
// `review_evidence/growth-20261113/iron/`): no iron was made and no ore mined, with a smithy and a mine standing and 18 to 35
// people a world holding a worn tool an iron one would replace. A step toward iron was somebody's first choice in 138 of 5,071
// daylight looks at which one was offered; it was worth 18 at the middle where ordinary work is worth 32. The only want for
// iron was one person's wish to replace a worn tool (production.ts demandsOf: 13 and a little), three workshops away from the
// ore. Charcoal is different: since rules 10 a standing smithy is a standing want for charcoal, at 30, and charcoal is made
// (6 to 21 a world) and carried between the kiln and the smithy. Ore and iron had no such want.
//
// Four separately switched parts:
//
//   * WANT. Somebody who knows a smithy they may use, with fewer than IRON_KEPT bars of iron lying at the smithies they know,
//     wants the difference, at IRON_WANT (the charcoal want and ten for the walk to the ore). The ordinary planner does the rest: iron lying in a
//     store is collected, else it is smelted (three ore and two charcoal a bar), the ore mined or dug; somebody who does not
//     know smelting wants the lesson and, untaught for two days, may try it (techniques.ts); a mine with no pick on its rack
//     makes a pick wanted (rules 57).
//   * CARRY. Somebody who does not know smelting still brings the ore and the charcoal a batch lacks to the smithy, for
//     whoever does; they are not offered the smelting itself.
//   * COUNT. What lies at a workshop for these two wants is counted from the workshop's own record (site_supply.ts benchStock),
//     not from the glance of rules 169, which remembers one of each kind: before, four charcoal at the smithy were one, the
//     smithy always looked three short, and charcoal went on being made and fetched.
//   * ROOM. The rule of rules 33 (leave the heaviest left-over of wood or stone to free the hands) also applies to ore wanted
//     for a workshop ("no room in my pack for one ore": 93 to 303 refusals a world).
//
// Nothing is saved. Rich worlds at rules 235 and later only; rules 234 and earlier, authored worlds and a switch thrown keep
// the wants, the glance and the refusal as they were.
import { runsRulesVersion } from './rulesversion';
import { benchStock } from './site_supply';
import type { Belief, ItemKind, World } from './types';

/** how many bars of iron a smithy is kept in */
export const IRON_KEPT = 2;
/** what the want counts for, before the person's own diligence: the charcoal want of rules 10 (30) and ten for the walk, since
 * wood for charcoal is at hand and an ore vein lies 24 to 46 tiles from the camp (worldgen.ts placeDeposits). A first dose. */
export const IRON_WANT = 40;
export const IRON_WHY = 'the smithy forges tools from iron';

const on = { want: true, carry: true, count: true, room: true };
export type SmithyIronPart = keyof typeof on;
export const SMITHY_IRON_PARTS = Object.keys(on) as SmithyIronPart[];
/** Lab switches (never saved or hashed). */
export const smithyIronPartOn = (part: SmithyIronPart): boolean => on[part];
export function setSmithyIron(enabled: boolean, part?: SmithyIronPart): void {
  if (part) on[part] = enabled;
  else for (const k of SMITHY_IRON_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 235);

/** COUNT: how many of this the person takes a workshop to hold, for the smithy's standing wants. */
export function smithyShelf(world: World, b: Belief, item: ItemKind): number {
  const glanced = b.items?.[item] ?? 0;
  return on.count && runs(world) ? benchStock(world, b, item, glanced) : glanced;
}

/** WANT: how many bars of iron are wanted, given the smithies this person knows and may use (their beliefs); 0 when none. */
export function ironWanted(world: World, smithies: Belief[]): number {
  if (!on.want || !runs(world) || !smithies.length) return 0;
  let lying = 0;
  for (const b of smithies) lying += smithyShelf(world, b, 'iron');
  return Math.max(0, IRON_KEPT - lying);
}

/**
 * CARRY: whether somebody who cannot work this recipe still brings what it lacks to the workshop: smelting, for the smithy's
 * standing want. (A first draft without this part made no iron in two worlds over five years: the want reached everybody, one
 * to four of twenty knew smelting, and for the rest it ended at "has not learned iron smelting", about 2,000 times a world.)
 */
export function carriesForSmelter(world: World, recipeId: string, why: string): boolean {
  return on.carry && runs(world) && recipeId === 'smelt_iron' && why.startsWith(IRON_WHY);
}

/** ROOM: whether a dig for this raw material wanted by a workshop may be preceded by leaving a left-over (rules 33's rule). */
export function oreLeavesLeftover(world: World, item: ItemKind): boolean {
  return on.room && runs(world) && item === 'ore';
}
