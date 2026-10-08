import type { RNG } from './rng';

// ───────────────────────────── terrain ─────────────────────────────
export const T = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, FOREST: 4, STONY: 5 } as const;
export type TerrainType = (typeof T)[keyof typeof T];

// ───────────────────────────── items ─────────────────────────────
export type FoodKind = 'berries' | 'fruit' | 'fish' | 'grain' | 'bread' | 'smoked';
/** Durable equipment. Each one is a `Tool` instance (identity, wear, owner); its presence is mirrored as a count in the holder's Items. */
export type ToolKind = 'axe' | 'pick' | 'hoe' | 'basket' | 'hammer' | 'saw' | 'jar';
/** Raw materials and the things made from them. */
export type MaterialKind = 'wood' | 'stone' | 'clay' | 'ore' | 'planks' | 'handles' | 'bricks' | 'charcoal' | 'iron' | 'flour';
export type ItemKind = FoodKind | ToolKind | MaterialKind | 'seeds' | 'water' | 'beer';
export type Items = Partial<Record<ItemKind, number>>;

export interface Store {
  items: Items;
  /** capacity in weight units */
  cap: number;
}

// ───────────────────────────── people ─────────────────────────────
export type NeedKey = 'hunger' | 'thirst' | 'energy' | 'warmth' | 'safety' | 'social';
export interface Needs {
  hunger: number;
  thirst: number;
  energy: number;
  warmth: number;
  safety: number;
  social: number;
}
export interface Traits {
  generosity: number;
  sociability: number;
  caution: number;
  diligence: number;
  curiosity: number;
}
export type TraitKey = keyof Traits;
export type SkillKey = 'forage' | 'fish' | 'wood' | 'stone' | 'build' | 'farm' | 'craft' | 'carpentry' | 'kiln' | 'smith' | 'bake';
export type Skills = Record<SkillKey, number>;
export type Stage = 'child' | 'youth' | 'adult' | 'elder';

export interface Look {
  skin: number;
  hair: number;
  hairStyle: number;
  shirt: number;
  pants: number;
  hat: number;
  /** body width multiplier ~0.9..1.1 */
  build: number;
  /** adult height multiplier ~0.93..1.08 */
  height: number;
}

export type BeliefKind =
  | 'berry_bush'
  | 'fruit_tree'
  | 'tree'
  | 'rock'
  | 'fish_spot'
  | 'wild_grain'
  | 'water'
  | 'building'
  | 'site'
  | 'plot'
  | 'pile'
  | 'grave'
  | 'cart'
  | 'clay_pit'
  | 'ore_vein'
  | 'outcrop'
  | 'danger';

/** What a person believes about one place/thing. Always a snapshot with a timestamp and an origin. */
export interface Belief {
  id: number;
  kind: BeliefKind;
  x: number;
  y: number;
  /** believed stock for sources */
  amount: number;
  max: number;
  /** tick of the observation this snapshot came from (may be old: memories go stale) */
  seen: number;
  /** 'seen' = personally observed, 'told' = learned from conversation */
  src: 'seen' | 'told';
  from: number;
  /** tick at which the person learned it (differs from `seen` for hearsay) */
  learned: number;
  // extras (kind-specific)
  btype?: string;
  hh?: number;
  cond?: number;
  items?: Items;
  need?: Items;
  state?: string;
  progress?: number;
  fuel?: number;
  /** what a facility looked like when last seen: running recipe, progress, stock waiting for pickup */
  ops?: FacilitySnapshot;
  /** equipment on a rack / in a store when last seen */
  tools?: ToolKind[];
  /** who first saw it (hearsay passes this along unchanged), and how many mouths it has passed through */
  origin?: number;
  hops?: number;
}

/** A person's snapshot of a workplace (always a snapshot with the belief's own timestamp). */
export interface FacilitySnapshot {
  job: string | null;
  progress: number;
  burn: number;
  output: Items;
  inputs: Items;
  blocked: string;
  deposit: number;
  /** what the running batch will yield, and when its fire burns down */
  yields: Items;
  readyAt: number;
  /** who ordered it */
  client: number;
  /** granary: when the bins were last tended */
  tended: number;
}

export interface Relation {
  affinity: number;
  trust: number;
  familiarity: number;
  lastMet: number;
  kin: '' | 'parent' | 'child' | 'partner' | 'sibling';
  /** tick until which they steer clear of each other after a quarrel */
  avoidUntil: number;
  /** favours: >0 they owe me, <0 I owe them */
  debt: number;
  history: { tick: number; text: string }[];
  /** the live grievance this person holds against the other, if any (set by an actual incident, closed by amends or time) */
  grievance: Grievance | null;
  /** last time a grievance between these two was closed (stops a settled quarrel from starting the same apology loop again) */
  settledAt: number;
}

export type GrievanceCause = 'competition' | 'scarcity' | 'refusal' | 'broken_promise' | 'harm';
export interface Grievance {
  cause: GrievanceCause;
  detail: string;
  since: number;
  /** 0..100, falls with time, apologies, gifts and working together */
  weight: number;
  apologies: number;
  lastAmends: number;
}

export interface Failure {
  tick: number;
  reason: string;
  count: number;
}

export interface LogEntry {
  tick: number;
  text: string;
  kind: 'work' | 'social' | 'need' | 'danger' | 'life' | 'info';
}

export interface SeenEntity {
  id: number;
  ent: 'person' | 'animal';
  x: number;
  y: number;
  hungry: boolean;
  thirsty: boolean;
  tired: boolean;
  cold: boolean;
  hurt: boolean;
  child: boolean;
  carrying: ItemKind[];
  asleep: boolean;
  /** what they are visibly doing */
  act: ActivityKind | '';
  busyTalking: boolean;
}

export type ActivityKind =
  | 'wander'
  | 'eat'
  | 'eat_store'
  | 'drink'
  | 'fetch_water'
  | 'plant_tree'
  | 'gather'
  | 'deposit'
  | 'withdraw'
  | 'sleep'
  | 'rest'
  | 'warm'
  | 'build'
  | 'haul'
  | 'repair'
  | 'craft'
  | 'till'
  | 'plant'
  | 'tend'
  | 'harvest'
  | 'socialize'
  | 'converse'
  | 'give'
  | 'care'
  | 'flee'
  | 'explore'
  | 'plan_site'
  | 'fuel_fire'
  | 'argue'
  | 'fulfill'
  | 'search'
  | 'claim_home'
  | 'operate'
  | 'tool_work'
  | 'cart_haul'
  | 'attend_meal'
  | 'host_meal'
  | 'visit'
  | 'return_tool';

export type PoseKind =
  | 'stand'
  | 'walk'
  | 'run'
  | 'pick'
  | 'chop'
  | 'mine'
  | 'fish'
  | 'drink'
  | 'eat'
  | 'sleep'
  | 'sit'
  | 'build'
  | 'till'
  | 'plant'
  | 'tend'
  | 'harvest'
  | 'craft'
  | 'talk'
  | 'give'
  | 'argue'
  | 'store'
  | 'saw'
  | 'hammer'
  | 'forge'
  | 'bake'
  | 'dig'
  | 'pull'
  | 'fear';

export interface Activity {
  id: number;
  kind: ActivityKind;
  label: string;
  goal: string;
  need: NeedKey | null;
  phase: 'travel' | 'work';
  targetId: number;
  targetType: string;
  /** target position in world coords (center of tile for objects, live for people) */
  tx: number;
  ty: number;
  spotX: number;
  spotY: number;
  item: ItemKind | null;
  amount: number;
  start: number;
  minCommit: number;
  expire: number;
  progress: number;
  pprogress: number;
  duration: number;
  cycle: number;
  path: number[];
  pi: number;
  pathTries: number;
  stuck: number;
  lastX: number;
  lastY: number;
  claims: number[];
  utility: number;
  blocked: string;
  data: Record<string, any>;
}

export type CommitmentStatus = 'active' | 'done' | 'broken' | 'cancelled' | 'expired' | 'interrupted' | 'moot' | 'failed';
export interface Commitment {
  id: number;
  requestId: number;
  kind: 'deliver' | 'help_build' | 'tell' | 'return_tool' | 'haul' | 'work';
  to: number;
  item: ItemKind | null;
  /** quantity promised */
  amount: number;
  siteId: number;
  made: number;
  deadline: number;
  status: CommitmentStatus;
  /** work ticks / deliveries actually contributed (keeps a help promise honest even if the job is not finished) */
  contrib?: number;
  /** where it is to be delivered (a site, a building, or a person; x/y give the place) */
  destKind?: 'site' | 'building' | 'person' | 'spot';
  destId?: number;
  /** units already handed over */
  delivered?: number;
  /** why it ended the way it did (shown in the inspector) */
  reason?: string;
  /** tool commitments */
  toolId?: number;
  /** when the helper last had to put it aside for their own survival */
  setAside?: number;
  /** ticks of sleep and survival chores that count as extra time before the deadline */
  grace?: number;
  /** the last thing that stopped them (no stock, no known source, site waiting for something else) and when */
  blocked?: string;
  blockedAt?: number;
  /** for a promise to work: the milestone that settles it */
  milestone?: string;
}

export interface Errand {
  kind: 'site' | 'stock' | 'fire' | 'request';
  targetId: number;
  item: ItemKind | null;
  amount: number;
  expires: number;
  note: string;
}

export interface OptionSummary {
  kind: string;
  label: string;
  utility: number;
  parts: [string, number][];
  blocked?: string;
}

export interface DecisionRecord {
  tick: number;
  trigger: string;
  chosen: OptionSummary | null;
  alternatives: OptionSummary[];
  blocked: OptionSummary[];
  considered: number;
  knownPlaces: number;
  seenNow: number;
  because: string;
}

export interface ResultRecord {
  tick: number;
  label: string;
  outcome: 'success' | 'failed' | 'interrupted' | 'partial';
  detail: string;
}

export interface Speech {
  text: string;
  until: number;
  kind: 'say' | 'ask' | 'warn' | 'angry' | 'happy' | 'think';
}

export interface Person {
  ent: 'person';
  id: number;
  name: string;
  sex: 'f' | 'm';
  look: Look;
  x: number;
  y: number;
  px: number;
  py: number;
  heading: number;
  pheading: number;
  birthTick: number;
  alive: boolean;
  health: number;
  needs: Needs;
  traits: Traits;
  skills: Skills;
  inv: Items;
  hhId: number;
  parents: number[];
  children: number[];
  partnerId: number;
  pregnantUntil: number;
  pregnantBy: number;
  beliefs: Record<number, Belief>;
  /** index of belief ids by kind (maintained by putBelief / delBelief) */
  bykind: Partial<Record<BeliefKind, number[]>>;
  whereabouts: Record<number, { x: number; y: number; tick: number }>;
  explored: Uint8Array;
  seen: SeenEntity[];
  relations: Record<number, Relation>;
  failures: Record<number, Failure>;
  commitments: Commitment[];
  errand: Errand | null;
  activity: Activity | null;
  suspended: Activity | null;
  pose: PoseKind;
  convId: number;
  speech: Speech | null;
  wave: number;
  log: LogEntry[];
  lastDecision: DecisionRecord | null;
  lastResult: ResultRecord | null;
  lastPercept: { tick: number; seen: number; newBeliefs: number };
  nextThink: number;
  cooldowns: Record<string, number>;
  /** chronotype offset to desynchronise bedtimes */
  chrono: number;
  asked: Record<number, number>;
  told: Record<number, number>;
  lastExploreTick: number;
  stats: { gathered: number; given: number; received: number; built: number; talked: number; farmed: number; crafted: number };
  lastAteTick: number;
  deathCause: string;
  diedTick: number;
  stampX: number;
  stampY: number;
  /** the handcart this person is pulling (0 = none) */
  cartId: number;
  /** worries about people they have seen in need or been told about (bounded, each with its own provenance) */
  concerns: Concern[];
  /** the last conversation or quarrel that ended, kept apart from whatever is going on now */
  lastInteraction: InteractionRecord | null;
  /** how they are doing, summed from what has happened to them (rich dynamics only; absent otherwise) */
  mood?: Mood;
}

/** One thing that is weighing on, or lifting, a person for a while. */
export interface Thought {
  kind: string;
  /** signed: its effect on mood while fresh; it fades to nothing at `until` */
  value: number;
  since: number;
  until: number;
  why: string;
}
export interface Mood {
  /** -100 (miserable) .. 100 (buoyant); refreshed every few seconds */
  level: number;
  thoughts: Thought[];
  /** until this tick they are at the end of their patience: withdrawn and short-tempered (mood.ts) */
  breakUntil?: number;
}

export interface InteractionRecord {
  tick: number;
  partner: number;
  purpose: ConvPurpose | 'argument';
  /** did this person start it or answer it */
  role: 'asked' | 'answered';
  /** how it came out, taken from the same exchange (a request's status, an apology's result…) */
  outcome: string;
  detail: string;
}

export interface Concern {
  about: number;
  kind: 'hungry' | 'thirsty' | 'cold' | 'hurt' | 'tired' | 'missing';
  /** when the observation was made (hearsay keeps the original age) */
  seen: number;
  src: 'seen' | 'told';
  from: number;
  /** last time someone checked on it (cooldown) */
  checked: number;
}

// ───────────────────────────── world objects ─────────────────────────────
export type SourceType = 'berry_bush' | 'fruit_tree' | 'tree' | 'rock' | 'fish_spot' | 'wild_grain' | 'clay_pit' | 'ore_vein' | 'outcrop';

export interface Source {
  ent: 'source';
  id: number;
  type: SourceType;
  x: number;
  y: number;
  item: ItemKind;
  amount: number;
  max: number;
  reserved: number;
  regrowEvery: number;
  regrowTimer: number;
  variant: number;
  /** 0..1; trees grow from sapling to mature */
  growth: number;
  solid: boolean;
  lastTaker: number;
  lastTakeTick: number;
}

export type BuildingType =
  | 'lean_to'
  | 'hut'
  | 'house'
  | 'storehouse'
  | 'fire'
  | 'timber_yard'
  | 'quarry'
  | 'kiln'
  | 'smithy'
  | 'granary'
  | 'bakery'
  | 'hall'
  // the village-economy expansion (rich dynamics only; docs/BUILDINGS.md)
  | 'well'
  | 'cellar'
  | 'mine'
  | 'forester'
  | 'stockyard'
  | 'clamp'
  | 'mill'
  | 'smokehouse'
  | 'brewery';

export interface Building {
  ent: 'building';
  id: number;
  type: BuildingType;
  x: number;
  y: number;
  w: number;
  h: number;
  condition: number;
  hhId: number;
  store: Store;
  fuel: number;
  builtTick: number;
  doorX: number;
  doorY: number;
  variant: number;
  /** people currently sleeping inside / using it (ids) */
  inside: number[];
  /** workplaces: the running batch, stock waiting for pickup, who contributed */
  ops?: FacilityState;
  /** set while a home upgrade is under way (the site id) */
  upgrading?: number;
}

// ───────────────────────────── workplaces ─────────────────────────────
/** One batch being made at a workplace. Its inputs have been taken out of the store but still exist (held here). */
export interface Job {
  recipe: string;
  client: number;
  purpose: string;
  destSite: number;
  phase: 'work' | 'burn' | 'ready';
  started: number;
  /** the last tick anyone put work into the batch (a batch nobody returns to is shelved) */
  lastWork: number;
  progress: number;
  total: number;
  burnLeft: number;
  burnTotal: number;
  held: Items;
  /** person id -> work ticks contributed to this batch */
  workers: Record<number, number>;
  blocked: string;
}

/** Finished goods that belong to whoever ordered them until the claim runs out. */
export interface Earmark {
  /** 'in' = delivered by a visitor for their own batch; 'out' = finished goods waiting for whoever ordered them */
  kind: 'in' | 'out';
  item: ItemKind;
  n: number;
  owner: number;
  until: number;
  reason: string;
}

export interface FacilityState {
  job: Job | null;
  earmarks: Earmark[];
  batches: number;
  produced: Items;
  consumed: Items;
  /** lifetime work ticks per person, for the inspector */
  contributions: Record<number, number>;
  lastRun: number;
  lastBlocker: string;
  /** quarry: the deposit being worked */
  depositId: number;
  /** granary: whose grain is whose (household id -> items) */
  shares: Record<number, Items>;
  /** people who have been seen working here recently (id -> tick), used for crowding */
  present: Record<number, number>;
  /** household id -> share (0..1) of what it took to build, which decides who may use it besides its owner */
  builders: Record<number, number>;
  /** waste recorded per cause, for the inspector */
  wasted: Record<string, number>;
  /** the last tick its bins were tended (granary) */
  tended: number;
}

// ───────────────────────────── tools and carts ─────────────────────────────
export interface Tool {
  ent: 'tool';
  id: number;
  kind: ToolKind;
  /** 0 = wood and stone, 1 = iron */
  tier: 0 | 1;
  /** 0 new .. 100 broken */
  wear: number;
  /** household that owns it (0 = settlement property, kept on a shared rack) */
  ownerHh: number;
  /** id of the person, building, pile or cart physically holding it */
  holder: number;
  loan: { lender: number; borrower: number; due: number } | null;
  madeTick: number;
  maker: number;
}

export interface Cart {
  ent: 'cart';
  id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  heading: number;
  pheading: number;
  load: Items;
  /** weight capacity of the bed */
  cap: number;
  wear: number;
  ownerHh: number;
  /** the person pulling it (0 = parked) */
  puller: number;
  builtTick: number;
  variant: number;
}

export interface Site {
  ent: 'site';
  id: number;
  type: BuildingType;
  x: number;
  y: number;
  w: number;
  h: number;
  hhId: number;
  creatorId: number;
  required: Items;
  delivered: Items;
  used: Items;
  work: number;
  workTotal: number;
  createdTick: number;
  lastWorkTick: number;
  maxWorkers: number;
  status: string;
  variant: number;
  /** a home being improved in place: the building that stands here */
  upgradeOf?: number;
  /** a quarry site is laid out beside this deposit */
  depositId?: number;
  /** household id -> value contributed (1 per unit of material, 1 per 25 work ticks): decides who holds title when it is finished */
  contrib?: Record<number, number>;
}

export type PlotState = 'tilling' | 'tilled' | 'growing' | 'ripe';
export interface Plot {
  ent: 'plot';
  id: number;
  x: number;
  y: number;
  hhId: number;
  state: PlotState;
  /** tilling progress or growth 0..1 */
  progress: number;
  care: number;
  careAcc: number;
  stock: number;
  seedStock: number;
  sownTick: number;
  ripeTick: number;
  claimedBy: number;
  lastTended: number;
  variant: number;
}

export interface Pile {
  ent: 'pile';
  id: number;
  x: number;
  y: number;
  items: Items;
  since: number;
  note: string;
}

export interface Grave {
  ent: 'grave';
  id: number;
  x: number;
  y: number;
  name: string;
  died: number;
  age: number;
}

export interface Animal {
  ent: 'animal';
  id: number;
  type: 'wolf';
  x: number;
  y: number;
  px: number;
  py: number;
  heading: number;
  pheading: number;
  state: 'roam' | 'stalk' | 'attack' | 'retreat';
  targetId: number;
  denX: number;
  denY: number;
  cooldown: number;
  until: number;
  wanderX: number;
  wanderY: number;
  health: number;
  stuck: number;
  lastX: number;
  lastY: number;
  path: number[];
  pi: number;
  pathAt: number;
  pathGoalX: number;
  pathGoalY: number;
}

export interface Household {
  id: number;
  name: string;
  members: number[];
  color: number;
  homeId: number;
  headId: number;
  formed: number;
  /** food the household has found gone off in its own stores lately, with when it was last added to (rich dynamics; storage.ts) */
  lost?: { units: number; tick: number };
}

export type Entity = Person | Source | Building | Site | Plot | Pile | Grave | Animal | Cart;

// ───────────────────────────── social ─────────────────────────────
export type RequestKind = 'food' | 'water' | 'wood' | 'stone' | 'seeds' | 'tool' | 'help_build' | 'info' | 'trade' | 'care' | 'goods' | 'repair' | 'haul' | 'work';
export type RequestStatus = 'pending' | 'promised' | 'fulfilled' | 'declined' | 'expired' | 'failed' | 'broken' | 'interrupted' | 'cancelled';

export interface Request {
  id: number;
  kind: RequestKind;
  from: number;
  to: number;
  item: ItemKind | null;
  amount: number;
  offer: ItemKind | null;
  offerAmount: number;
  siteId: number;
  infoKind: string;
  created: number;
  expires: number;
  status: RequestStatus;
  note: string;
  resolved: number;
  /** what the requester needs it for, in their words */
  purpose?: string;
  /** where the goods or work are wanted */
  destKind?: 'site' | 'building' | 'person' | 'spot';
  destId?: number;
  destX?: number;
  destY?: number;
  /** when the requester needs it by (0 = no particular time) */
  deadline?: number;
  /** concrete milestone for work requests, e.g. "hut at 60%" */
  milestone?: string;
  toolKind?: ToolKind | null;
  /** how it ended, in a word the inspector can show */
  outcome?: string;
  /** the commitment created when it was promised */
  commitmentId?: number;
}

export type ConvPurpose =
  | 'chat'
  | 'request'
  | 'info'
  | 'offer'
  | 'apologize'
  | 'warn'
  | 'recruit'
  | 'propose'
  | 'ask_info'
  | 'trade'
  | 'invite'
  | 'check_in'
  | 'lend'
  | 'report';

export interface Conversation {
  id: number;
  a: number;
  b: number;
  purpose: ConvPurpose;
  start: number;
  phase: number;
  nextAt: number;
  end: number;
  requestId: number;
  data: Record<string, any>;
}

// ───────────────────────────── shared meals ─────────────────────────────
export interface Meal {
  id: number;
  host: number;
  /** the place: a hall, a home or a fire, with where to stand */
  placeId: number;
  placeName: string;
  x: number;
  y: number;
  created: number;
  /** when the food is to be ready and people are to have arrived */
  at: number;
  invited: number[];
  accepted: number[];
  arrived: number[];
  ate: number[];
  /** person id -> why they did not take part */
  missed: Record<number, string>;
  /** the food set out for this meal (physically here, counted in the world's totals) */
  table: Items;
  servings: number;
  /** servings already reserved for accepted guests */
  reserved: number;
  status: 'inviting' | 'gathering' | 'eating' | 'done' | 'cancelled';
  end: string;
}

// ───────────────────────────── world ─────────────────────────────
export type EventKind = 'survival' | 'social' | 'build' | 'farm' | 'life' | 'nature' | 'danger' | 'trade' | 'conflict' | 'work';

export interface WorldEvent {
  id: number;
  tick: number;
  kind: EventKind;
  text: string;
  ids: number[];
  x: number;
  y: number;
}

export interface FxEvent {
  tick: number;
  type: string;
  x: number;
  y: number;
  a: number;
}

export interface Reservation {
  id: number;
  owner: number;
  kind: 'unit' | 'slot' | 'plot';
  target: number;
  amount: number;
  expires: number;
}

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm';
export interface Weather {
  kind: WeatherKind;
  /** smoothed 0..1 precipitation */
  rain: number;
  /** smoothed 0..1 cloud cover */
  cloud: number;
  /** smoothed 0..1 storm intensity */
  storm: number;
  nextChange: number;
  /** ambient temperature, approx deg C */
  temp: number;
  wind: number;
}

export interface Ledger {
  initial: Items;
  created: Items;
  consumed: Items;
  spoiled: Items;
  /** explicit processes that created / consumed things, for the debug view */
  reasons: Record<string, number>;
}

export interface Settings {
  seed: string;
  population: number;
  harsh: boolean;
  immigration: boolean;
  scene: SceneId;
  /** which limits on settlement size apply (rules.ts); absent means 'ordinary', as do saves from before it existed */
  ruleSet?: RuleSet;
  /** a larger world, founded in several places (profiles.ts); absent means the ordinary 80x80 world with one camp */
  profile?: 'large' | 'huge';
  /** how many of the founders live together in one settlement, for the limits that follow a settlement (rules.ts); absent means all of them */
  settlementFounders?: number;
  /** 'rich': people have a mood that changes what they do, and lean seasons happen (mood.ts, hardship.ts); absent means 'authored', the world as it was */
  dynamics?: 'authored' | 'rich';
}
/** 'ordinary': the village-sized limits the world was tuned for. 'scaled': the same limits as ratios of the founding population, local to a settlement. */
export type RuleSet = 'ordinary' | 'scaled';
export type SceneId = 'natural' | 'contest' | 'help' | 'cooperate' | 'workshop' | 'meal' | 'haul' | 'care';

export interface SpatialGrid {
  cell: number;
  cw: number;
  ch: number;
  cells: Entity[][];
}

export interface World {
  settings: Settings;
  seed: string;
  /** label shown in the UI when a staged scene is active */
  sceneLabel: string;
  tick: number;
  rng: RNG;
  W: number;
  H: number;
  terrain: Uint8Array;
  /** 1 where an object (tree, rock, building, site) blocks walking */
  solid: Uint8Array;
  /** id of the object occupying a tile (source, building, site, plot, grave) or 0 */
  occ: Int32Array;
  /** walking-wear 0..1 (desire paths) */
  wear: Float32Array;
  /** per 4x4 coarse cell: tile index of a representative water-access tile, or -1 */
  accessCell: Int32Array;
  /** Manhattan distance to the nearest water tile (capped at 255) */
  waterDist: Uint8Array;
  /** tiles felled trees left behind (cosmetic stumps) */
  stumps: { x: number; y: number; tick: number }[];
  nextId: number;
  persons: Person[];
  deceased: { id: number; name: string; tick: number; cause: string; age: number }[];
  sources: Source[];
  buildings: Building[];
  sites: Site[];
  plots: Plot[];
  piles: Pile[];
  graves: Grave[];
  animals: Animal[];
  tools: Tool[];
  carts: Cart[];
  meals: Meal[];
  households: Household[];
  requests: Request[];
  conversations: Conversation[];
  reservations: Map<number, Reservation>;
  events: WorldEvent[];
  fx: FxEvent[];
  /** speech bubbles queued for a few ticks from now (purely cosmetic) */
  delayed: { tick: number; id: number; text: string }[];
  weather: Weather;
  /** 0 (night) .. 1 (full daylight), recomputed each tick */
  light: number;
  ledger: Ledger;
  camp: { x: number; y: number };
  /** further settlements besides the camp (settlements.ts); absent in a world with one, so that world is saved and hashed exactly as before */
  extraSettlements?: { x: number; y: number }[];
  byId: Map<number, Entity>;
  grid: SpatialGrid;
  pgrid: SpatialGrid;
  /** names already used, so births / arrivals don't duplicate */
  usedNames: Set<string>;
  stats: Record<string, number>;
  /** a lean season under way (hardship.ts); only in worlds with rich dynamics */
  hardship?: { kind: 'lean'; since: number; until: number };
  /** optional hooks (tests / debug). Never required by the simulation. */
  hooks?: {
    onActivityStart?: (p: Person, a: Activity) => void;
    onTransfer?: (info: { from: string; to: string; item: ItemKind; n: number; reason: string }) => void;
  };
}

