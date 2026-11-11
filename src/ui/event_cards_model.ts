// The event cards' model: which real happenings get a card, what each card says, the queue that keeps at most two open at once,
// and where a card sits on the screen. No DOM here, so all of it can be tested; event_cards.ts draws it.
//
// Presentation only. Everything is read from records the simulation already keeps:
//   - an occasion (occasions.ts) at the moment its status turns from 'called' to 'gathering', i.e. when it has really begun. A
//     wedding, a birth feast, a funeral, the harvest feast and the market each have a place (the hall or the fire) and an end.
//     A yearly tradition (traditions.ts) is held as one of those kinds; its own name is used, so a remembrance is not called a
//     funeral and the midwinter fire is not called a birth feast.
//   - a shared building (no owning household) of a communal kind, when it first appears in the world's building list.
// Nothing is written to the world. A birthday party and a fire emergency have no record in the simulation, so they have no card.
import { buildingLabel } from '../sim/buildings';
import { FACILITY_TYPES } from '../sim/recipes';
import { DAY } from '../sim/constants';
import type { Building, BuildingType, Occasion, World } from '../sim/types';

/** the look a card takes; each has its own icon, colours and (or no) burst */
export type CardLook = 'wedding' | 'birth' | 'feast' | 'harvest' | 'market' | 'funeral' | 'civic';
export interface CardNotice {
  /** 'occ:<id>' or 'bld:<id>': one card per happening, ever, in a world */
  key: string;
  look: CardLook;
  title: string;
  /** up to two short lines; empty lines are left out */
  lines: string[];
  /** the whole thing in one sentence, for the button labels and screen readers */
  says: string;
  /** world tiles: where it is held or stands */
  x: number;
  y: number;
  /** an occasion has an end, and its card folds to a marker until then; a finished building is a moment */
  ongoing: boolean;
  /** for an occasion, its id, so the model can see when it is over */
  occasionId?: number;
}

const nameOf = (world: World, id: number): string => {
  const e = world.byId.get(id);
  if (e && e.ent === 'person') return e.name;
  return world.deceased.find((d) => d.id === id)?.name ?? '';
};
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const at = (o: Occasion): string => `At ${o.placeName}`;
const says = (title: string, lines: string[]): string => [title.replace(/!$/, ''), ...lines].join('. ') + '.';

/** The yearly tradition this occasion is a holding of, if it is one: the same kind, called that day, about the same person. */
function traditionOf(world: World, o: Occasion): { kind: string; name: string } | undefined {
  if (o.about.length > 1) return undefined;
  const day = Math.floor(o.called / DAY);
  const kindOf = (k: string): Occasion['kind'] => (k === 'remembrance' ? 'funeral' : k === 'harvest' ? 'harvest' : 'feast');
  return (world.traditions ?? []).find((t) => t.lastHeld === day && kindOf(t.kind) === o.kind && (t.about || 0) === (o.about[0] ?? 0));
}

/** What the card for an occasion that has begun says. Names come from the register (or the record of the dead); none are made up. */
export function occasionNotice(world: World, o: Occasion): CardNotice {
  const base = { key: `occ:${o.id}`, x: o.x, y: o.y, ongoing: true, occasionId: o.id };
  const names = o.about.map((id) => nameOf(world, id));
  const t = traditionOf(world, o);
  let look: CardLook;
  let title: string;
  let lines: string[];
  switch (o.kind) {
    case 'wedding':
      look = 'wedding';
      title = 'A wedding has begun!';
      lines = [names.filter(Boolean).join(' & '), at(o)];
      break;
    case 'feast':
      if (!t && o.about.length >= 2) {
        // noteBirth: [the baby, the mother]
        look = 'birth';
        title = 'A birth feast has begun!';
        lines = [names[0] ? `Welcoming ${names[0]}${names[1] ? `, born to ${names[1]}` : ''}` : '', at(o)];
      } else {
        look = 'feast';
        title = t ? `${cap(t.name)} has begun!` : 'A feast has begun!';
        lines = [t ? 'Held every year' : '', at(o)];
      }
      break;
    case 'harvest':
      look = 'harvest';
      title = 'The harvest feast has begun!';
      lines = [t ? 'Held every year' : '', at(o)];
      break;
    case 'market':
      look = 'market';
      title = 'The market is open';
      lines = [at(o)];
      break;
    case 'funeral':
      look = 'funeral';
      if (t) {
        title = 'A remembrance has begun';
        lines = [names[0] ? `Remembering ${names[0]}` : '', at(o)];
      } else {
        title = 'A funeral has begun';
        lines = [names[0] ? `For ${names[0]}` : '', at(o)];
      }
      break;
  }
  lines = lines.filter(Boolean);
  return { ...base, look, title, lines, says: says(title, lines) };
}

/** The kinds of building that count as the settlement's own when nobody's household owns them. A fire and a food rack are left out: they are small and common. */
const CIVIC: ReadonlySet<BuildingType> = new Set<BuildingType>([...FACILITY_TYPES.filter((t) => t !== 'food_rack'), 'hall', 'storehouse', 'well']);
export const isCivicBuilding = (b: Building): boolean => b.hhId === 0 && CIVIC.has(b.type);

export function buildingNotice(world: World, b: Building): CardNotice {
  const label = buildingLabel(b.type);
  const title = `A ${label} is finished!`.replace(/^A ([aeiou])/i, 'An $1');
  const who = (b.builtBy ?? []).map((id) => nameOf(world, id)).filter(Boolean);
  const by = who.length === 0 ? '' : who.length <= 2 ? `Built by ${who.join(' & ')}` : `Built by ${who[0]}, ${who[1]} & ${who.length - 2} more`;
  const lines = ['For everyone to use', by].filter(Boolean);
  return { key: `bld:${b.id}`, look: 'civic', title, lines, says: says(title, lines), x: b.x + b.w / 2, y: b.y + b.h / 2, ongoing: false };
}

// ───────────────────────────── the queue ─────────────────────────────

/** UI seconds a card stays open (whatever the simulation's speed, and while it is paused) */
export const SHOW_SECONDS = 6;
/** at most this many open cards at once */
export const MAX_OPEN = 2;
/** at most this many waiting; past it the oldest waiting gives up its card */
export const MAX_WAITING = 2;
/** a card that has waited this long is stale and gives up its card */
export const STALE_SECONDS = 8;

export type CardPhase = 'waiting' | 'open' | 'marker';
export interface CardEntry {
  notice: CardNotice;
  phase: CardPhase;
  /** UI seconds in the current phase */
  age: number;
  /** order of arrival, for a stable layout */
  seq: number;
}

/**
 * The cards for one watched world. `step` is called once a UI frame with real seconds. The first look at a world (a new game, a
 * load) learns what already exists without announcing it: an occasion already under way gets its marker only, and the
 * buildings already standing get nothing. A happening is announced once; pausing, inspecting or many frames never repeat it.
 */
export class EventCards {
  private world: World | null = null;
  private seenOcc = new Set<number>();
  private maxBuildingId = 0;
  private buildingSig = '';
  private seq = 0;
  readonly entries = new Map<string, CardEntry>();
  /** in the world watched now: how many cards were opened, and how many gave up their card in the queue (for the checks) */
  readonly counts = { announced: 0, skipped: 0 };

  /** Forget everything: a new world will be primed on the next step. */
  reset(): void {
    this.world = null;
    this.seenOcc.clear();
    this.maxBuildingId = 0;
    this.buildingSig = '';
    this.entries.clear();
    this.counts.announced = 0;
    this.counts.skipped = 0;
  }

  step(world: World, dt: number): void {
    if (world !== this.world) {
      this.reset();
      this.world = world;
      this.look(world, true);
    } else this.look(world, false);
    this.advance(dt);
  }

  /** The viewer closed an open card: an occasion folds to its marker, a building's card goes. */
  dismiss(key: string): void {
    const e = this.entries.get(key);
    if (!e || e.phase !== 'open') return;
    this.fold(e);
  }

  open(): CardEntry[] {
    return [...this.entries.values()].filter((e) => e.phase === 'open').sort((a, b) => a.seq - b.seq);
  }
  markers(): CardEntry[] {
    return [...this.entries.values()].filter((e) => e.phase === 'marker').sort((a, b) => a.seq - b.seq);
  }
  waiting(): CardEntry[] {
    return [...this.entries.values()].filter((e) => e.phase === 'waiting').sort((a, b) => a.seq - b.seq);
  }

  private add(n: CardNotice, phase: CardPhase): void {
    this.entries.set(n.key, { notice: n, phase, age: 0, seq: this.seq++ });
  }

  private fold(e: CardEntry): void {
    if (e.notice.ongoing) {
      e.phase = 'marker';
      e.age = 0;
    } else this.entries.delete(e.notice.key);
  }

  private look(world: World, priming: boolean): void {
    const live = new Set<number>();
    for (const o of world.occasions ?? []) {
      if (o.status !== 'gathering') continue;
      live.add(o.id);
      if (this.seenOcc.has(o.id)) continue;
      this.seenOcc.add(o.id);
      this.add(occasionNotice(world, o), priming ? 'marker' : 'waiting');
    }
    // an occasion that is over (or gone from the list) takes its card or marker with it
    for (const e of [...this.entries.values()]) if (e.notice.occasionId !== undefined && !live.has(e.notice.occasionId)) this.entries.delete(e.notice.key);
    // new buildings: only when the list has changed since the last look
    const list = world.buildings;
    const sig = `${list.length}:${list.length ? list[list.length - 1].id : 0}`;
    if (sig === this.buildingSig) return;
    this.buildingSig = sig;
    let max = this.maxBuildingId;
    for (const b of list) {
      if (b.id <= this.maxBuildingId) continue;
      if (b.id > max) max = b.id;
      if (!priming && isCivicBuilding(b)) this.add(buildingNotice(world, b), 'waiting');
    }
    this.maxBuildingId = max;
  }

  private advance(dt: number): void {
    for (const e of this.entries.values()) e.age += dt;
    for (const e of this.open()) if (e.age >= SHOW_SECONDS) this.fold(e);
    // a stale card gives up (an occasion keeps its marker)
    for (const e of this.waiting()) if (e.age >= STALE_SECONDS) this.skip(e);
    // open the oldest waiting while there is room
    let room = MAX_OPEN - this.open().length;
    for (const e of this.waiting()) {
      if (room <= 0) break;
      e.phase = 'open';
      e.age = 0;
      this.counts.announced++;
      room--;
    }
    // no long backlog: past MAX_WAITING the oldest waiting give up their card
    const waiting = this.waiting();
    for (let i = 0; i < waiting.length - MAX_WAITING; i++) this.skip(waiting[i]);
  }

  private skip(e: CardEntry): void {
    this.counts.skipped++;
    this.fold(e);
  }
}

// ───────────────────────────── placement ─────────────────────────────

export interface Rect { x: number; y: number; w: number; h: number }
export interface Placed { x: number; y: number; /** pointer: 'down' when the card is above the venue, 'up' when below, null when the venue is off screen */ tail: 'down' | 'up' | null; tailX: number }

/** px between the venue and the near edge of the card, so the people gathering there stay in view */
export const VENUE_GAP = 30;
const EDGE = 8;

const overlap = (a: Rect, b: Rect): number => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Where each open card goes. A card prefers to sit above its venue with its pointer down to it; it may go below, or to either side
 * above, when that covers less of the interface's panels and the cards already placed. Everything is kept inside the view. A
 * venue off screen puts the card at the nearest edge with no pointer.
 */
export function placeCards(cards: { venue: { x: number; y: number }; w: number; h: number; /** px kept clear around the venue for the people there (default 18) */ keep?: number }[], view: { w: number; h: number }, blocked: Rect[]): Placed[] {
  const out: Placed[] = [];
  const taken: Rect[] = [];
  const clampX = (x: number, w: number) => Math.min(Math.max(x, EDGE), Math.max(EDGE, view.w - w - EDGE));
  const clampY = (y: number, h: number) => Math.min(Math.max(y, EDGE), Math.max(EDGE, view.h - h - EDGE));
  for (const c of cards) {
    const { venue: v, w, h } = c;
    const keep = Math.min(70, Math.max(18, c.keep ?? 18));
    // the ground the gathering stands on, flattened as the map is; the gap keeps the card's edge off it
    const venueBox = { x: v.x - keep, y: v.y - keep * 0.6, w: 2 * keep, h: keep * 1.2 };
    const gap = Math.max(VENUE_GAP, Math.round(keep * 0.6) + 8);
    const onScreen = v.x >= 0 && v.y >= 0 && v.x <= view.w && v.y <= view.h;
    const options: { r: Rect; tail: Placed['tail']; cost: number }[] = [];
    const push = (x: number, y: number, tail: Placed['tail'], cost: number) => options.push({ r: { x: clampX(x, w), y: clampY(y, h), w, h }, tail, cost });
    push(v.x - w / 2, v.y - gap - h, 'down', 0);
    push(v.x - w / 2, v.y + gap, 'up', 70);
    push(v.x - w + 24, v.y - gap - h, 'down', 20);
    push(v.x - 24, v.y - gap - h, 'down', 20);
    // stacked above another card at the same place, rather than over the ground below the venue
    for (const t of taken) push(v.x - w / 2, t.y - h - 8, 'down', 30);
    // stepped clear of a panel or a card in the way: beside it, or above or below it
    for (const b of [...blocked, ...taken]) {
      const py = v.y - gap - h;
      push(b.x - w - 8, py, 'down', 80);
      push(b.x + b.w + 8, py, 'down', 80);
      push(v.x - w / 2, b.y - h - 8, 'down', 80);
      push(v.x - w / 2, b.y + b.h + 8, 'up', 90);
    }
    let best = options[0];
    let bestScore = Infinity;
    for (const o of options) {
      let cover = 0;
      for (const b of blocked) cover += overlap(o.r, b);
      for (const t of taken) cover += 3 * overlap(o.r, t);
      // a card over its own venue would hide the gathering
      cover += onScreen ? 2 * overlap(o.r, venueBox) : 0;
      const moved = Math.abs(o.r.x - (v.x - w / 2)) + Math.abs(o.r.y - (v.y - gap - h));
      const score = cover * 10 + o.cost + moved * 0.2;
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    }
    // the pointer only when the venue is on screen, the card is on the side it says, and no other card stands between them
    let tail: Placed['tail'] = null;
    const between = (top: number, bottom: number) => taken.some((t) => v.x >= t.x && v.x <= t.x + t.w && t.y < bottom && t.y + t.h > top);
    const over = v.x >= best.r.x + 12 && v.x <= best.r.x + w - 12 && !between(Math.min(best.r.y + h, v.y), Math.max(best.r.y, v.y));
    taken.push(best.r);
    if (onScreen && over && best.tail === 'down' && best.r.y + h <= v.y) tail = 'down';
    if (onScreen && over && best.tail === 'up' && best.r.y >= v.y) tail = 'up';
    out.push({ x: Math.round(best.r.x), y: Math.round(best.r.y), tail, tailX: Math.round(Math.min(Math.max(v.x - best.r.x, 18), w - 18)) });
  }
  return out;
}

/** Where a venue marker sits: just above the venue, held inside the view. */
export function placeMarker(venue: { x: number; y: number }, view: { w: number; h: number }, size = 30): { x: number; y: number; pinned: boolean } {
  const x = Math.min(Math.max(venue.x - size / 2, EDGE), view.w - size - EDGE);
  const y = Math.min(Math.max(venue.y - size - 14, EDGE + 48), view.h - size - EDGE);
  const pinned = venue.x < 0 || venue.y < 0 || venue.x > view.w || venue.y > view.h;
  return { x: Math.round(x), y: Math.round(y), pinned };
}

/** The width a card is drawn at: about 240 px, narrower on a small screen. */
export const cardWidth = (viewW: number): number => Math.max(160, Math.min(244, viewW - 24));
