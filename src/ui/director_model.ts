// The story director's model: how much a real event is worth a shot, the short queue of what is waiting, and the one current shot.
// No DOM and no Game here, so all of it can be tested; director.ts draws it and drives the view (selection, follow, camera fly).
//
// Presentation only. Everything is read from records the simulation already keeps: world.events for the shots, and world.chronicle
// as well for the "What happened" reel. Nothing is written to the world, the world's random state is never drawn from, and
// nothing here is saved. The words are the event's own; the director adds no explanation of its own. In a quiet stretch an
// ordinary event the record would not keep can be the shot (the ambient tier), so there is someone to follow.
import { DAY } from '../sim/constants';
import { chronicleWorthy } from '../sim/events';
import type { EventKind, World, WorldEvent } from '../sim/types';

// ───────────────────────────── how much an event weighs ─────────────────────────────

interface Rule {
  kind: EventKind;
  /** a piece of the event's text; none means every event of the kind */
  has?: string;
  weight: number;
}

/**
 * The first rule that fits wins. The wording is the simulation's own (grep addEvent under src/sim): a death is
 * "<name> died peacefully of old age, aged N." or "<name> died (<cause>), aged N.", a birth "<baby> was born to <mother>", a
 * pairing "<a> and <b> became a couple.", a wedding feast is called or over at the hall or the fire, a bite that kills is
 * "A wolf bit <name> fatally.". Deaths, births, pairings, fatal injuries and conflicts outrank a finished building.
 */
const RULES: Rule[] = [
  { kind: 'life', has: ' died ', weight: 100 },
  { kind: 'danger', has: 'fatally', weight: 95 },
  { kind: 'life', has: ' was born to ', weight: 90 }, // a lamb is "A lamb was born after ...", so it is not this
  { kind: 'life', has: ' became a couple', weight: 85 },
  { kind: 'social', has: 'wedding feast', weight: 75 },
  { kind: 'conflict', weight: 70 }, // an argument, a refusal, a broken promise, a theft
  { kind: 'social', has: 'funeral', weight: 65 },
  { kind: 'danger', has: ' got a ', weight: 60 }, // an injury that is not fatal
  { kind: 'life', has: ' arrive', weight: 55 }, // a traveller, a couple or a family arrives at the settlement
  { kind: 'build', has: ' finished ', weight: 50 }, // a finished or rebuilt building
];

/** a worthy event no rule names: what its kind weighs. Routine nature notes (winter, dry spells, a hut decaying) are the lightest. */
const BY_KIND: Partial<Record<EventKind, number>> = { life: 45, social: 40, work: 40, build: 35, trade: 30, nature: 20 };

/**
 * How worth a shot an event is. 0 means not at all: anything the settlement's own record (chronicleWorthy) would not keep weighs
 * nothing. Higher weighs more.
 */
export function storyWeight(ev: WorldEvent): number {
  if (!chronicleWorthy(ev.kind, ev.text)) return 0;
  for (const r of RULES) if (r.kind === ev.kind && (r.has === undefined || ev.text.includes(r.has))) return r.weight;
  return BY_KIND[ev.kind] ?? 10;
}

/**
 * The ambient tier: ordinary feed events the settlement's record would not keep (a gift, a promise, a tool made), which can give the
 * director someone to follow in a quiet stretch. Every weight stays below the lightest worthy one (nature, 20), so any worthy event
 * outranks any ambient one. Workshop output is routine and weighs nothing, as in the feed. Life, conflict and nature events are all
 * kept by chronicleWorthy, so they never reach this table; their entries are here only so the kinds are listed.
 */
const AMBIENT_BY_KIND: Partial<Record<EventKind, number>> = { danger: 15, conflict: 14, social: 12, life: 12, build: 10, trade: 10, survival: 8, farm: 6 };

/** 0 for a worthy event (it has its storyWeight) and for workshop output; else what its kind weighs as ambient */
export function ambientWeight(ev: WorldEvent): number {
  if (storyWeight(ev) > 0) return 0;
  return AMBIENT_BY_KIND[ev.kind] ?? 0;
}

/** the first of the event's people who is alive now, or 0 (a shot of the place) */
export function subjectOf(world: World, ev: WorldEvent): number {
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

/** an event with no position (winter setting in) has no place to fly to */
export const hasPlace = (ev: Pick<WorldEvent, 'x' | 'y'>): boolean => ev.x !== 0 || ev.y !== 0;

// ───────────────────────────── the reel ─────────────────────────────

/** the reel looks back this many days, and lists at most this many events */
export const REEL_DAYS = 3;
export const REEL_MAX = 8;

/**
 * The heaviest worthy events at or after `sinceTick`, at most `max`, in the order they happened. Read from the chronicle when the
 * world keeps one (older worlds have none) and from the feed's events as well; an event in both is listed once. Heavier first when
 * choosing, newer first among equals.
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
      if (weight > 0) pool.push({ ev, weight });
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

/** at most this many events wait for a shot; past it the lightest (the oldest among equals) is dropped */
export const MAX_WAITING = 6;
/** a shot stays up at least this long (UI seconds, whatever the simulation's speed, and while it is paused) before another may replace it */
export const MIN_HOLD = 6;
/** a strictly heavier event may cut in once the shot has been up this long */
export const MIN_CUT = 3;
/** with nothing waiting the shot stays, and its caption fades after this long */
export const CAPTION_SECONDS = 12;
/** a waiting event that has waited this long (UI seconds) is dropped as stale */
export const STALE_SECONDS = 30;
/** a waiting event older than this many world ticks (one day) is dropped as stale */
export const STALE_TICKS = DAY;
/** the ambient candidate is dropped once it is older than this many world ticks (a quarter of a day) */
export const AMBIENT_STALE_TICKS = DAY / 4;
/** an ambient event becomes the shot only when no shot is up, or the shot has been up at least this long (UI seconds) with nothing worthy waiting */
export const IDLE_SECONDS = 20;

export interface Shot {
  ev: WorldEvent;
  /** the living person the event is about, or 0: the shot is then of the place */
  subjectId: number;
  /** where the event happened (world tiles) */
  x: number;
  y: number;
  /** UI seconds this shot has been up */
  age: number;
  /** changes whenever a shot starts or loses its subject, so the view knows when to move the camera */
  rev: number;
  /** an ordinary event the settlement's record would not keep, shown because nothing worthy was there; always about a living person */
  ambient: boolean;
}

export interface Waiting {
  ev: WorldEvent;
  weight: number;
  /** UI seconds waited */
  waited: number;
}

/** the one ambient event kept: the newest (the heaviest of those that arrived together) about a living person */
interface Ambient {
  ev: WorldEvent;
  weight: number;
  subjectId: number;
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
  private queue: Waiting[] = [];
  private ambient: Ambient | null = null;
  shot: Shot | null = null;
  /**
   * in the world watched now (for the checks): shots shown (ambient ones too), worthy events dropped as stale, worthy events dropped
   * because the queue was full, and how many of the shots shown were ambient
   */
  readonly counts = { shown: 0, stale: 0, overflow: 0, ambient: 0 };

  /** Forget everything: the next step primes on whatever world it is given. */
  reset(): void {
    this.world = null;
    this.lastId = 0;
    this.queue = [];
    this.ambient = null;
    this.shot = null;
    this.counts.shown = 0;
    this.counts.stale = 0;
    this.counts.overflow = 0;
    this.counts.ambient = 0;
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
    if (this.shot) this.shot.age += secs;
    for (const q of this.queue) q.waited += secs;
    this.ingest(world);
    this.expire(world);
    this.trim();
    this.choose(world);
  }

  /**
   * The viewer asked for the next one: the current shot goes and the best waiting worthy event takes its place; with none waiting,
   * the ambient candidate, if there is one; with neither there is no shot.
   */
  skip(): void {
    const world = this.world;
    if (!world) return;
    this.shot = null;
    const best = this.best();
    if (best) {
      this.start(world, best);
      return;
    }
    this.dropAmbientIfGone(world);
    if (this.ambient) this.startAmbient(this.ambient);
  }

  /** what waits for a shot, in order of arrival */
  waiting(): readonly Waiting[] {
    return this.queue;
  }

  /** whether Next has anything to go to: a worthy event waiting, or the ambient candidate */
  hasNext(): boolean {
    return this.queue.length > 0 || this.ambient !== null;
  }

  /** false once the shot's caption has been up long enough (CAPTION_SECONDS) to fade, or when there is no shot */
  captionFresh(): boolean {
    return this.shot !== null && this.shot.age < CAPTION_SECONDS;
  }

  private ingest(world: World): void {
    const events = world.events;
    let from = events.length;
    while (from > 0 && events[from - 1].id > this.lastId) from--;
    let candidate: Ambient | null = null;
    for (let i = from; i < events.length; i++) {
      const ev = events[i];
      const weight = storyWeight(ev);
      if (weight > 0) {
        this.queue.push({ ev, weight, waited: 0 });
        continue;
      }
      // not for the record: a candidate for a quiet stretch, if it is about a living person. Of those arriving together, the heaviest, then the newest.
      const aw = ambientWeight(ev);
      if (aw <= 0) continue;
      const subjectId = subjectOf(world, ev);
      if (subjectId === 0) continue;
      if (!candidate || aw >= candidate.weight) candidate = { ev, weight: aw, subjectId };
    }
    // anything that arrives is newer than the candidate kept, so it replaces it
    if (candidate) this.ambient = candidate;
    if (events.length) this.lastId = Math.max(this.lastId, events[events.length - 1].id);
  }

  /** a waiting event goes stale after a simulated day or STALE_SECONDS of waiting; the ambient candidate after AMBIENT_STALE_TICKS */
  private expire(world: World): void {
    const keep = this.queue.filter((q) => world.tick - q.ev.tick <= STALE_TICKS && q.waited <= STALE_SECONDS);
    this.counts.stale += this.queue.length - keep.length;
    this.queue = keep;
    this.dropAmbientIfGone(world);
  }

  /** the ambient candidate goes when it is too old or the person it is about is no longer a living person (not counted as stale: it is not queued) */
  private dropAmbientIfGone(world: World): void {
    const a = this.ambient;
    if (a && (world.tick - a.ev.tick > AMBIENT_STALE_TICKS || !livingPerson(world, a.subjectId))) this.ambient = null;
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

  private best(): Waiting | null {
    let best: Waiting | null = null;
    for (const q of this.queue) if (!best || q.weight > best.weight || (q.weight === best.weight && q.ev.id < best.ev.id)) best = q;
    return best;
  }

  private choose(world: World): void {
    let s = this.shot;
    // the person has gone (died, or is no longer in the world): a worthy shot becomes one of the place and the director carries on;
    // an ambient shot is only ever about a person, so it simply ends
    if (s && s.subjectId && !livingPerson(world, s.subjectId)) {
      if (s.ambient) s = this.shot = null;
      else {
        s.subjectId = 0;
        s.rev = ++this.rev;
      }
    }
    const best = this.best();
    if (best) {
      // an ambient shot counts for nothing against a worthy event, so one cuts in after MIN_CUT and never waits the whole of MIN_HOLD
      if (!s || s.age >= MIN_HOLD || (s.age >= MIN_CUT && best.weight > shotWeight(s))) this.start(world, best);
      return;
    }
    // nothing worthy waits: a quiet stretch. The ambient candidate takes a bare screen at once, or a shot that has been up IDLE_SECONDS
    if (this.ambient && (!s || s.age >= IDLE_SECONDS)) this.startAmbient(this.ambient);
  }

  private start(world: World, w: Waiting): void {
    this.queue.splice(this.queue.indexOf(w), 1);
    this.shot = { ev: w.ev, subjectId: subjectOf(world, w.ev), x: w.ev.x, y: w.ev.y, age: 0, rev: ++this.rev, ambient: false };
    this.counts.shown++;
  }

  private startAmbient(a: Ambient): void {
    this.ambient = null;
    this.shot = { ev: a.ev, subjectId: a.subjectId, x: a.ev.x, y: a.ev.y, age: 0, rev: ++this.rev, ambient: true };
    this.counts.shown++;
    this.counts.ambient++;
  }
}

/** what a shot weighs against a waiting event: an ambient shot weighs nothing */
const shotWeight = (s: Shot): number => (s.ambient ? 0 : storyWeight(s.ev));
