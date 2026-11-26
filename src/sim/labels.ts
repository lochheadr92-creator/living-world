import type { ActivityKind, BeliefKind, SourceType, World } from './types';
import { farmEnabled } from './farm_species';

export const SOURCE_NOUN: Record<SourceType, string> = {
  berry_bush: 'berry bush',
  fruit_tree: 'fruit tree',
  hay_meadow:'hay meadow',
  wild_grain: 'wild grain',
  fish_spot: 'fishing spot',
  tree: 'tree',
  rock: 'rock outcrop',
  clay_pit: 'clay pit',
  ore_vein: 'ore vein',
  outcrop: 'stone outcrop',
};

export const SOURCE_VERB: Record<SourceType, string> = {
  berry_bush: 'Picking berries',
  fruit_tree: 'Picking fruit',
  hay_meadow:'Cutting grass for hay',
  wild_grain: 'Gathering wild grain',
  fish_spot: 'Fishing',
  tree: 'Chopping wood',
  rock: 'Breaking stone',
  clay_pit: 'Digging clay',
  ore_vein: 'Digging ore',
  outcrop: 'Cutting stone',
};

export const FOOD_VALUE: Record<string, number> = { berry_bush: 12, fruit_tree: 16, wild_grain: 22, fish_spot: 28 };

export const BELIEF_NOUN: Record<BeliefKind, string> = {
  livestock:'known livestock',
  prey:'dated deer sightings',
  flood: 'flood-affected ground',
  berry_bush: 'berry bush',
  fruit_tree: 'fruit tree',
  tree: 'tree',
  rock: 'rock outcrop',
  fish_spot: 'fishing spot',
  hay_meadow:'hay meadow',
  wild_grain: 'wild grain',
  clay_pit: 'clay pit',
  ore_vein: 'ore vein',
  outcrop: 'stone outcrop',
  cart: 'handcart',
  water: 'water',
  building: 'building',
  site: 'building site',
  plot: 'field plot',
  pile: 'pile of goods',
  grave: 'grave',
  danger: 'danger',
};

export const ACTIVITY_NOUN: Record<ActivityKind, string> = {
  pay_respects:'paying respects',
  tree_work:'tree work',
  relocate: 'household relocation',
  exchange_journey: 'exchange journey',
  wander: 'wandering',
  attend: 'at a gathering',
  hunt: 'hunting',
  animal_work:'animal keeping',
  gear_work: 'gear work',
  butcher: 'butchering',
  hang_skin: 'hanging a wolf skin',
  alone: 'taking some time alone',
  eat: 'eating',
  eat_store: 'eating from stores',
  drink: 'drinking',
  fetch_water: 'fetching water',
  gather: 'gathering',
  deposit: 'storing goods',
  withdraw: 'taking from storage',
  sleep: 'sleeping',
  rest: 'resting',
  warm: 'warming up',
  build: 'building',
  haul: 'delivering materials',
  repair: 'repairing',
  craft: 'crafting',
  till: 'preparing ground',
  plant: 'planting',
  tend: 'tending crops',
  harvest: 'harvesting',
  socialize: 'seeking company',
  converse: 'talking',
  give: 'giving',
  care: 'caring for someone',
  flee: 'fleeing',
  defend: 'driving a wolf off',
  explore: 'exploring',
  plan_site: 'marking out a building',
  fuel_fire: 'tending the fire',
  argue: 'arguing',
  fulfill: 'keeping a promise',
  search: 'looking for someone',
  claim_home: 'moving in',
  operate: 'working at a workshop',
  tool_work: 'mending a tool',
  cart_haul: 'hauling with a cart',
  attend_meal: 'going to a shared meal',
  host_meal: 'hosting a meal',
  visit: 'checking on someone',
  return_tool: 'returning a tool',
};

/** compass word from a world-space delta, as seen on screen (north = up-screen) */
export function compass(dx: number, dy: number): string {
  const sx = dx - dy;
  const sy = dx + dy;
  const ang = Math.atan2(sx, -sy); // 0 = north, clockwise
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const idx = Math.round(((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  return names[idx];
}

/** The noun for a kind of belief as a world of its own rules says it. Before the farm rules (267) the only livestock was sheep, and what was said and
 *  written down then says "known sheep"; text that reaches a save, a log or a request reads this, so an older world keeps its words. */
export const beliefNoun = (world: World, kind: BeliefKind): string => (kind === 'livestock' && !farmEnabled(world) ? 'known sheep' : BELIEF_NOUN[kind]);
