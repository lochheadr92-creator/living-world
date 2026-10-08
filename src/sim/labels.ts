import type { ActivityKind, BeliefKind, ItemKind, SourceType } from './types';

export const SOURCE_NOUN: Record<SourceType, string> = {
  berry_bush: 'berry bush',
  fruit_tree: 'fruit tree',
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
  berry_bush: 'berry bush',
  fruit_tree: 'fruit tree',
  tree: 'tree',
  rock: 'rock outcrop',
  fish_spot: 'fishing spot',
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
  wander: 'wandering',
  eat: 'eating',
  eat_store: 'eating from stores',
  drink: 'drinking',
  fetch_water: 'fetching water',
  plant_tree: 'planting a tree',
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

export const ITEM_ICON: Record<ItemKind, string> = {
  berries: 'berries',
  fruit: 'fruit',
  fish: 'fish',
  smoked: 'fish',
  grain: 'grain',
  bread: 'bread',
  seeds: 'seeds',
  water: 'water',
  beer: 'water',
  wood: 'wood',
  stone: 'stone',
  clay: 'clay',
  ore: 'ore',
  planks: 'planks',
  furniture: 'planks',
  handles: 'handles',
  bricks: 'bricks',
  charcoal: 'charcoal',
  iron: 'iron',
  flour: 'flour',
  axe: 'axe',
  pick: 'pick',
  hoe: 'hoe',
  basket: 'basket',
  hammer: 'hammer',
  saw: 'saw',
  jar: 'jar',
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
