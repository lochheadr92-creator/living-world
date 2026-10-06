import type { BuildingType, FoodKind, Items, ItemKind, MaterialKind, NeedKey, SkillKey, SourceType, ToolKind } from './types';

// ── time ──
/** simulation ticks per real second at 1x playback */
export const TPS = 10;
export const DAY = 2400;
/** the world starts at this fraction of a day (0.30 ≈ 07:12) */
export const START_FRAC = 0.3;
export const SUNRISE = 0.25;
export const SUNSET = 0.77;
export const TWILIGHT = 0.07;

// ── map ──
export const MAP_W = 80;
export const MAP_H = 80;

// ── items ──
export const FOODS: FoodKind[] = ['berries', 'fruit', 'fish', 'smoked_fish', 'grain', 'bread'];
export const TOOLS: ToolKind[] = ['axe', 'pick', 'hoe', 'basket', 'hammer', 'saw', 'jar', 'rod', 'spear'];
export const MATERIALS: MaterialKind[] = ['wood', 'stone', 'clay', 'ore', 'planks', 'handles', 'bricks', 'charcoal', 'iron', 'flour'];
export const ALL_ITEMS: ItemKind[] = [...FOODS, 'seeds', 'water', ...MATERIALS, ...TOOLS];
/** hunger restored by one unit. Bread is milled and baked grain: see docs/ECONOMY.md for where the extra value comes from. */
export const NUTRITION: Record<FoodKind, number> = { berries: 12, fruit: 16, fish: 28, smoked_fish: 30, grain: 22, bread: 30 };
export const WATER_VALUE = 36;
export const WEIGHT: Record<ItemKind, number> = {
  berries: 1,
  fruit: 1,
  fish: 1.5,
  smoked_fish: 1,
  grain: 1,
  bread: 1,
  seeds: 0.25,
  water: 1.5,
  wood: 2,
  stone: 3,
  clay: 3,
  ore: 3,
  planks: 2,
  handles: 0.5,
  bricks: 3,
  charcoal: 0.5,
  iron: 2,
  flour: 1,
  axe: 1,
  pick: 1,
  hoe: 1,
  basket: 1,
  hammer: 1,
  saw: 1,
  jar: 1.5,
  rod: 1,
  spear: 1.5,
};
/**
 * How quickly an item goes off, relative to berries, wherever it is kept (stores, homes, heaps on the ground). Only listed items spoil.
 * Grain, flour and bread keep far better than fruit but are not immune: damp and vermin get at them unless they are kept in a granary.
 */
export const PERISHABLE: Partial<Record<ItemKind, number>> = { berries: 1, fruit: 0.8, fish: 1.6, smoked_fish: 0.2, grain: 0.22, flour: 0.28, bread: 0.5 };
/** a granary's ventilated, vermin-proofed bins cut spoilage of what is kept there to this fraction (when tended) */
export const GRANARY_SPOIL = 0.2;
/** untended for this long, the granary's bins start to go off like any store (and then spoil faster) */
export const GRANARY_TEND_EVERY = DAY * 3;
export const GRANARY_NEGLECT_MULT = 2.2;
export const ITEM_LABEL: Record<ItemKind, string> = {
  berries: 'berries',
  fruit: 'fruit',
  fish: 'fish',
  smoked_fish: 'smoked fish',
  grain: 'grain',
  bread: 'bread',
  seeds: 'seeds',
  water: 'water',
  wood: 'wood',
  stone: 'stone',
  clay: 'clay',
  ore: 'ore',
  planks: 'planks',
  handles: 'handles',
  bricks: 'bricks',
  charcoal: 'charcoal',
  iron: 'iron',
  flour: 'flour',
  axe: 'axe',
  pick: 'pickaxe',
  hoe: 'hoe',
  basket: 'basket',
  hammer: 'hammer',
  saw: 'saw',
  jar: 'water jar',
  rod: 'fishing rod',
  spear: 'spear',
};
export const isToolKind = (k: string): k is ToolKind => (TOOLS as string[]).includes(k);
export const isFoodKind = (k: string): k is FoodKind => (FOODS as string[]).includes(k);

export const CARRY_CAP = { child: 5, youth: 9, adult: 12, elder: 8 } as const;
export const BASKET_BONUS = 6;
/** a water jar holds this many units of water without adding to the load (beyond the jar's own weight) */
export const JAR_WATER_UNITS = 4;

// ── needs ──
export const NEED_KEYS: NeedKey[] = ['hunger', 'thirst', 'energy', 'warmth', 'safety', 'social'];
export const HUNGER_RATE = 0.03;
export const THIRST_RATE = 0.04;
export const ENERGY_RATE = 0.04;
export const SLEEP_RECOVER = 0.115;
export const REST_RECOVER = 0.03;
export const SOCIAL_RATE = 0.017;
/** [starts mattering, strongly pressing] */
export const DRIVE_BANDS: Record<NeedKey, [number, number]> = {
  hunger: [62, 36],
  thirst: [66, 40],
  energy: [46, 20],
  warmth: [52, 30],
  safety: [60, 36],
  social: [48, 26],
};
export const CRITICAL: Record<NeedKey, number> = { hunger: 14, thirst: 14, energy: 8, warmth: 14, safety: 20, social: 0 };

// ── movement ──
export const BASE_SPEED = 0.13;
export const REACH = 1.55;
export const TURN_RATE = 0.42;

// ── perception ──
export const SENSE_RADIUS = 9;
export const PERCEIVE_EVERY = 3;
export const BELIEF_REFRESH_EVERY = 30;

// ── work durations (ticks of work for one cycle) ──
export const WORK: Record<string, number> = {
  berry_bush: 20,
  fruit_tree: 24,
  wild_grain: 26,
  fish_spot: 44,
  tree: 46,
  rock: 60,
  clay_pit: 52,
  ore_vein: 84,
  outcrop: 64,
  water: 18,
  drink: 30,
  eat: 10,
  till: 90,
  plant: 24,
  tend: 30,
  harvest: 42,
  repair: 70,
  deposit: 8,
  withdraw: 8,
};

export type BuildRole = 'home' | 'store' | 'fire' | 'work' | 'meet' | 'water';
export interface BuildDef {
  w: number;
  h: number;
  /** materials that have to arrive at the site before the building can be finished */
  cost: Items;
  /** shorthands for the two raw materials (kept for older callers) */
  wood: number;
  stone: number;
  /** work ticks of construction */
  work: number;
  /** storage capacity in weight units (a workplace's stock of inputs and finished goods is counted against it) */
  cap: number;
  workers: number;
  label: string;
  sleepers: number;
  protect: number;
  role: BuildRole;
  /** one line for the inspector and docs: what the building is for */
  blurb: string;
}

const bd = (d: Omit<BuildDef, 'wood' | 'stone'>): BuildDef => ({ ...d, wood: d.cost.wood ?? 0, stone: d.cost.stone ?? 0 });

/**
 * Every kind of building. The ORDER of these keys is behaviour: `Object.keys(BUILD_DEF).indexOf(type)` salts the hash that decides who takes up a
 * project and keys the memory of failed attempts (production.ts, options_work.ts), so new kinds go at the END or every existing world changes.
 */
export const BUILD_DEF: Record<BuildingType, BuildDef> = {
  lean_to: bd({ w: 1, h: 1, cost: { wood: 4 }, work: 200, cap: 12, workers: 2, label: 'lean-to', sleepers: 3, protect: 5, role: 'home', blurb: 'A rough shelter of branches.' }),
  hut: bd({ w: 2, h: 2, cost: { wood: 8, stone: 4 }, work: 520, cap: 40, workers: 3, label: 'hut', sleepers: 6, protect: 10, role: 'home', blurb: 'A proper home with a small store.' }),
  house: bd({
    w: 2,
    h: 2,
    cost: { wood: 6, planks: 8, bricks: 6 },
    work: 760,
    cap: 70,
    workers: 3,
    label: 'house',
    sleepers: 8,
    protect: 16,
    role: 'home',
    blurb: 'A hut rebuilt in place with planked walls and a brick hearth: warmer, roomier, slower to decay.',
  }),
  storehouse: bd({ w: 2, h: 2, cost: { wood: 10, stone: 4 }, work: 640, cap: 160, workers: 3, label: 'storehouse', sleepers: 0, protect: 0, role: 'store', blurb: 'A shared store for the settlement.' }),
  fire: bd({ w: 1, h: 1, cost: { wood: 2, stone: 3 }, work: 90, cap: 0, workers: 2, label: 'campfire', sleepers: 0, protect: 0, role: 'fire', blurb: 'A fire to warm and gather round.' }),
  timber_yard: bd({
    w: 3,
    h: 2,
    cost: { wood: 10, stone: 4 },
    work: 560,
    cap: 70,
    workers: 3,
    label: 'timber yard',
    sleepers: 0,
    protect: 0,
    role: 'work',
    blurb: 'A sawing and carpentry yard: logs become planks and handles, and carts are built here.',
  }),
  quarry: bd({
    w: 2,
    h: 2,
    cost: { wood: 6, stone: 2 },
    work: 360,
    cap: 60,
    workers: 3,
    label: 'quarry',
    sleepers: 0,
    protect: 0,
    role: 'work',
    blurb: 'A cutting face beside a stone outcrop; cut stone is stacked at the yard.',
  }),
  kiln: bd({
    w: 2,
    h: 2,
    cost: { wood: 4, stone: 12 },
    work: 520,
    cap: 50,
    workers: 2,
    label: 'kiln',
    sleepers: 0,
    protect: 0,
    role: 'work',
    blurb: 'A stone-lined kiln: fires bricks and water jars from clay, and burns wood to charcoal.',
  }),
  smithy: bd({
    w: 2,
    h: 2,
    cost: { wood: 6, stone: 8, bricks: 4 },
    work: 600,
    cap: 40,
    workers: 2,
    label: 'smithy',
    sleepers: 0,
    protect: 0,
    role: 'work',
    blurb: 'A forge and anvil: ore and charcoal become iron, and iron becomes better tools.',
  }),
  granary: bd({
    w: 2,
    h: 2,
    cost: { wood: 6, planks: 8, stone: 4 },
    work: 560,
    cap: 120,
    workers: 2,
    label: 'granary',
    sleepers: 0,
    protect: 0,
    role: 'store',
    blurb: 'Raised, ventilated bins for grain, flour and bread. Each household keeps its own share; grain keeps far longer here when the bins are tended.',
  }),
  bakery: bd({
    w: 2,
    h: 2,
    cost: { wood: 4, stone: 6, bricks: 6 },
    work: 600,
    cap: 40,
    workers: 2,
    label: 'bakery',
    sleepers: 0,
    protect: 0,
    role: 'work',
    blurb: 'A quern and a brick oven: grain is milled to flour and baked into bread.',
  }),
  hall: bd({
    w: 3,
    h: 3,
    cost: { wood: 10, planks: 10, stone: 8 },
    work: 900,
    cap: 60,
    workers: 4,
    label: 'communal hall',
    sleepers: 0,
    protect: 0,
    role: 'meet',
    blurb: 'A long roofed hall with a hearth and trestles: shared meals, company out of the weather, and news carried by whoever sits there.',
  }),
  smokehouse: bd({
    w: 2,
    h: 2,
    cost: { wood: 10, stone: 4 },
    work: 480,
    cap: 40,
    workers: 2,
    label: 'smokehouse',
    sleepers: 0,
    protect: 0,
    role: 'work',
    blurb: 'A low timber shed over a smouldering fire: fish are smoked here until they keep for weeks instead of going off in a day or two.',
  }),
  well: bd({
    w: 1,
    h: 1,
    cost: { wood: 4, stone: 8 },
    work: 380,
    cap: 0,
    workers: 2,
    label: 'well',
    sleepers: 0,
    protect: 0,
    role: 'water',
    blurb: 'A stone-lined shaft with a windlass and a bucket: water in the middle of the settlement, so a drink does not mean a long walk to the lake, or past whatever is lurking there.',
  }),
};

/** every kind of building a household can live in */
export const isHomeType = (t: string | undefined): boolean => t === 'lean_to' || t === 'hut' || t === 'house';
export const homeNoun = (t: string | undefined): string => (t === 'house' ? 'house' : t === 'hut' ? 'hut' : 'lean-to');
/** homes with walls and a roof proper: the sheltered kinds */
export const isSolidHome = (t: string | undefined): boolean => t === 'hut' || t === 'house';

/** scenes in which the workshop, meal and care planners are on (the original staged scenes keep them off so they stay focused) */
export const workRules = (scene: string): boolean => scene === 'natural' || scene === 'workshop' || scene === 'meal' || scene === 'haul' || scene === 'care';

export const FIRE_FUEL_PER_WOOD = 380;
export const FIRE_MAX_FUEL = 2400;
/** condition lost per tick by an unmended building (bad weather makes it worse): a lean-to lasts a couple of weeks, a hut most of a month */
export const DECAY_PER_TICK: Record<BuildingType, number> = {
  lean_to: 0.0031,
  hut: 0.0017,
  house: 0.001,
  storehouse: 0.0016,
  fire: 0,
  timber_yard: 0.0013,
  quarry: 0.0011,
  kiln: 0.0012,
  smithy: 0.0012,
  granary: 0.0012,
  bakery: 0.0014,
  smokehouse: 0.0013,
  hall: 0.0012,
  well: 0.0005,
};
export const REPAIR_GAIN = 28;
/** what a repair of this building prefers to use (the fallback is plain wood at a smaller gain) */
export const REPAIR_USES: Partial<Record<BuildingType, ItemKind>> = { house: 'planks', granary: 'planks', hall: 'planks', kiln: 'bricks', smithy: 'bricks', bakery: 'bricks', well: 'stone' };
export const REPAIR_FALLBACK_GAIN = 18;
/** a building site nobody has worked on or supplied for this long is given up (its materials are left on the ground) */
export const SITE_PATIENCE = DAY * 4;
/** an improvement project (a workshop, a hall, a house rebuild) may wait longer for planks and bricks to be made */
export const PROJECT_PATIENCE = DAY * 7;

// ── tools ──
export interface ToolDef {
  label: string;
  /** hand-made version: what it costs and how long it takes */
  hand: { cost: Items; work: number } | null;
  /** wear gained per tick of use (a tool is broken at 100); iron tools wear at half this rate */
  wear: number;
  blurb: string;
}
export const TOOL_DEFS: Record<ToolKind, ToolDef> = {
  axe: { label: 'axe', hand: { cost: { wood: 2, stone: 1 }, work: 90 }, wear: 0.036, blurb: 'felling trees (and hewing planks the hard way)' },
  pick: { label: 'pickaxe', hand: { cost: { wood: 2, stone: 2 }, work: 100 }, wear: 0.044, blurb: 'breaking rock and digging clay and ore' },
  hoe: { label: 'hoe', hand: { cost: { wood: 2, stone: 1 }, work: 80 }, wear: 0.028, blurb: 'breaking ground and tending crops' },
  basket: { label: 'basket', hand: { cost: { wood: 3 }, work: 70 }, wear: 0.012, blurb: 'carrying more and picking quicker' },
  hammer: { label: 'hammer', hand: { cost: { wood: 1, stone: 2 }, work: 80 }, wear: 0.032, blurb: 'building and repair work, and every kind of smithing' },
  saw: { label: 'saw', hand: { cost: { wood: 2, stone: 2 }, work: 110 }, wear: 0.044, blurb: 'cutting planks with little waste' },
  jar: { label: 'water jar', hand: null, wear: 0.02, blurb: 'carrying more water (it wears a little with each trip to the water)' },
  rod: { label: 'fishing rod', hand: { cost: { wood: 3 }, work: 80 }, wear: 0.014, blurb: 'catching fish faster: a pole, a plaited line and a bone hook' },
  spear: { label: 'spear', hand: { cost: { wood: 3 }, work: 90 }, wear: 0.04, blurb: 'turning a wolf away: a long pole, sharpened and hardened in the fire. A grown person who carries one counts as two to a wolf' },
};
/** one wolf turned away by a spear wears it as much as this many ticks of ordinary work */
export const SPEAR_USE_TICKS = 100;
/** older name for the hand-made recipes, kept so existing option code reads naturally */
export const TOOL_RECIPE: Record<ToolKind, { wood: number; stone: number; work: number; label: string }> = Object.fromEntries(
  (Object.keys(TOOL_DEFS) as ToolKind[]).map((k) => {
    const h = TOOL_DEFS[k].hand;
    return [k, { wood: h?.cost.wood ?? 0, stone: h?.cost.stone ?? 0, work: h?.work ?? 0, label: TOOL_DEFS[k].label }];
  }),
) as Record<ToolKind, { wood: number; stone: number; work: number; label: string }>;
/** duration multiplier of a task when the right tool is used (lower is faster); iron tools use `ironEffect` */
export const TOOL_EFFECT = {
  axe: 0.55,
  pick: 0.55,
  hoe: 0.5,
  hoeTend: 0.7,
  basket: 0.85,
  rod: 0.6,
  hammer: 0.8,
  saw: 0.55,
  ironAxe: 0.42,
  ironPick: 0.42,
  ironHoe: 0.4,
  ironHoeTend: 0.6,
  ironHammer: 0.65,
  ironSaw: 0.42,
  ironBasket: 0.85,
} as const;
/** a tool loses its edge before it breaks: past this wear the benefit fades linearly to nothing at 100 */
export const TOOL_DULL_FROM = 70;
export const TOOL_REPAIR = { handles: { restore: 55, work: 50 }, wood: { restore: 32, work: 70 } };
/** a loaned tool has to come back within this long (a promise with a deadline) */
export const LOAN_TERM = DAY;

// ── carts ──
export const CART_CAP = 42;
/** pulling a loaded cart slows the walker to this fraction of their speed (an empty one is nearly free) */
export const CART_SPEED_LOADED = 0.8;
export const CART_SPEED_EMPTY = 0.94;
/** wear gained per tile pulled when loaded */
export const CART_WEAR_PER_TILE = 0.012;
export const CART_COST: Items = { planks: 4, handles: 2, wood: 2 };

// ── source / regrowth ──
export const SOURCE_ITEM: Record<SourceType, ItemKind> = {
  berry_bush: 'berries',
  fruit_tree: 'fruit',
  tree: 'wood',
  rock: 'stone',
  fish_spot: 'fish',
  wild_grain: 'grain',
  clay_pit: 'clay',
  ore_vein: 'ore',
  outcrop: 'stone',
};
export const SOURCE_MAX: Record<SourceType, number> = { berry_bush: 6, fruit_tree: 8, tree: 5, rock: 10, fish_spot: 10, wild_grain: 5, clay_pit: 48, ore_vein: 30, outcrop: 72 };
export const SOURCE_REGROW: Record<SourceType, number> = {
  berry_bush: 300,
  fruit_tree: 340,
  tree: 0,
  rock: 1500,
  fish_spot: 230,
  wild_grain: 330,
  clay_pit: 0,
  ore_vein: 0,
  outcrop: 0,
};
export const SOURCE_SKILL: Record<SourceType, SkillKey> = {
  berry_bush: 'forage',
  fruit_tree: 'forage',
  wild_grain: 'forage',
  fish_spot: 'fish',
  tree: 'wood',
  rock: 'stone',
  clay_pit: 'stone',
  ore_vein: 'stone',
  outcrop: 'stone',
};
/** deposits are finite: they do not regrow, and a quarry only works an outcrop */
export const DEPOSIT_TYPES: SourceType[] = ['clay_pit', 'ore_vein', 'outcrop'];
export const SAPLING_TICKS = 7200;

// ── farming ──
export const GROW_TICKS = 2600;
export const CARE_DECAY = 0.00032;
export const RIPE_ROT_TICKS = 3800;

// ── skills ──
/** a skill is a work-speed multiplier, between its starting value (about 0.7–1.5) and this ceiling */
export const SKILL_MAX = 1.8;
/** skill gained by finishing one batch of work with that skill (completed work only, never time spent); diminishing near the ceiling */
export const SKILL_GAIN = { carpentry: 0.018, kiln: 0.02, smith: 0.024, bake: 0.02, stone: 0.014, craft: 0.02, build: 0.003 } as const;

// ── life ──
export const AGE_CHILD = 12;
export const AGE_ADULT = 16;
export const AGE_ELDER = 62;
export const AGE_OLD_DEATH_START = 76;
/**
 * The pace of a life. A year of age takes twelve days (two days a month, say): at 1× that is most of an hour, so nobody
 * visibly ages during an ordinary viewing, while a long fast-forward still sees children grow up and the old pass on.
 */
export const DAYS_PER_YEAR = 12;
export const TICKS_PER_YEAR = DAY * DAYS_PER_YEAR;
/** nine months */
export const PREGNANCY_TICKS = Math.round(0.75 * TICKS_PER_YEAR);
/** a mother needs a year and a half between children */
export const BIRTH_SPACING_TICKS = Math.round(1.5 * TICKS_PER_YEAR);
/** chance per year that a settled, well-fed couple conceives (once the spacing has passed) */
export const CONCEPTION_PER_YEAR = 0.5;

// ── decisions ──
export const REVIEW_EVERY = 45;
export const MIN_COMMIT = 70;
export const SWITCH_MARGIN = 1.3;

// ── social ──
export const CONV_REACH = 2.0;
export const REQUEST_TTL = 700;
export const PROMISE_TTL = 1800;
export const GREET_COOLDOWN = 400;
