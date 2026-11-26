// The story director's model: how worth watching a real event is, the short queue of what is waiting, what is happening live, and
// the one current shot. No DOM and no Game here, so all of it can be tested; director.ts draws it and drives the view (selection,
// follow, camera fly).
//
// Presentation only. Events are read from world.events (and world.chronicle for the reel); what is live is read from world state
// by director_live.ts. Nothing is written to the world, the world's random state is never drawn from, and nothing here is saved.
// The words are the event's own or the simulation's and the inspector's; the director adds none of its own but two wolf sentences.
//
// What it follows, in three bands of weight: TOP (80 and up) may cut in early, MIDDLE (50 to 79) waits for the hold, and FILLER
// (below 30) is shown only when nothing better exists. Between events it follows what is still happening (a gathering, a wolf, a
// conversation, someone in trouble), so the camera is there during the moment and not after it.
import { DAY } from '../sim/constants';
import type { EventKind, World, WorldEvent } from '../sim/types';
import { scanLive, type LiveCandidate } from './director_live';

// ───────────────────────────── how worth watching an event is ─────────────────────────────

/** TOP: a death, a bite, a birth, a pairing, a wedding, a conflict. May cut in early over a shot from a lower band. */
export const TOP_FROM = 80;
/** MIDDLE: from here up to TOP_FROM. Waits for the hold. Also the least weight the reel lists. */
export const MIDDLE_FROM = 50;
/** FILLER: below this. Shown only when nothing better exists. */
export const FILLER_BELOW = 30;

export type Band = 'top' | 'middle' | 'filler';
export const bandOf = (weight: number): Band => (weight >= TOP_FROM ? 'top' : weight >= MIDDLE_FROM ? 'middle' : 'filler');

interface Rule {
  /** names the rule for the repeat fade */
  id: string;
  kind: EventKind;
  /** a test on the event's text; none means every event of the kind */
  test?: (text: string) => boolean;
  weight: number;
}

const has = (piece: string) => (t: string) => t.includes(piece);
/** a gathering called, or beginning (the simulation words these "A <label> for ... is called at ..." and "The <label> at ... begins.") */
const gathering = (label: string) => (t: string) => t.includes(label) && (t.includes(' is called at ') || t.includes(' begins'));

/**
 * The first rule that fits wins. The wording is the simulation's own (grep addEvent under src/sim, and the counts of what an
 * ordinary world really says in scratchpad review/patterns.json): "<name> died peacefully of old age, aged N." or "<name> died
 * (<cause>), aged N.", "<baby> was born to <mother>", "<a> and <b> became a couple.", "A wolf bit <name>." and "... fatally.",
 * "<name> drove a wolf off with a spear" or "killed a wolf", "A <label> is called at ... " and "The <label> at ... begins.".
 * Weather (nature) and workshop output (work) are never a shot. A household's own hut, lean-to or cellar finished is FILLER, a
 * building for everyone (no "household" in the text) is MIDDLE. A story told at the fire retells something else, so it is first.
 */
const RULES: Rule[] = [
  // never: weather, and workshop output (a deer, an apprenticeship and a trade of one's own are people's, not output)
  { id: 'deer', kind: 'work', test: has('brought down a deer'), weight: 55 },
  { id: 'apprentice', kind: 'work', test: has('apprentice'), weight: 50 },
  { id: 'own-right', kind: 'work', test: has('own right'), weight: 50 },
  { id: 'work', kind: 'work', weight: 0 },
  { id: 'nature', kind: 'nature', weight: 0 },
  // a tale retold at the fire ("told a story at the fire: how ... finished a shallow well") is not the thing it retells
  { id: 'story', kind: 'social', test: has('told a story'), weight: 10 },
  // TOP
  { id: 'death', kind: 'life', test: has(' died '), weight: 100 },
  // rules 261 (vigil.ts): "<sitter> was with <name> when he died." is the death's own shot, with the one who was beside them in it (see admit)
  { id: 'vigil-death', kind: 'life', test: (t) => / was with .* when (he|she) died.$/.test(t), weight: 100 },
  { id: 'bite-fatal', kind: 'danger', test: has('fatally'), weight: 95 },
  { id: 'birth', kind: 'life', test: has(' was born to '), weight: 90 }, // a lamb is "A lamb was born after ...", not this
  { id: 'bite', kind: 'danger', test: has('A wolf bit'), weight: 90 },
  { id: 'wolf-off', kind: 'danger', test: (t) => t.includes('drove a wolf off') || t.includes('killed a wolf'), weight: 88 },
  { id: 'couple', kind: 'life', test: has(' became a couple'), weight: 85 },
  { id: 'wedding', kind: 'social', test: gathering('wedding feast'), weight: 80 },
  { id: 'conflict', kind: 'conflict', weight: 80 }, // an argument, reaching the last berry first, a theft, a broken promise
  // MIDDLE
  { id: 'injury', kind: 'danger', test: has(' got a '), weight: 65 },
  { id: 'arrival', kind: 'life', test: has(' arrive'), weight: 60 }, // a traveller, a couple or a family arrives at the settlement
  { id: 'expecting', kind: 'life', test: has('expecting a child'), weight: 60 },
  { id: 'funeral', kind: 'social', test: gathering('funeral'), weight: 60 },
  { id: 'harvest-feast', kind: 'social', test: gathering('harvest feast'), weight: 58 },
  { id: 'feast', kind: 'social', test: gathering('feast'), weight: 55 },
  { id: 'market', kind: 'social', test: gathering('market'), weight: 55 },
  { id: 'hope-family', kind: 'life', test: has('has what they hoped for: a family'), weight: 55 },
  { id: 'shared-finished', kind: 'build', test: (t) => t.includes(' finished ') && !t.includes('household'), weight: 55 }, // a storehouse, a shallow well, a hall
  { id: 'warn-wolf', kind: 'danger', test: has('warned'), weight: 50 },
  { id: 'peace', kind: 'social', test: (t) => t.includes('make peace') || t.includes('made peace') || t.includes('on good terms again'), weight: 50 },
  { id: 'tradition', kind: 'social', test: has('has become a tradition'), weight: 50 },
  // the social scenes (rules 260; the words are in src/sim/courting.ts, welcome.ts and praise.ts). A thanks in company reads "At <the fire or
  // the occasion> <name> thanked ...": a rescue "before N people for driving off a wolf" or "for killing a wolf", the builders "for the new <building>".
  // Each scene's more specific wording is first ("for the first time", "was the first to welcome"). None of them contains what the gathering rules
  // above need (" is called at ", " begins"), and the story rule at the top has already taken any retelling.
  { id: 'rescue-thanked', kind: 'social', test: (t) => t.startsWith('At ') && t.includes(' thanked ') && (t.includes(' for driving off a wolf') || t.includes(' for killing a wolf')), weight: 70 },
  { id: 'builders-thanked', kind: 'social', test: (t) => t.startsWith('At ') && t.includes(' thanked ') && t.includes(' for the new '), weight: 55 },
  { id: 'welcome-first', kind: 'social', test: has(' was the first to welcome the newcomer'), weight: 58 }, // a household's first welcome: "the newcomer B" or "the newcomers B and C"
  { id: 'walk-first', kind: 'social', test: has(' walked out together for the first time'), weight: 62 },
  // the hearth scenes (rules 261; the words are in src/sim/birth_help.ts, naming.ts and vigil.ts). A birth with or without a helper is still "was born to" (90).
  // A child named aloud: "<M> and <F> named their daughter <X> before 3 people, after <M>'s mother." (or "<M> named her daughter", "<F> named his son"), 58. A
  // vigil ended: "<A> sat up through the night with <B>, who has a fever." ("sat with" by day, "who is hurt"), 50, the floor of what the reel lists. The naming
  // feast's own lines ("A naming feast for ... is called at ...", "The naming feast at ... begins.") are the gathering rule above and keep 55.
  { id: 'named', kind: 'social', test: (t) => / named (their|her|his) (daughter|son) /.test(t), weight: 58 },
  { id: 'vigil', kind: 'social', test: (t) => / sat (up through the night )?with /.test(t) && (t.endsWith(', who has a fever.') || t.endsWith(', who is hurt.')), weight: 50 },
  // the company scenes (rules 262; the words are in src/sim/reunion.ts, song.ts and dance.ts). A reunion: "<C> ran to meet <A>, back after two days." (a day and a half, two and
  // a half days, ...), 60. A song: "<A> started a song at the fire and <N> joined in.", 30, the bottom of the band below, because it can happen most evenings and is meant
  // to be filler. The dance's line ("People danced at the wedding feast for A and B.") is not ranked: it keeps the unnamed social weight, and a dance under way is a live shot
  // (director_live.ts). None of them has what the gathering rules need (" is called at ", " begins") and a story that retells one keeps the story rank.
  { id: 'reunion', kind: 'social', test: (t) => / ran to meet .+, back after /.test(t), weight: 60 },
  // the kin scenes (rules 263; the words are in src/sim/grief_sit.ts, coming_of_age.ts and settle_child.ts). Sitting with the grieving: "<B> sat with <A>, who has lost her mother." (partner, father,
  // son, daughter, sister, brother), 62: a death's aftermath and rare. Coming of age: "<D> came of age before 7 people and hopes for <a hope>.", 60. A child settled for the night:
  // "<A> settled little <C> for the night.", 20, filler (the line is written at most once for a household in two days, and a settlement holds dozens of small children). The
  // life line at sixteen ("has come of age and joins the work") keeps the kind's weight, and the coming-of-age feast's own lines are the gathering rule above.
  { id: 'sat-grief', kind: 'social', test: (t) => / sat with .+, who has lost (her|his) /.test(t), weight: 62 },
  { id: 'came-of-age', kind: 'social', test: (t) => / came of age before \d+ (person|people) and hopes for /.test(t), weight: 60 },
  // between MIDDLE and FILLER: the one filler candidate holds one of these against a lighter newcomer (see admit)
  { id: 'walk', kind: 'social', test: has(' walked out together'), weight: 45 },
  { id: 'welcome', kind: 'social', test: has(' welcomed the newcomer'), weight: 40 }, // has " gave " in it as often as not, so it comes before the gift rule
  { id: 'walk-refused', kind: 'social', test: has(' said not today'), weight: 40 },
  { id: 'walk-cut', kind: 'social', test: has(' set out to walk together and turned back'), weight: 35 },
  { id: 'song', kind: 'social', test: (t) => / started a song at the fire and \d+ joined in\.$/.test(t), weight: 30 },
  { id: 'settled', kind: 'social', test: (t) => / settled little .+ for the night\.$/.test(t), weight: 20 },
  // FILLER
  { id: 'home-finished', kind: 'build', test: has(' finished '), weight: 25 }, // a household's hut, lean-to or cellar
  { id: 'hope', kind: 'life', test: has('has what they hoped for'), weight: 25 }, // a home, a trade
  { id: 'crew', kind: 'social', test: has('have become a crew'), weight: 22 },
  { id: 'over', kind: 'social', test: has(' is over: '), weight: 20 },
  { id: 'recovered', kind: 'life', test: (t) => t.includes('has healed from') || t.includes('is over the fever'), weight: 20 },
  { id: 'estate', kind: 'life', test: has('left behind'), weight: 15 },
  { id: 'lit', kind: 'build', test: has(' lit a '), weight: 15 },
  { id: 'look-in', kind: 'social', test: has('looked in on'), weight: 12 },
  { id: 'agreed', kind: 'social', test: has('agreed to help'), weight: 10 },
  { id: 'marked-out', kind: 'build', test: has(' marked out '), weight: 10 },
  { id: 'gave', kind: 'social', test: has(' gave '), weight: 8 },
  { id: 'promised', kind: 'social', test: has('promised'), weight: 8 },
  { id: 'fed', kind: 'social', test: has(' fed '), weight: 5 },
];

/** a wording no rule names: by kind */
const DEFAULT_BY_KIND: Partial<Record<EventKind, number>> = { conflict: 80, danger: 50, life: 50, social: 12, build: 10, trade: 10, survival: 8, farm: 6 };

export interface Match {
  /** the rule that fit, or `default:<kind>`: what the repeat fade is counted by */
  id: string;
  weight: number;
}

/** which rule an event fits, and what it weighs */
export function matchEvent(ev: Pick<WorldEvent, 'kind' | 'text'>): Match {
  for (const r of RULES) if (r.kind === ev.kind && (!r.test || r.test(ev.text))) return { id: r.id, weight: r.weight };
  return { id: `default:${ev.kind}`, weight: DEFAULT_BY_KIND[ev.kind] ?? 0 };
}

/** How worth watching an event is: 0 is never, TOP_FROM and up is TOP, MIDDLE_FROM to TOP_FROM is MIDDLE, below FILLER_BELOW is FILLER. */
export const storyWeight = (ev: Pick<WorldEvent, 'kind' | 'text'>): number => matchEvent(ev).weight;

/** the first of the event's people who is alive now, or 0 (a shot of the place) */
export function subjectOf(world: World, ev: Pick<WorldEvent, 'ids'>): number {
  for (const id of ev.ids) {
    const e = world.byId.get(id);
    if (e && e.ent === 'person' && e.alive) return id;
  }
  return 0;
}

const livingPerson = (world: World, id: number): boolean => {
  const e = world.byId.get(id);
  return !!e && e.ent === 'person' && e.alive;
};

/** a shot or event with no position (the winter setting in) has no place to fly to */
export const hasPlace = (at: { x: number; y: number }): boolean => at.x !== 0 || at.y !== 0;

// ───────────────────────────── the reel ─────────────────────────────

/** the reel looks back this many days, and lists at most this many events */
export const REEL_DAYS = 3;
export const REEL_MAX = 8;

/**
 * The heaviest events of TOP and MIDDLE weight (MIDDLE_FROM and up) at or after `sinceTick`, at most `max`, in the order they
 * happened. Read from the chronicle when the world keeps one (older worlds have none) and from the feed's events as well; an event
 * in both is listed once. Heavier first when choosing, newer first among equals.
 */
export function highlights(world: World, sinceTick: number, max: number): WorldEvent[] {
  if (max <= 0) return [];
  const seen = new Set<number>();
  const pool: { ev: WorldEvent; weight: number }[] = [];
  const take = (list: readonly WorldEvent[] | undefined): void => {
    if (!list) return;
    // both lists are in the order things happened, so the walk from the newest stops at the first one that is too old
    for (let i = list.length - 1; i >= 0; i--) {
      const ev = list[i];
      if (ev.tick < sinceTick) break;
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      const weight = storyWeight(ev);
      if (weight >= MIDDLE_FROM) pool.push({ ev, weight });
    }
  };
  take(world.chronicle);
  take(world.events);
  pool.sort((a, b) => b.weight - a.weight || b.ev.tick - a.ev.tick || b.ev.id - a.ev.id);
  return pool
    .slice(0, max)
    .map((p) => p.ev)
    .sort((a, b) => a.tick - b.tick || a.id - b.id);
}

/** what the "What happened" reel lists now */
export const reelOf = (world: World): WorldEvent[] => highlights(world, world.tick - REEL_DAYS * DAY, REEL_MAX);

// ───────────────────────────── the queue and the shot ─────────────────────────────

/** at most this many events (TOP and MIDDLE) wait for a shot; past it the lightest (the oldest among equals) is dropped */
export const MAX_WAITING = 6;
/** a shot stays up at least this long (UI seconds, whatever the simulation's speed, and while it is paused) before anything but a TOP event may replace it */
export const MIN_HOLD = 15;
/** a TOP event may cut in over a shot from a lower band once the shot has been up this long */
export const MIN_CUT = 3;
/** an event shot's caption fades after this long (a live shot's stays while it lasts) */
export const CAPTION_SECONDS = 12;
/** a waiting event that has waited this long (UI seconds) is dropped as stale */
export const STALE_SECONDS = 60;
/** a waiting event older than this many world ticks (one day) is dropped as stale */
export const STALE_TICKS = DAY;
/** the FILLER candidate is dropped once it is older than this many world ticks (a quarter of a day) */
export const FILLER_STALE_TICKS = DAY / 4;
/** each showing of the same rule within the last DAY of world ticks multiplies a waiting event's weight by this (TOP is exempt) */
export const REPEAT_FADE = 0.6;
/** two waiting events this close in world ticks, about the same first living person, are one moment */
export const MERGE_TICKS = 5;
/** past the hold a shot lingers until this age (UI seconds) unless a strictly heavier candidate (live, filler or a faded repeat) comes; then any may replace it. An event waiting at TOP or MIDDLE weight does not linger for. */
export const LINGER_SECONDS = 45;
/** what is live is read from the world at most this often (UI seconds) */
export const LIVE_SCAN_SECONDS = 1;
/** a live thing is not picked again for this long (UI seconds) unless its score is LIVE_EXEMPT or more */
export const LIVE_COOLDOWN = 60;
export const LIVE_EXEMPT = 70;

export interface Shot {
  /** an event the simulation recorded, or something happening now */
  kind: 'event' | 'live';
  /** the event, for an event shot */
  ev: WorldEvent | null;
  /** the live thing's key, for a live shot ('occ:<id>', 'wolf:<id>', 'talk:<id>', 'person:<id>') */
  liveKey: string | null;
  /** the caption: the event's own text, or the live thing's (refreshed at each scan while it lasts) */
  text: string;
  /** the world tick the caption refers to: the event's, or when the live shot began */
  tick: number;
  /** the living person the shot is about, or 0: the shot is then of the place */
  subjectId: number;
  /** where it is (world tiles) */
  x: number;
  y: number;
  /** its weight (an event) or score (a live thing): the band says what may cut it */
  weight: number;
  /** an event of FILLER weight: shown only because nothing better existed; always about a living person */
  filler: boolean;
  /** a live shot whose thing has ended: the camera stays with the person, with no caption, until something worth moving for comes */
  ended: boolean;
  /** UI seconds this shot has been up */
  age: number;
  /** changes whenever a shot starts or loses its subject, so the view knows when to move the camera */
  rev: number;
}

interface Entry {
  ev: WorldEvent;
  /** the rule it fit (for the repeat fade) */
  rule: string;
  weight: number;
  /** its first living person when it arrived, or 0 */
  subjectId: number;
}

export interface Waiting extends Entry {
  /** UI seconds waited */
  waited: number;
}

/**
 * The director for one watched world. `step` is called once a UI frame with real seconds. The first look at a world (a new game, a
 * load) learns what already happened without showing it: those events are history, never a shot. A different world resets
 * everything. Nothing here touches the world.
 */
export class Director {
  private world: World | null = null;
  private lastId = 0;
  private rev = 0;
  /** UI seconds since the world was first looked at */
  private clock = 0;
  private scanAt = -Infinity;
  private queue: Waiting[] = [];
  private filler: Entry | null = null;
  private live: LiveCandidate[] = [];
  private pickedAt = new Map<string, number>();
  private shown: { rule: string; tick: number }[] = [];
  shot: Shot | null = null;
  /**
   * in the world watched now (for the checks): shots shown (live and filler ones too), TOP and MIDDLE events dropped as stale or
   * for a full queue, events folded into another of the same moment, and how many of the shots shown were filler or live
   */
  readonly counts = { shown: 0, stale: 0, overflow: 0, merged: 0, filler: 0, live: 0 };

  /** `scan` reads what is live from the world (director_live.ts); the checks may give it another */
  constructor(private scan: (world: World) => LiveCandidate[] = scanLive) {}

  /** Forget everything: the next step primes on whatever world it is given. */
  reset(): void {
    this.world = null;
    this.lastId = 0;
    this.clock = 0;
    this.scanAt = -Infinity;
    this.queue = [];
    this.filler = null;
    this.live = [];
    this.pickedAt.clear();
    this.shown = [];
    this.shot = null;
    this.counts.shown = 0;
    this.counts.stale = 0;
    this.counts.overflow = 0;
    this.counts.merged = 0;
    this.counts.filler = 0;
    this.counts.live = 0;
  }

  step(world: World, dt: number): void {
    if (world !== this.world) {
      this.reset();
      this.world = world;
      const events = world.events;
      this.lastId = events.length ? events[events.length - 1].id : 0;
      return;
    }
    const secs = Math.max(0, dt);
    this.clock += secs;
    if (this.shot) this.shot.age += secs;
    for (const q of this.queue) q.waited += secs;
    this.ingest(world);
    this.expire(world);
    this.trim();
    if (this.clock - this.scanAt >= LIVE_SCAN_SECONDS) {
      this.scanAt = this.clock;
      this.live = this.scan(world);
      this.refreshLive();
    }
    this.choose(world);
  }

  /**
   * The viewer asked for the next one: the current shot goes and the best waiting event takes its place; with none waiting, the best
   * live thing; with none, the FILLER candidate; with none, there is no shot.
   */
  skip(): void {
    const world = this.world;
    if (!world) return;
    const gone = this.shot?.liveKey ?? null;
    this.shot = null;
    this.pick(world, true, gone);
  }

  /** what waits for a shot, in order of arrival */
  waiting(): readonly Waiting[] {
    return this.queue;
  }

  /** the live things read at the last scan, best first */
  liveNow(): readonly LiveCandidate[] {
    return this.live;
  }

  /** whether Next has anything to go to: an event waiting, a live thing other than the shot's own, or the FILLER candidate */
  hasNext(): boolean {
    return this.queue.length > 0 || this.bestLive(this.shot?.liveKey ?? null) !== null || this.filler !== null;
  }

  /** false once an event shot's caption has been up long enough (CAPTION_SECONDS) to fade, or when there is no shot; a live shot's stays while it lasts */
  captionFresh(): boolean {
    return this.shot !== null && !this.shot.ended && this.shot.text !== '' && (this.shot.kind === 'live' || this.shot.age < CAPTION_SECONDS);
  }

  /** the weight of a waiting event with the repeat fade: each showing of the same rule in the last DAY of world ticks takes REPEAT_FADE off. TOP is exempt. */
  effective(e: Entry): number {
    if (e.weight >= TOP_FROM || !this.world) return e.weight;
    const now = this.world.tick;
    this.shown = this.shown.filter((s) => now - s.tick <= DAY);
    let w = e.weight;
    for (const s of this.shown) if (s.rule === e.rule) w *= REPEAT_FADE;
    return w;
  }

  // ───────── events ─────────

  private ingest(world: World): void {
    const events = world.events;
    let from = events.length;
    while (from > 0 && events[from - 1].id > this.lastId) from--;
    for (let i = from; i < events.length; i++) {
      const ev = events[i];
      const m = matchEvent(ev);
      if (m.weight <= 0) continue;
      this.admit(world, { ev, rule: m.id, weight: m.weight, subjectId: subjectOf(world, ev) });
    }
    if (events.length) this.lastId = Math.max(this.lastId, events[events.length - 1].id);
  }

  /**
   * Take an event in. Two events within MERGE_TICKS about the same first living person are one moment: the heavier is kept, the other
   * dropped. Then TOP and MIDDLE ones wait in the queue; a lighter one (FILLER) is the one candidate kept, if it is about a living
   * person: the newest, and of those arriving together the heaviest, then the newest.
   */
  private admit(world: World, e: Entry): void {
    // rules 261: "<A> was with <B> when he died." is the death's own shot: the plain death, if it waits, is taken out and this one, which follows the one
    // who was beside them, stands for both
    if (e.rule === 'vigil-death') {
      const i = this.queue.findIndex((q) => q.rule === 'death' && q.ev.ids[0] === e.ev.ids[1] && Math.abs(q.ev.tick - e.ev.tick) <= MERGE_TICKS);
      if (i >= 0) {
        this.queue.splice(i, 1);
        this.counts.merged++;
      }
    }
    if (e.subjectId !== 0) {
      const near = (o: Entry) => o.subjectId === e.subjectId && Math.abs(o.ev.tick - e.ev.tick) <= MERGE_TICKS;
      const twin = this.queue.find(near);
      const slot = this.filler && near(this.filler) ? this.filler : null;
      const other: Entry | null = twin ?? slot;
      if (other) {
        this.counts.merged++;
        if (e.weight <= other.weight) return;
        if (twin) this.queue.splice(this.queue.indexOf(twin), 1);
        else this.filler = null;
      }
    }
    if (e.weight >= MIDDLE_FROM) {
      this.queue.push({ ...e, waited: 0 });
      return;
    }
    if (e.subjectId === 0) return;
    // the filler of this step: the heavier of those arriving together, then the newer; anything that arrives is newer than the one kept,
    // except that a lighter one does not displace a candidate of FILLER_BELOW or more (a later walk, a refused ask, a welcome)
    const f = this.filler;
    const kept = !!f && f.weight > e.weight && (f.ev.id > this.lastId || f.weight >= FILLER_BELOW);
    if (!kept) this.filler = e;
  }

  /** a waiting event goes stale after a simulated day or STALE_SECONDS of waiting; the FILLER candidate after FILLER_STALE_TICKS or when its person is gone */
  private expire(world: World): void {
    const keep = this.queue.filter((q) => world.tick - q.ev.tick <= STALE_TICKS && q.waited <= STALE_SECONDS);
    this.counts.stale += this.queue.length - keep.length;
    this.queue = keep;
    this.dropFillerIfGone(world);
  }

  private dropFillerIfGone(world: World): void {
    const f = this.filler;
    if (f && (world.tick - f.ev.tick > FILLER_STALE_TICKS || !livingPerson(world, f.subjectId))) this.filler = null;
  }

  /** no long backlog: past MAX_WAITING the lightest event, the oldest among equals, is dropped */
  private trim(): void {
    while (this.queue.length > MAX_WAITING) {
      let victim = 0;
      for (let i = 1; i < this.queue.length; i++) {
        const a = this.queue[i];
        const b = this.queue[victim];
        if (a.weight < b.weight || (a.weight === b.weight && a.ev.id < b.ev.id)) victim = i;
      }
      this.queue.splice(victim, 1);
      this.counts.overflow++;
    }
  }

  /** the heaviest waiting event whose weight, faded, is at least `least`; the oldest among equals */
  private bestWaiting(least: number): Waiting | null {
    let best: Waiting | null = null;
    let bw = 0;
    for (const q of this.queue) {
      const w = this.effective(q);
      if (w < least) continue;
      if (!best || w > bw || (w === bw && q.ev.id < best.ev.id)) {
        best = q;
        bw = w;
      }
    }
    return best;
  }

  // ───────── what is live ─────────

  /**
   * A live shot ends when its condition ends: the thing is no longer among the live candidates (the camera stays with the person and
   * the caption goes). If it comes back (the wolf stalks again) it is live again. While it lasts its caption and score are read again.
   */
  private refreshLive(): void {
    const s = this.shot;
    if (!s || s.kind !== 'live') return;
    const c = this.live.find((x) => x.key === s.liveKey);
    if (!c) {
      s.ended = true;
      return;
    }
    s.ended = false;
    s.text = c.caption();
    s.weight = c.score;
  }

  /** the best live candidate not on cooldown, other than `except` */
  private bestLive(except: string | null): LiveCandidate | null {
    for (const c of this.live) {
      if (c.key === except) continue;
      const at = this.pickedAt.get(c.key);
      if (at !== undefined && this.clock - at < LIVE_COOLDOWN && c.score < LIVE_EXEMPT) continue;
      return c;
    }
    return null;
  }

  // ───────── choosing ─────────

  private choose(world: World): void {
    let s = this.shot;
    // the person has gone (died, or is no longer in the world): a TOP or MIDDLE event's shot becomes one of the place and the director
    // carries on; a live or filler shot is only ever about a person, so it simply ends
    if (s && s.subjectId && !livingPerson(world, s.subjectId)) {
      if (s.kind === 'live' || s.filler) s = this.shot = null;
      else {
        s.subjectId = 0;
        s.rev = ++this.rev;
      }
    }
    const hold = !s || s.age >= MIN_HOLD;
    // a live shot whose thing has ended is free to go for a MIDDLE or TOP event at once; for anything else the hold still applies
    const free = hold || !!s?.ended;
    const best = this.bestWaiting(MIDDLE_FROM);
    if (best) {
      // only a TOP event cuts in early, and only over a shot from a lower band; a MIDDLE one waits for the hold
      if (free || (best.weight >= TOP_FROM && !!s && bandOf(s.weight) !== 'top' && s.age >= MIN_CUT)) this.startEvent(world, best);
      return;
    }
    if (hold) this.pick(world, false, s?.ended ? s.liveKey : null);
  }

  /**
   * The hold is up and no TOP or MIDDLE event waits (or, with `any`, the viewer asked for the next one): the best live candidate,
   * else the best of the repeated events that faded and the FILLER candidate, else the shot stays. A live shot whose thing goes on
   * stays unless a candidate scores higher. Until LINGER_SECONDS a shot also stays unless the replacement is strictly heavier than it.
   */
  private pick(world: World, any: boolean, gone: string | null): void {
    if (any) {
      const w = this.bestWaiting(0);
      if (w) {
        this.startEvent(world, w);
        return;
      }
    }
    const s = this.shot;
    const cur = s?.kind === 'live' ? this.live.find((c) => c.key === s.liveKey) : undefined;
    // past the hold a shot lingers: before LINGER_SECONDS only something heavier than it replaces it
    const lingering = !any && !!s && s.age < LINGER_SECONDS;
    const beats = (w: number) => !lingering || w > s!.weight;
    const live = this.bestLive(cur?.key ?? gone);
    if (live && beats(live.score) && (!cur || live.score > cur.score)) {
      this.startLive(world, live);
      return;
    }
    if (cur) return;
    // events: the faded ones still waiting, and the filler candidate, by weight
    this.dropFillerIfGone(world);
    const faded = this.bestWaiting(0);
    const f = this.filler;
    if (faded && beats(this.effective(faded)) && (!f || this.effective(faded) >= this.effective(f))) this.startEvent(world, faded);
    else if (f && beats(this.effective(f))) this.startFiller(world, f);
  }

  private show(shot: Omit<Shot, 'age' | 'rev'>): void {
    this.shot = { ...shot, age: 0, rev: ++this.rev };
    this.counts.shown++;
  }

  private startEvent(world: World, w: Waiting): void {
    this.queue.splice(this.queue.indexOf(w), 1);
    this.shown.push({ rule: w.rule, tick: world.tick });
    this.show({ kind: 'event', ev: w.ev, liveKey: null, text: w.ev.text, tick: w.ev.tick, subjectId: subjectOf(world, w.ev), x: w.ev.x, y: w.ev.y, weight: w.weight, filler: false, ended: false });
  }

  private startFiller(world: World, f: Entry): void {
    this.filler = null;
    this.shown.push({ rule: f.rule, tick: world.tick });
    this.show({ kind: 'event', ev: f.ev, liveKey: null, text: f.ev.text, tick: f.ev.tick, subjectId: f.subjectId, x: f.ev.x, y: f.ev.y, weight: f.weight, filler: true, ended: false });
    this.counts.filler++;
  }

  private startLive(world: World, c: LiveCandidate): void {
    this.pickedAt.set(c.key, this.clock);
    this.show({ kind: 'live', ev: null, liveKey: c.key, text: c.caption(), tick: world.tick, subjectId: c.subjectId, x: c.x, y: c.y, weight: c.score, filler: false, ended: false });
    this.counts.live++;
  }
}
