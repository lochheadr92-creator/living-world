import { CART_COST } from './constants';
import type { BuildingType, FacilityState, Items, ItemKind, SkillKey, ToolKind } from './types';

/**
 * Every transformation the settlement can perform at a workplace. All of it is data: the facility code, the planners, the
 * inspector and docs/ECONOMY.md read this table and nothing else.
 *
 * Accounting rule: when a batch is finished its `inputs` are removed from the world (ledger: "used in …") and its
 * `outputs` are created (ledger: "made …"). Whatever part of an input does not end up in a product is listed in `waste`
 * and is recorded separately ("wasted: …"). Fuel is consumed when the fire is lit ("burned as fuel"). Nothing else changes
 * the ledger.
 */
export interface Recipe {
  id: string;
  label: string;
  /** e.g. "Sawing planks" */
  doing: string;
  at: BuildingType;
  /** transformed into the products */
  inputs: Items;
  /** burned to do the job */
  fuel: Items;
  /** work ticks for one worker of skill 1.0 without the helpful tool */
  work: number;
  /** passive ticks after the work, while the fire burns (nobody has to stand there) */
  burn: number;
  outputs: Items;
  /** the part of `inputs` that is not turned into a product */
  waste: Items;
  wasteWhy: string;
  /** stone is cut out of an outcrop: moved from the deposit into the batch, so nothing is created */
  fromDeposit?: { item: ItemKind; n: number };
  /** the product is a piece of equipment, not a stack of goods */
  toolOut?: { kind: ToolKind; tier: 0 | 1 };
  /** the product is a handcart */
  cartOut?: boolean;
  skill: SkillKey | null;
  /** equipment that speeds the work up (and, when `required`, is needed at all) */
  tool?: { kind: ToolKind; required: boolean; speed: number };
  /** how many people can work on one batch at once */
  workers: number;
  /** what asks for the product (the planner only makes a recipe's product when one of these wants it) */
  serves: string[];
  /** why anyone would want this: shown in the inspector and the docs */
  benefit: string;
}

const none: Items = {};

export const RECIPES: Recipe[] = [
  {
    id: 'hew_planks',
    label: 'hewn planks',
    doing: 'Hewing planks',
    at: 'timber_yard',
    inputs: { wood: 3 },
    fuel: none,
    work: 90,
    burn: 0,
    outputs: { planks: 1 },
    waste: { wood: 2 },
    wasteWhy: 'chips and bark hewn away',
    skill: 'carpentry',
    tool: { kind: 'axe', required: false, speed: 0.62 },
    workers: 2,
    serves: ['planks'],
    benefit: 'Planks without a saw: slow and wasteful (3 wood for 1 plank), but possible with wedges and an axe — or, more slowly still, stones.',
  },
  {
    id: 'saw_planks',
    label: 'sawn planks',
    doing: 'Sawing planks',
    at: 'timber_yard',
    inputs: { wood: 3 },
    fuel: none,
    work: 60,
    burn: 0,
    outputs: { planks: 2 },
    waste: { wood: 1 },
    wasteWhy: 'sawdust and offcuts',
    skill: 'carpentry',
    tool: { kind: 'saw', required: true, speed: 1 },
    workers: 2,
    serves: ['planks'],
    benefit: 'Two planks from three wood in two thirds of the time: twice the yield of hewing.',
  },
  {
    id: 'split_handles',
    label: 'tool handles',
    doing: 'Shaping handles',
    at: 'timber_yard',
    inputs: { wood: 1 },
    fuel: none,
    work: 36,
    burn: 0,
    outputs: { handles: 2 },
    waste: none,
    wasteWhy: '',
    skill: 'carpentry',
    tool: { kind: 'axe', required: false, speed: 0.75 },
    workers: 1,
    serves: ['handles'],
    benefit: 'Straight, seasoned handles for carts and iron tools; also the better way to mend a worn tool.',
  },
  {
    id: 'build_cart',
    label: 'a handcart',
    doing: 'Building a handcart',
    at: 'timber_yard',
    inputs: { ...CART_COST },
    fuel: none,
    work: 190,
    burn: 0,
    outputs: {},
    waste: none,
    wasteWhy: '',
    cartOut: true,
    skill: 'carpentry',
    tool: { kind: 'hammer', required: true, speed: 0.8 },
    workers: 2,
    serves: ['cart'],
    benefit: 'A cart carries three or four times what a person can, over open ground.',
  },
  {
    id: 'quarry_stone',
    label: 'cut stone',
    doing: 'Cutting stone',
    at: 'quarry',
    inputs: {},
    fuel: none,
    work: 100,
    burn: 0,
    outputs: { stone: 3 },
    waste: none,
    wasteWhy: '',
    fromDeposit: { item: 'stone', n: 3 },
    skill: 'stone',
    tool: { kind: 'pick', required: false, speed: 0.55 },
    workers: 3,
    serves: ['stone'],
    benefit: 'Stone from a big outcrop, three at a time, stacked at the yard — nobody has to walk between small rocks.',
  },
  {
    id: 'mine_ore',
    label: 'dig ore',
    doing: 'Digging ore',
    at: 'mine',
    inputs: {},
    fuel: none,
    work: 110,
    burn: 0,
    outputs: { ore: 3 },
    waste: none,
    wasteWhy: '',
    fromDeposit: { item: 'ore', n: 3 },
    skill: 'stone',
    tool: { kind: 'pick', required: true, speed: 0.5 },
    workers: 3,
    serves: ['ore'],
    benefit: 'Ore from a vein, three loads at a time, stacked at the shaft head — far quicker than chipping it out by hand.',
  },
  {
    id: 'fire_bricks',
    label: 'fired bricks',
    doing: 'Firing bricks',
    at: 'kiln',
    inputs: { clay: 4 },
    fuel: { wood: 2 },
    work: 50,
    burn: 420,
    outputs: { bricks: 3 },
    waste: { clay: 1 },
    wasteWhy: 'clay that cracked and shrank in the fire',
    skill: 'kiln',
    workers: 2,
    serves: ['bricks'],
    benefit: 'Bricks for hearths, ovens and proper walls.',
  },
  {
    id: 'fire_jar',
    label: 'a water jar',
    doing: 'Firing a water jar',
    at: 'kiln',
    inputs: { clay: 3 },
    fuel: { wood: 1 },
    work: 70,
    burn: 300,
    outputs: {},
    waste: none,
    wasteWhy: '',
    toolOut: { kind: 'jar', tier: 0 },
    skill: 'kiln',
    workers: 1,
    serves: ['jar'],
    benefit: 'A jar lets its owner carry far more water per trip.',
  },
  {
    id: 'burn_charcoal',
    label: 'charcoal',
    doing: 'Burning charcoal',
    at: 'kiln',
    inputs: { wood: 6 },
    fuel: none,
    work: 40,
    burn: 700,
    outputs: { charcoal: 3 },
    waste: { wood: 3 },
    wasteWhy: 'smoke and ash',
    skill: 'kiln',
    workers: 1,
    serves: ['charcoal'],
    benefit: 'A hotter, lighter fuel than wood: what smelting and forging need.',
  },
  {
    id: 'burn_charcoal_clamp',
    label: 'a clamp of charcoal',
    doing: 'Firing the clamp',
    at: 'clamp',
    inputs: { wood: 10 },
    fuel: none,
    work: 60,
    burn: 1400,
    outputs: { charcoal: 6 },
    waste: { wood: 4 },
    wasteWhy: 'smoke and ash',
    skill: 'kiln',
    workers: 1,
    serves: ['charcoal'],
    benefit: 'Six charcoal from a stack of logs, smouldering for days under turf: the smithy\'s fuel without taking the kiln from its bricks.',
  },
  {
    id: 'smelt_iron',
    label: 'smelted iron',
    doing: 'Smelting iron',
    at: 'smithy',
    inputs: { ore: 3 },
    fuel: { charcoal: 2 },
    work: 70,
    burn: 360,
    outputs: { iron: 1 },
    waste: { ore: 2 },
    wasteWhy: 'slag',
    skill: 'smith',
    workers: 2,
    serves: ['iron'],
    benefit: 'Iron to forge tools that cut faster and last twice as long.',
  },
  ...(['axe', 'pick', 'hoe', 'saw', 'hammer'] as ToolKind[]).map(
    (kind): Recipe => ({
      id: `forge_${kind}`,
      label: `an iron ${kind === 'pick' ? 'pickaxe' : kind}`,
      doing: `Forging an iron ${kind === 'pick' ? 'pickaxe' : kind}`,
      at: 'smithy',
      inputs: { iron: 1, handles: 1 },
      fuel: { charcoal: 1 },
      work: 80,
      burn: 0,
      outputs: {},
      waste: none,
      wasteWhy: '',
      toolOut: { kind, tier: 1 },
      skill: 'smith',
      tool: { kind: 'hammer', required: true, speed: 0.8 },
      workers: 1,
      serves: ['tool_' + kind],
      benefit: 'An iron tool works about a quarter faster than a wooden-and-stone one and wears half as quickly.',
    }),
  ),
  {
    id: 'mill_flour',
    label: 'milled flour',
    doing: 'Milling flour',
    at: 'bakery',
    inputs: { grain: 4 },
    fuel: none,
    work: 70,
    burn: 0,
    outputs: { flour: 3 },
    waste: { grain: 1 },
    wasteWhy: 'husks and chaff',
    skill: 'bake',
    workers: 2,
    serves: ['flour'],
    benefit: 'Flour keeps better than loose grain and is what bread is made of.',
  },
  {
    id: 'mill_flour_wind',
    label: 'milled flour',
    doing: 'Milling at the windmill',
    at: 'mill',
    inputs: { grain: 6 },
    fuel: none,
    work: 40,
    burn: 0,
    outputs: { flour: 5 },
    waste: { grain: 1 },
    wasteWhy: 'bran and dust',
    skill: 'bake',
    workers: 1,
    serves: ['flour'],
    benefit: 'Five flour from six grain in a fraction of the quern\'s time, with the wind doing the grinding; the bakery keeps its oven for bread.',
  },
  {
    id: 'bake_bread',
    label: 'baked bread',
    doing: 'Baking bread',
    at: 'bakery',
    inputs: { flour: 3, water: 2 },
    fuel: { wood: 1 },
    work: 50,
    burn: 180,
    outputs: { bread: 4 },
    waste: none,
    wasteWhy: '',
    skill: 'bake',
    workers: 2,
    serves: ['bread'],
    benefit: 'Four loaves (30 hunger each) from what raw grain gives 3 (22 each): the dough takes up water. Bread keeps well and is what is served at shared meals.',
  },
  {
    id: 'tend_granary',
    label: 'tended bins',
    doing: 'Tending the grain bins',
    at: 'granary',
    inputs: {},
    fuel: none,
    work: 60,
    burn: 0,
    outputs: {},
    waste: none,
    wasteWhy: '',
    skill: null,
    workers: 2,
    serves: ['tend'],
    benefit: 'Turning and airing the bins and clearing out vermin keeps the grain from going off.',
  },
];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export function recipesAt(type: BuildingType): Recipe[] {
  return RECIPES.filter((r) => r.at === type);
}

export const FACILITY_TYPES: BuildingType[] = ['timber_yard', 'quarry', 'kiln', 'smithy', 'bakery', 'granary', 'mine', 'clamp', 'mill'];
/** workplaces whose buildings keep a FacilityState */
export const isFacilityType = (t: BuildingType): boolean => FACILITY_TYPES.includes(t) || t === 'hall';

/** The raw goods a workplace's store accepts for its own work (everything else belongs in a storehouse or a home). */
export function acceptedAt(type: BuildingType): ItemKind[] {
  const set = new Set<ItemKind>();
  for (const r of recipesAt(type)) {
    for (const k of Object.keys(r.inputs) as ItemKind[]) set.add(k);
    for (const k of Object.keys(r.fuel) as ItemKind[]) set.add(k);
    for (const k of Object.keys(r.outputs) as ItemKind[]) set.add(k);
  }
  if (type === 'timber_yard') {
    set.add('wood');
    set.add('planks');
    set.add('handles');
    set.add('hammer');
    set.add('saw');
    set.add('axe');
  }
  if (type === 'quarry') {
    set.add('stone');
    set.add('pick');
  }
  if (type === 'mine') {
    set.add('ore');
    set.add('pick');
  }
  if (type === 'kiln') {
    set.add('clay');
    set.add('wood');
    set.add('bricks');
    set.add('charcoal');
    set.add('jar');
  }
  if (type === 'smithy') {
    set.add('hammer');
    set.add('ore');
    set.add('charcoal');
    set.add('iron');
    set.add('handles');
  }
  if (type === 'bakery') {
    set.add('grain');
    set.add('flour');
    set.add('bread');
    set.add('wood');
    set.add('water');
  }
  if (type === 'granary') {
    set.add('grain');
    set.add('flour');
    set.add('bread');
    set.add('seeds');
  }
  if (type === 'hall') {
    set.add('bread');
    set.add('fish');
    set.add('fruit');
    set.add('berries');
    set.add('grain');
    set.add('wood');
  }
  return [...set];
}

/** Which recipes can produce a given item (for planners working backwards from a need). */
export function recipesMaking(item: ItemKind | 'cart'): Recipe[] {
  if (item === 'cart') return RECIPES.filter((r) => r.cartOut);
  return RECIPES.filter((r) => (r.outputs[item] ?? 0) > 0 || (r.toolOut && r.toolOut.kind === item) || (r.fromDeposit && r.fromDeposit.item === item));
}

export function newOps(): FacilityState {
  return {
    job: null,
    earmarks: [],
    batches: 0,
    produced: {},
    consumed: {},
    contributions: {},
    lastRun: 0,
    lastBlocker: '',
    depositId: 0,
    shares: {},
    present: {},
    builders: {},
    wasted: {},
    tended: 0,
  };
}
