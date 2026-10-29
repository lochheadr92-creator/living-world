import type { Township, CivicProject } from './townships';
import type { RNG } from './rng';

// ───────────────────────────── terrain ─────────────────────────────
export const T = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, FOREST: 4, STONY: 5 } as const;
export type TerrainType = (typeof T)[keyof typeof T];

// ───────────────────────────── items ─────────────────────────────
export type FoodKind = 'berries' | 'fruit' | 'fish' | 'grain' | 'bread' | 'meat';
/** Durable equipment. Each one is a `Tool` instance (identity, wear, owner); its presence is mirrored as a count in the holder's Items. */
export type ToolKind = 'axe' | 'pick' | 'hoe' | 'basket' | 'hammer' | 'saw' | 'jar' | 'spear';
/** Raw materials and the things made from them. */
export type MaterialKind = 'wood' | 'stone' | 'clay' | 'ore' | 'planks' | 'handles' | 'bricks' | 'charcoal' | 'iron' | 'flour';
export type ItemKind = FoodKind | ToolKind | MaterialKind | 'seeds' | 'water';
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
  deathKnown?: { learned: number; source: 'witness' | 'told' | 'grave'; via: number };
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
  /**
   * The kinds they are visibly carrying more than one of - an armful, not their last stick. Rich worlds only (absent otherwise, so
   * an authored world's sight is exactly what it always was). It is the one thing a watcher can tell about somebody's pack beyond
   * what is in it, and what tells apart "they have some" from "they have some to spare" when deciding whether to ask.
   */
  plenty?: ItemKind[];
  /**
   * What kind of work they are visibly at, as a watcher would name it: chopping at a tree is wood, standing at the kiln is the
   * kiln, hoeing a field is farming (trade.ts visibleWork). Rich worlds only, and absent for anyone who is not working. It is
   * `act` said in the terms a trade is in, and it is what lets somebody see which trades the people around them already have.
   */
  work?: SkillKey;
  asleep: boolean;
  /** what they are visibly doing */
  act: ActivityKind | '';
  busyTalking: boolean;
}

export type ActivityKind =
  | 'relocate'
  | 'exchange_journey'
  | 'attend'
  | 'hunt'
  | 'alone'
  | 'wander'
  | 'eat'
  | 'eat_store'
  | 'drink'
  | 'fetch_water'
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
  | 'defend'
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
/** A private plan: a goal this person adopted, the step they are on, and what became of it. */
export interface Intention {
  id: number;
  /** the family of plan; each kind knows how to find its next step and when it is finished */
  kind: 'night' | 'tool' | 'repair' | 'stock' | 'shelter';
  /** what they mean to bring about, in their own terms */
  goal: string;
  since: number;
  /** after this tick the plan no longer matters and is dropped on its own */
  until: number;
  status: 'active' | 'done' | 'dropped';
  /** the step being worked on now, in plain words. Display only: nothing decides anything by reading this. */
  step: string;
  /** what the step actually is. This, not the wording of `step`, is the contract the decision code matches on. */
  stepKind: 'drink' | 'eat' | 'goto' | 'stay' | 'get' | 'make' | 'mend' | 'forage' | 'store' | 'deliver' | 'none';
  /** for a 'get' step, the material being fetched */
  stepItem: ItemKind | null;
  /** the place the step is about (a shelter's id), or 0 when it is about no particular place */
  stepTarget: number;
  /** the option key that would serve the step, when one is on offer */
  stepKey: string | null;
  /** the thing this plan is about: the shelter to use, the home to mend (0: nothing in particular) */
  aboutId: number;
  /** materials this plan has spoken for. They are not spare while it lasts, and become spare again the moment it ends. */
  wants: Partial<Items>;
  /** for a tool plan, which tool */
  makes: string;
  /** ticks actually spent sheltering for this plan, credited by the activity itself as it ends or is set aside */
  sheltered: number;
  /**
   * What this person's own hands put into the thing, credited where the work really happens: condition put back for a repair
   * (act_build.ts), 1 for each tool they themselves crafted (the craft handler). 0 therefore means "not by them", which is how a
   * borrowed tool or a roof a neighbour mended is told apart from one they made or mended.
   */
  worked: number;
  /** why there is no feasible step right now ('' when there is one) */
  blocked: string;
  /** why it was suspended, revised, finished or given up */
  reason: string;
  /** ticks this plan was set aside for something more pressing */
  setAside: number;
  /** the tick it finished or was given up (0 while it stands). It is what keeps someone from taking the same thing up again at once. */
  ended: number;
  /**
   * For a food reserve (`stock`, rules version 2): how many units of food the home store should come to hold, and which of
   * the two cues set the plan going. Both are absent on every other kind of plan and in every world below version 2, so a
   * save from an earlier version reads back exactly as it was written. The cue is kept because a measurement must be able to
   * say whether a preparation was a response to something seen or an anticipation of the season; see src/sim/provision.ts.
   */
  reserve?: number;
  cue?: 'season' | 'hardship';
}

/** nobody juggles more than this many private plans at once */
export const MAX_INTENTIONS = 2;

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

/** one kind of gathering as it has paid one person: `r` 1 = as planned, below worse, above better; `n` outcomes behind it */
export interface Payoff {
  n: number;
  r: number;
}

/** what a person hopes for (life.ts; rich worlds only): the hope, since when, how far along (read from the world), when reached (0: not yet) */
export type GoalKind = 'home' | 'family' | 'trade' | 'stocked' | 'respected';
export interface Goal {
  /** Earlier fulfilled hopes; at most one per kind, added only by rules 38 onward. */
  previous?: { kind: GoalKind; done: number }[];
  kind: GoalKind;
  since: number;
  progress: number;
  done: number;
}
/** an injury (life.ts; rich worlds only): what, since when, healed by when, how it happened */
export type InjuryKind = 'sprain' | 'cut' | 'broken';
export interface Injury {
  kind: InjuryKind;
  since: number;
  until: number;
  how: string;
}

/** an informal crew (crews.ts; rich worlds only): a few people who like each other and count as a group */
export interface Crew {
  id: number;
  name: string;
  members: number[];
  since: number;
  /** when the group last formed or grew */
  together: number;
}

/** a tradition (traditions.ts; rich worlds only): a gathering the community holds each year on a day, since a holding that many came to */
export interface Tradition {
  id: number;
  kind: 'harvest' | 'remembrance' | 'midwinter';
  name: string;
  since: number;
  dayOfYear: number;
  /** the day (tick / DAY) it was last called, how many times it has been held, how many times running nobody came */
  lastHeld: number;
  held: number;
  skipped: number;
  /** the dead remembered, for a remembrance (0 otherwise) */
  about: number;
  status: 'kept' | 'lapsed';
}

/** a change in life that colours things for a while (lifechanges.ts; rich worlds only): what, about whom, since when, until when */
export interface LifeEvent {
  kind: 'bereaved' | 'new_parent' | 'moved' | 'took_in';
  about: number;
  since: number;
  until: number;
}

/** an apprenticeship (apprentice.ts; rich worlds only): whose, in what skill, since when, and when they last practised it */
export interface Apprenticeship {
  master: number;
  key: SkillKey;
  since: number;
  practised: number;
}

/** a fever (illness.ts; rich worlds only): when it began, how bad it is now, rest credited against the course it must run, and how it came */
export interface Illness {
  since: number;
  severity: number;
  rested: number;
  course: number;
  how: string;
}

/** a story one person holds about another (reputation.ts; rich worlds only): what, about whom, who told it, who saw it, how old */
export type RumourKind = 'generous' | 'reliable' | 'quarrelsome' | 'unreliable' | 'thief' | 'news';
export interface DeathNotice { id: number; name: string; hhId: number; tick: number }
export interface Rumour {
  death?: DeathNotice;
  /** This observer already changed their relation for the event; do not count it again as reputation. */
  relationshipApplied?: boolean;
  about: number;
  kind: RumourKind;
  /** when it happened */
  tick: number;
  /** who told me (0: I saw it myself) */
  from: number;
  /** who saw it first */
  origin: number;
  /** how many mouths it has passed through */
  hops: number;
  /** how far it is believed, 0..1: hearsay from someone little trusted counts for less */
  weight: number;
  /** the story, in words that fit after "told me" */
  text: string;
}

/** a gathering at a place and a time (occasions.ts; rich worlds only) */
export type OccasionKind = 'funeral' | 'wedding' | 'feast' | 'harvest' | 'market';
export interface Occasion {
  id: number;
  kind: OccasionKind;
  placeId: number;
  placeName: string;
  x: number;
  y: number;
  called: number;
  /** when it opens, and when it is over */
  at: number;
  until: number;
  /** who it is for (the dead, the couple, the newborn and mother); nobody for a harvest or a market */
  about: number[];
  attended: number[];
  status: 'called' | 'gathering' | 'done';
  end: string;
}

export interface Speech {
  text: string;
  until: number;
  kind: 'say' | 'ask' | 'warn' | 'angry' | 'happy' | 'think';
}

/**
 * The one kind of work a person has settled on as theirs (trade.ts; rich worlds only, null in any other). It is one of the
 * existing skills, chosen by comparative advantage from their own skills and what they have seen other people doing, and it
 * tilts the matching work options by a bounded amount. It is not a job: nobody is assigned one and nobody is held to one.
 */
export interface Trade {
  key: SkillKey;
  /** the tick they took it up */
  since: number;
  /** why, in their own terms, at the moment they chose it */
  why: string;
}

export interface Person {
  background?: import('./background').Background;
  /** Version 27: the last few places spare time was spent at (leisure.ts); absent in any world below version 27. */
  leisure?: import('./leisure').Leisure;
  sharedSupper?: import('./household_practices').SharedSupper;
  civicAlignment?: import('./political_alignment').CivicAlignment[];
  tradeLeads?: import('./exchange_journeys').TradeLead[];
  heardDemand?: import('./local_demand').HeardDemand[];
  exchangeJourneys?: import('./exchange_journeys').ExchangeJourney[];
  relocationHardship?: number;
  socialMemory?: { requestId: number; otherId: number; siteId: number; tick: number; outcome: string; reason: string; role: 'asker' | 'helper' }[];
  civicOutcomes?: { projectId: number; organiserId: number; success: boolean; tick: number; buildingId?: number; benefit?: {tick:number;item:ItemKind;amount:number} }[];
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
  /** Version 18: held technique and its actual source; proficiency is separate. */
  techniques?: { charcoal?: { source: 'initial' | 'taught'; learned: number; teacher: number; lesson?: number; started?: number } };
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
  /**
   * What this person means to see done, for their own reasons (rich worlds only; always empty in an authored world).
   * A private intention is NOT a promise: dropping one costs nothing socially, and nobody else is owed anything by it.
   * Kept small and bounded (MAX_INTENTIONS); saved with the person; carries its own account of why it stands or ended.
   */
  intentions: Intention[];
  /**
   * What each kind of gathering has paid this person, in their own experience (rich worlds only; always empty in an authored
   * world): a running ratio of what they got against what the option they chose expected, and how many outcomes it rests on.
   * Learned from their own finished activities and nothing else (learning.ts); saved with the person.
   */
  payoff: Partial<Record<SkillKey, Payoff>>;
  /**
   * The trade they have settled on, or null for somebody who has none (rich worlds only; always null in an authored world).
   * Chosen, kept, changed and given up by the person themselves (trade.ts); saved with them, and in the fingerprint.
   */
  trade: Trade | null;
  /** what they have seen and been told of other people (reputation.ts; rich only, never created in an authored world) */
  heard?: Rumour[];
  /** the fever they have now (illness.ts; rich only, never created in an authored world) and until when they are safe from another */
  illness?: Illness;
  immuneUntil?: number;
  /** whose apprentice they are, in what (apprentice.ts; rich only, never created in an authored world) */
  apprentice?: Apprenticeship;
  /** the change they are living through (lifechanges.ts; rich only, never created in an authored world) */
  lifeEvent?: LifeEvent;
  /** time lately spent with three or more people close by (temperament.ts; rich only, never created in an authored world) */
  crowd?: number;
  /** what they hope for, and what hurts them (life.ts; rich only, never created in an authored world) */
  goal?: Goal;
  injury?: Injury;
  errand: Errand | null;
  activity: Activity | null;
  /** Authoritative abstract indoor location (habitation rules only); absent means outdoors. */
  indoors?: number;
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
  kind: 'hungry' | 'thirsty' | 'cold' | 'hurt' | 'tired' | 'missing' | 'bereaved';
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
  | 'hall';

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
  /** who finished it and when (rich only; absent in an authored world and on anything built before this was recorded) */
  builtBy?: number[];
  built?: number;
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
  death?: DeathNotice;
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
  /** deer only in rich worlds (hunting.ts) */
  type: 'wolf' | 'deer';
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
  /**
   * Driven off by somebody with a spear (defence.ts, rules version 4): the tick until which this wolf keeps clear of
   * `waryOf`, so that a retreat it was forced into does not end with it fixing on the same person again. Both are absent
   * on every wolf that was never driven off - which is every wolf in every world below version 4 - so an older save reads
   * back exactly as it was written and hashes exactly as it did.
   */
  wary?: number;
  waryOf?: number;
}

export interface Household {
  relocations?: import('./relocation').Relocation[];
  townshipId?: number;
  id: number;
  name: string;
  members: number[];
  color: number;
  homeId: number;
  headId: number;
  formed: number;
}

export type Entity = Person | Source | Building | Site | Plot | Pile | Grave | Animal | Cart;

// ───────────────────────────── social ─────────────────────────────
export type RequestKind = 'food' | 'water' | 'wood' | 'stone' | 'seeds' | 'tool' | 'help_build' | 'info' | 'trade' | 'care' | 'goods' | 'repair' | 'haul' | 'work' | 'watch' | 'fire';
/**
 * `partial`: it was answered, something real was handed over, and it was less than was asked for. It is not `fulfilled` (the ask was
 * not met) and not `failed` (something did arrive), and it leaves nobody owing the difference: a helper who gives what they can has
 * not promised the rest.
 */
export type RequestStatus = 'pending' | 'promised' | 'fulfilled' | 'partial' | 'declined' | 'expired' | 'failed' | 'broken' | 'interrupted' | 'cancelled';

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
  /**
   * How much of what was asked for has actually arrived, written where the material really changes hands (a gift answered on the
   * spot, or a promised delivery). It is the one number that says "delivered" rather than "promised", and it is never set when a
   * promise is made.
   */
  delivered?: number;
  /**
   * How much the person asked actually agreed to - handed over there and then, or promised. It may be less than `amount`: someone
   * who gives what they can spare has agreed to that much and no more, and nothing turns the difference into a debt.
   */
  offered?: number;
  /**
   * The private plan this was asked for (`Intention.id`), when it was asked for one. It is a reference, not a second record of the
   * need: the plan still owns what it wants, and this only says which plan an outstanding promise belongs to, so neither side asks
   * twice for the same thing and the explanations can say which project a delivery served.
   */
  planId?: number;
  /**
   * Set on a project ask that was made under the rule that it should probably be answered yes: the person asked was visibly
   * carrying more than one of it or was idle, was not visibly making or building something, and had not said lately that what
   * they carry is spoken for (options_social.ts). It records how the ask came to be made, so the yes rate of asks made that way
   * can be read off the requests (scripts/projects.ts); it changes nothing about how the ask is answered.
   */
  likely?: boolean;
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
  | 'report'
  | 'mediate'
  | 'teach_technique'
  | 'learn_technique';

export interface Conversation {
  /** Version 18: current lesson only; completed knowledge belongs to the learner. */
  lesson?: {since:number;until:number;outcome:'learning'|'learned'|'declined'|'interrupted';reason:string};
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
  supperContact?: import('./household_practices').SupperContact;
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
  /** a larger world, founded in several places, or a crowded one (profiles.ts); absent means the ordinary 80x80 world with one camp */
  profile?: 'large' | 'huge' | 'town';
  /** how many of the founders live together in one settlement, for the limits that follow a settlement (rules.ts); absent means all of them */
  settlementFounders?: number;
  /** 'rich' is the current product rules. 'authored'/absent retain legacy save and diagnostic semantics;
   * new product worlds explicitly set rich through currentWorldSettings. Never upgrade this field while loading a save. */
  dynamics?: 'authored' | 'rich';
  /**
   * Which generation of simulation BEHAVIOUR this world runs (`src/sim/rulesversion.ts`), as against the save format version
   * and the `dynamics` family above. New product worlds carry the current number; a world made before versioning existed has
   * none, keeps none, and is never silently upgraded. Preserved by saving, loading, restoring, forking and replay.
   */
  rulesVersion?: number;
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
  exchangeReceipts?: import('./exchange_journeys').ExchangeReceipt[];
  economicObservations?: import('./settlement_economy').EconomicObservations;
  /** Lifetime births from rules 14; absent historical records are not reconstructed from prose. */
  birthCount?: number;
  townships?: Township[];
  civicProjects?: CivicProject[];
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
  /** gatherings called in a rich world (occasions.ts); never created in an authored one, so its saves and fingerprints are untouched */
  occasions?: Occasion[];
  occasionState?: { harvestUnits: number; lastHarvestFeastDay: number; lastMarketDay: number };
  /** the community's traditions (traditions.ts; rich only, never created in an authored world) */
  traditions?: Tradition[];
  /** informal crews (crews.ts; rich only, never created in an authored world) */
  crews?: Crew[];
  /**
   * The settlement's record, kept for good (rich only; never created in an authored world): the events worth remembering after
   * the feed has forgotten them (events.ts chronicleWorthy). Capped at CHRONICLE_MAX, oldest dropped first.
   */
  chronicle?: WorldEvent[];
  /** roads (rich only; world.ts roadsTick): 1 where a path walked hard for a day has become a road; and how long each tile has been worn */
  roads?: Uint8Array;
  roadAge?: Uint8Array;
  /** further settlements besides the camp (settlements.ts); absent in a world with one, so that world is saved and hashed exactly as before */
  extraSettlements?: { x: number; y: number }[];
  byId: Map<number, Entity>;
  grid: SpatialGrid;
  pgrid: SpatialGrid;
  /** names already used, so births / arrivals don't duplicate */
  usedNames: Set<string>;
  stats: Record<string, number>;
  /** a lean season under way (hardship.ts); only in worlds with rich dynamics */
  hardship?: { kind: 'lean' | 'dry'; since: number; until: number };
  /** the last flood (hardship.ts; rich only, never set in an authored world) */
  lastFlood?: number;
  /**
   * people driven from outside (the AI inhabitant, docs/INHABITANT.md), by person id. Absent in every ordinary world, so such a world
   * is saved and hashed exactly as before. The simulation never reads it.
   */
  inhabitants?: Record<number, InhabitantState>;
  /** optional hooks (tests / debug). Never required by the simulation. */
  hooks?: {
    onActivityStart?: (p: Person, a: Activity) => void;
    /** Observation only, including a fatal bite before the person leaves the live registry. */
    onWolfBite?: (p: Person, wolf: Animal) => void;
    onTransfer?: (info: { from: string; to: string; item: ItemKind; n: number; reason: string }) => void;
  };
}


// ───────────────────────────── the AI inhabitant (docs/INHABITANT.md) ─────────────────────────────
/** one of the inhabitant's own notes: its words, with an id it can refer to and the tick it was written or last changed */
export interface NoteEntry {
  id: string;
  text: string;
  since: number;
}

/** a conclusion the inhabitant drew for itself: never verified by the engine, bounded in confidence, resting on cited observations */
export interface Inference extends NoteEntry {
  /** 0 (doubtful) to 1 (sure), two decimals */
  confidence: number;
  /** references into observations it was given (place:<id>, person:<id>, seen:<id>, memory:<tick>, result:<tick>, option:<key>, obs:<tick>) */
  basis: string[];
  /** the tick of the last change to its text or confidence */
  revised: number;
}

/**
 * What a person driven from outside has written down for themselves: their own words, bounded (src/agent/memory.ts), never read by the
 * simulation. Kept apart from what the engine itself remembers for them (beliefs, log, relations), which is the verified part.
 */
export interface InhabitantNotes {
  goals: NoteEntry[];
  intentions: NoteEntry[];
  inferences: Inference[];
  uncertainties: NoteEntry[];
  journal: { tick: number; text: string }[];
}

/** how the inhabitant's inferences have moved over the run (cumulative; the per-turn detail is in the transcript) */
export interface MemoryCounters {
  version: number;
  /** note updates offered by the model, and the ones rejected whole */
  updates: number;
  rejectedUpdates: number;
  /** entries (of any list) the model dropped because they were over a limit or malformed */
  rejectedEntries: number;
  /** inferences: created, restated unchanged, confidence raised, confidence lowered, text changed, left out */
  new: number;
  kept: number;
  strengthened: number;
  weakened: number;
  revised: number;
  abandoned: number;
  /** the next id to hand out */
  nextId: number;
}

/** A person driven from outside: the mark that survives a save, the counts, and their notes. Never read by the simulation. */
export interface InhabitantState {
  /** the tick at which outside control began */
  since: number;
  /** decisions answered from outside, and the ones the engine had to make instead */
  turns: number;
  fallbacks: number;
  /** only when the run keeps memory (protocol inhabitant/2); absent in a run without it */
  notes?: InhabitantNotes;
  memory?: MemoryCounters;
}
